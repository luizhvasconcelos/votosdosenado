from __future__ import annotations

import csv
import io
import subprocess
import tempfile
import unicodedata
import zipfile
from collections import defaultdict
from difflib import SequenceMatcher
from pathlib import Path

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import ElectionResult, Senator

TSE_URL = (
    "https://cdn.tse.jus.br/estatistica/sead/odsele/"
    "votacao_candidato_munzona/votacao_candidato_munzona_{year}.zip"
)


def _normalized(value: str | None) -> str:
    text = unicodedata.normalize("NFKD", value or "")
    return " ".join("".join(c for c in text if not unicodedata.combining(c)).upper().split())


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
        with zipped.open(csv_files[0]) as first:
            header = next(csv.reader([first.readline().decode("latin-1")], delimiter=";"))

    required = (
        "DS_CARGO",
        "NR_TURNO",
        "SG_UF",
        "NM_URNA_CANDIDATO",
        "NM_CANDIDATO",
        "QT_VOTOS_NOMINAIS",
        "DS_SIT_TOT_TURNO",
    )
    indexes = {column: header.index(column) for column in required}
    unzip = subprocess.Popen(["unzip", "-p", str(archive), "*.csv"], stdout=subprocess.PIPE)
    grep = subprocess.Popen(
        ["grep", "-a", "-i", "SENADOR"], stdin=unzip.stdout, stdout=subprocess.PIPE
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


def ingest_tse_elections(session: Session, years: tuple[int, ...] = (2018, 2022)) -> dict[int, int]:
    senators = session.scalars(select(Senator)).all()
    imported: dict[int, int] = {}
    for year in years:
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
                senator = _match_senator(senators, candidate)
                if senator is None:
                    continue
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
                status = _normalized(str(candidate["status"]))
                row.eleito = "ELEITO" in status or "MEDIA" in status
                imported[year] += 1
        session.commit()
    return imported
