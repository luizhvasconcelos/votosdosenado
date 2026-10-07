from __future__ import annotations

import csv
import io
import os
import subprocess
import tempfile
import unicodedata
import zipfile
from collections import defaultdict
from datetime import date
from difflib import SequenceMatcher
from pathlib import Path

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import ElectionResult, Senator
from .spectrum import spectrum_for_party

TSE_URL = (
    "https://cdn.tse.jus.br/estatistica/sead/odsele/"
    "votacao_candidato_munzona/votacao_candidato_munzona_{year}.zip"
)
TSE_2026_RESULT_URL = (
    "https://resultados.tse.jus.br/oficial/ele2026/6259/dados/{uf}/{uf}-c0005-e006259-u.json"
)
TSE_PHOTO_URL = (
    "https://cdn.tse.jus.br/estatistica/sead/eleicoes/eleicoes{year}/fotos/"
    "foto_cand{year}_{uf}_div.zip"
)
UFS = (
    "AC",
    "AL",
    "AP",
    "AM",
    "BA",
    "CE",
    "DF",
    "ES",
    "GO",
    "MA",
    "MT",
    "MS",
    "MG",
    "PA",
    "PB",
    "PR",
    "PE",
    "PI",
    "RJ",
    "RN",
    "RS",
    "RO",
    "RR",
    "SC",
    "SP",
    "SE",
    "TO",
)


def _normalized(value: str | None) -> str:
    text = unicodedata.normalize("NFKD", value or "")
    return " ".join("".join(c for c in text if not unicodedata.combining(c)).upper().split())


def _is_elected_status(value: str | None) -> bool:
    return _normalized(value).startswith("ELEITO")


def _download(year: int, target: Path) -> None:
    with httpx.stream(
        "GET", TSE_URL.format(year=year), timeout=300, follow_redirects=True
    ) as response:
        response.raise_for_status()
        with target.open("wb") as output:
            for chunk in response.iter_bytes(1024 * 1024):
                output.write(chunk)


def _aggregate(archive: Path) -> dict[tuple[str, str], dict[str, object]]:
    candidates: dict[tuple[str, str], dict[str, object]] = {}
    with zipfile.ZipFile(archive) as zipped:
        csv_files = [name for name in zipped.namelist() if name.lower().endswith(".csv")]
        if not csv_files:
            return candidates
        state_files = [
            name for name in csv_files if Path(name).stem.rsplit("_", 1)[-1].upper() in UFS
        ] or csv_files
        with zipped.open(state_files[0]) as first:
            header = next(csv.reader([first.readline().decode("latin-1")], delimiter=";"))

    required = (
        "DS_CARGO",
        "NR_TURNO",
        "SG_UF",
        "NM_URNA_CANDIDATO",
        "NM_CANDIDATO",
        "QT_VOTOS_NOMINAIS",
        "DS_SIT_TOT_TURNO",
        "SQ_CANDIDATO",
        "SG_PARTIDO",
    )
    indexes = {column: header.index(column) for column in required}
    unzip = subprocess.Popen(["unzip", "-p", str(archive), *state_files], stdout=subprocess.PIPE)
    grep = subprocess.Popen(
        ["grep", "-a", "-i", "SENADOR"],
        stdin=unzip.stdout,
        stdout=subprocess.PIPE,
        env={**os.environ, "LC_ALL": "C"},
    )
    assert grep.stdout is not None
    with io.TextIOWrapper(grep.stdout, encoding="latin-1", newline="") as filtered:
        for values in csv.reader(filtered, delimiter=";"):
            if len(values) <= max(indexes.values()):
                continue
            if _normalized(values[indexes["DS_CARGO"]]) != "SENADOR":
                continue
            if (values[indexes["NR_TURNO"]] or "1") != "1":
                continue
            uf = values[indexes["SG_UF"]]
            ballot_name = values[indexes["NM_URNA_CANDIDATO"]] or values[indexes["NM_CANDIDATO"]]
            key = (uf, _normalized(ballot_name))
            item = candidates.setdefault(
                key,
                {
                    "uf": uf,
                    "name": ballot_name,
                    "civil_name": values[indexes["NM_CANDIDATO"]] or ballot_name,
                    "votes": 0,
                    "status": values[indexes["DS_SIT_TOT_TURNO"]],
                    "candidate_id": values[indexes["SQ_CANDIDATO"]],
                    "party": values[indexes["SG_PARTIDO"]],
                },
            )
            item["votes"] = int(item["votes"]) + int(values[indexes["QT_VOTOS_NOMINAIS"]] or 0)
    grep.wait()
    unzip.wait()
    return candidates


def _match_senator(senators: list[Senator], candidate: dict[str, object]) -> Senator | None:
    uf = str(candidate["uf"])
    names = [_normalized(str(candidate["name"])), _normalized(str(candidate["civil_name"]))]
    possible = [senator for senator in senators if senator.uf == uf]
    for senator in possible:
        senator_names = {_normalized(senator.nome_parlamentar), _normalized(senator.nome_civil)}
        if senator_names.intersection(names):
            return senator
    scored = [
        (
            max(
                SequenceMatcher(None, name, _normalized(senator.nome_parlamentar)).ratio()
                for name in names
            ),
            senator,
        )
        for senator in possible
    ]
    best_score, best = max(scored, default=(0.0, None), key=lambda item: item[0])
    return best if best_score >= 0.82 else None


def _upsert_election_result(
    session: Session,
    senators: list[Senator],
    candidate: dict[str, object],
    year: int,
    position: int,
    valid_votes: int,
) -> bool:
    elected = _is_elected_status(str(candidate["status"]))
    senator = _match_senator(senators, candidate)
    candidate_id = str(candidate.get("candidate_id") or _normalized(str(candidate["name"])))
    if senator is None and elected:
        senator = session.scalar(
            select(Senator).where(Senator.codigo_senado == f"TSE-{year}-{candidate_id}")
        )
        if senator is None:
            party = str(candidate.get("party") or "SEM PARTIDO")
            senator = Senator(
                codigo_senado=f"TSE-{year}-{candidate_id}",
                nome_parlamentar=str(candidate["name"]),
                nome_civil=str(candidate.get("civil_name") or candidate["name"]),
                uf=str(candidate["uf"]),
                partido_sigla=party,
                bloco=None,
                foto_url=f"/candidatos/{year}/{candidate_id}.jpg",
                email=None,
                telefone=None,
                espectro_partido=spectrum_for_party(party),
                espectro_comportamento=None,
                ativo=False,
                mandato_inicio=date(year + 1, 2, 1),
                mandato_fim=date(year + 9, 2, 1),
                mandato_tipo="eleito",
            )
            session.add(senator)
            session.flush()
            senators.append(senator)
    if senator is None:
        return False
    if elected and not senator.foto_url:
        senator.foto_url = f"/candidatos/{year}/{candidate_id}.jpg"
    row = session.scalar(
        select(ElectionResult).where(
            ElectionResult.senador_id == senator.id,
            ElectionResult.ano == year,
            ElectionResult.uf == candidate["uf"],
        )
    )
    if row is None:
        row = ElectionResult(
            senador=senator, ano=year, uf=str(candidate["uf"]), votos=0, eleito=False
        )
        session.add(row)
    votes = int(candidate["votes"])
    row.votos = votes
    row.pct_validos = round(votes * 100 / valid_votes, 4) if valid_votes else None
    row.posicao = position
    row.eleito = elected
    return True


def _live_2026_candidates(payload: dict[str, object], uf: str) -> list[dict[str, object]]:
    result: list[dict[str, object]] = []
    cargos = payload.get("carg", [])
    if not isinstance(cargos, list):
        return result
    for cargo in cargos:
        if not isinstance(cargo, dict) or str(cargo.get("cd")) != "5":
            continue
        for group in cargo.get("agr", []):
            for party in group.get("par", []):
                for candidate in party.get("cand", []):
                    result.append(
                        {
                            "uf": uf,
                            "name": candidate.get("nmu") or candidate.get("nm") or "Sem nome",
                            "civil_name": candidate.get("nm") or candidate.get("nmu") or "Sem nome",
                            "votes": int(candidate.get("vap") or 0),
                            "status": candidate.get("st") or "Não eleito",
                            "candidate_id": str(candidate.get("sqcand") or ""),
                            "party": party.get("sg") or "SEM PARTIDO",
                        }
                    )
    return result


def ingest_tse_2026_results(
    session: Session, payloads: dict[str, dict[str, object]] | None = None
) -> int:
    senators = session.scalars(select(Senator)).all()
    imported = 0
    with httpx.Client(timeout=60, follow_redirects=True) as client:
        for uf in UFS:
            payload = (
                payloads.get(uf)
                if payloads
                else client.get(TSE_2026_RESULT_URL.format(uf=uf.lower())).raise_for_status().json()
            )
            candidates = _live_2026_candidates(payload or {}, uf)
            valid_votes = sum(int(item["votes"]) for item in candidates)
            ranked = sorted(candidates, key=lambda item: int(item["votes"]), reverse=True)
            for position, candidate in enumerate(ranked, 1):
                if _upsert_election_result(
                    session, senators, candidate, 2026, position, valid_votes
                ):
                    imported += 1
    session.commit()
    return imported


def sync_tse_elected_photos(session: Session, year: int, output_dir: Path) -> int:
    elected = session.scalars(
        select(Senator)
        .join(ElectionResult)
        .where(ElectionResult.ano == year, ElectionResult.eleito.is_(True))
    ).all()
    by_uf: dict[str, list[Senator]] = defaultdict(list)
    for senator in elected:
        if senator.foto_url and senator.foto_url.startswith(f"/candidatos/{year}/"):
            by_uf[senator.uf].append(senator)
    output_dir.mkdir(parents=True, exist_ok=True)
    count = 0
    with httpx.Client(timeout=120, follow_redirects=True) as client:
        for uf, senators in by_uf.items():
            response = client.get(TSE_PHOTO_URL.format(year=year, uf=uf))
            response.raise_for_status()
            with zipfile.ZipFile(io.BytesIO(response.content)) as archive:
                names = {Path(name).stem.upper(): name for name in archive.namelist()}
                for senator in senators:
                    candidate_id = Path(senator.foto_url or "").stem
                    expected = f"F{uf}{candidate_id}_DIV"
                    source = names.get(expected)
                    if source:
                        (output_dir / f"{candidate_id}.jpg").write_bytes(archive.read(source))
                        count += 1
    return count


def ingest_tse_elections(session: Session, years: tuple[int, ...] = (2018, 2022)) -> dict[int, int]:
    senators = session.scalars(select(Senator)).all()
    imported: dict[int, int] = {}
    for year in years:
        if year == 2026:
            imported[year] = ingest_tse_2026_results(session)
            senators = session.scalars(select(Senator)).all()
            continue
        with tempfile.TemporaryDirectory(prefix=f"votosdosenado-tse-{year}-") as temp_dir:
            archive = Path(temp_dir) / f"tse-{year}.zip"
            _download(year, archive)
            candidates = _aggregate(archive)
        by_uf: dict[str, list[dict[str, object]]] = defaultdict(list)
        for candidate in candidates.values():
            by_uf[str(candidate["uf"])].append(candidate)
        imported[year] = 0
        for uf_candidates in by_uf.values():
            ranked = sorted(uf_candidates, key=lambda item: int(item["votes"]), reverse=True)
            valid_votes = sum(int(item["votes"]) for item in ranked)
            for position, candidate in enumerate(ranked, 1):
                if _upsert_election_result(
                    session, senators, candidate, year, position, valid_votes
                ):
                    imported[year] += 1
        session.commit()
    return imported
