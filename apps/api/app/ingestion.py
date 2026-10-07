from __future__ import annotations

from datetime import UTC, date, datetime
from typing import Any

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import get_settings
from .models import Affiliation, Mandate, Matter, Party, Senator, Vote, Voting
from .spectrum import spectrum_for_party
from .vote_mapping import canonical_vote


def _date(value: str | None) -> date | None:
    if not value:
        return None
    return date.fromisoformat(value[:10])


def _https(value: str | None) -> str | None:
    return value.replace("http://", "https://", 1) if value else None


def fetch_json(url: str) -> Any:
    with httpx.Client(
        timeout=90, follow_redirects=True, headers={"Accept": "application/json"}
    ) as client:
        response = client.get(url)
        response.raise_for_status()
        return response.json()


def ingest_senators(session: Session, payload: dict[str, Any] | None = None) -> int:
    data = payload or fetch_json(get_settings().senado_senators_url)
    records = data["ListaParlamentarEmExercicio"]["Parlamentares"]["Parlamentar"]
    seen: set[str] = set()
    count = 0
    for record in records:
        identity = record.get("IdentificacaoParlamentar", {})
        mandate = record.get("Mandato", {})
        code = str(identity["CodigoParlamentar"])
        seen.add(code)
        senator = session.scalar(select(Senator).where(Senator.codigo_senado == code))
        if senator is None:
            senator = Senator(codigo_senado=code, nome_parlamentar="", uf="", partido_sigla="")
            session.add(senator)
        party = identity.get("SiglaPartidoParlamentar") or "SEM PARTIDO"
        phones = identity.get("Telefones", {}).get("Telefone", [])
        if isinstance(phones, dict):
            phones = [phones]
        block = identity.get("Bloco") or {}
        senator.nome_parlamentar = identity.get("NomeParlamentar") or "Sem nome"
        senator.nome_civil = identity.get("NomeCompletoParlamentar")
        senator.uf = identity.get("UfParlamentar") or mandate.get("UfParlamentar") or "--"
        senator.partido_sigla = party
        senator.bloco = block.get("NomeApelido") or block.get("NomeBloco")
        senator.foto_url = _https(identity.get("UrlFotoParlamentar"))
        senator.email = identity.get("EmailParlamentar")
        senator.telefone = phones[0].get("NumeroTelefone") if phones else None
        senator.espectro_partido = spectrum_for_party(party)
        exercises = mandate.get("Exercicios", {}).get("Exercicio", [])
        if isinstance(exercises, dict):
            exercises = [exercises]
        # The API can keep a replacement through the same day on which the
        # returning senator starts. Only an open exercise owns a current seat.
        senator.ativo = not exercises or any(not item.get("DataFim") for item in exercises)
        first = mandate.get("PrimeiraLegislaturaDoMandato", {})
        second = mandate.get("SegundaLegislaturaDoMandato", {})
        senator.mandato_inicio = _date(first.get("DataInicio"))
        senator.mandato_fim = _date(second.get("DataFim") or first.get("DataFim"))
        participation = (mandate.get("DescricaoParticipacao") or "Titular").lower()
        senator.mandato_tipo = "suplente" if "suplente" in participation else "titular"
        session.flush()
        mandate_code = str(mandate.get("CodigoMandato") or f"atual-{code}")
        mandate_row = session.scalar(
            select(Mandate).where(
                Mandate.senador_id == senator.id, Mandate.codigo_senado == mandate_code
            )
        )
        if mandate_row is None and first.get("DataInicio"):
            mandate_row = Mandate(
                senador=senator,
                codigo_senado=mandate_code,
                legislatura="/".join(
                    str(item.get("NumeroLegislatura"))
                    for item in (first, second)
                    if item.get("NumeroLegislatura")
                ),
                inicio=_date(first.get("DataInicio")),
                fim=_date(second.get("DataFim") or first.get("DataFim")),
                tipo=senator.mandato_tipo,
                participacao=mandate.get("DescricaoParticipacao"),
            )
            session.add(mandate_row)
        party_row = session.get(Party, party)
        if party_row is None:
            session.add(Party(sigla=party, nome=party, espectro_default=spectrum_for_party(party)))
        count += 1

    for senator in session.scalars(select(Senator).where(Senator.ativo.is_(True))):
        if senator.codigo_senado not in seen:
            senator.ativo = False
    session.commit()
    return count


def ingest_affiliations(session: Session) -> int:
    senators = session.scalars(select(Senator).where(Senator.ativo.is_(True))).all()
    count = 0
    for senator in senators:
        payload = fetch_json(
            f"https://legis.senado.leg.br/dadosabertos/senador/{senator.codigo_senado}/filiacoes"
        )
        affiliations = (
            payload.get("FiliacaoParlamentar", {})
            .get("Parlamentar", {})
            .get("Filiacoes", {})
            .get("Filiacao", [])
        )
        if isinstance(affiliations, dict):
            affiliations = [affiliations]
        for item in affiliations:
            party = item.get("Partido", {}).get("SiglaPartido")
            start = _date(item.get("DataFiliacao"))
            if not party or not start:
                continue
            row = session.scalar(
                select(Affiliation).where(
                    Affiliation.senador_id == senator.id,
                    Affiliation.partido_sigla == party,
                    Affiliation.inicio == start,
                )
            )
            if row is None:
                row = Affiliation(
                    senador=senator,
                    partido_sigla=party,
                    inicio=start,
                    fim=_date(item.get("DataDesfiliacao")),
                )
                session.add(row)
            else:
                row.fim = _date(item.get("DataDesfiliacao"))
            count += 1
        session.commit()
    return count


def _matter_for(session: Session, record: dict[str, Any]) -> Matter | None:
    code = record.get("codigoMateria")
    if code is None:
        return None
    code_str = str(code)
    matter = session.scalar(select(Matter).where(Matter.codigo_senado == code_str))
    if matter is None:
        matter = Matter(
            codigo_senado=code_str,
            sigla_tipo=record.get("sigla") or "MAT",
            numero=str(record.get("numero") or ""),
            ano=int(record.get("ano") or 0),
            ementa=record.get("ementa") or "",
            url=f"https://www25.senado.leg.br/web/atividade/materias/-/materia/{code_str}",
        )
        session.add(matter)
        session.flush()
    elif record.get("ementa"):
        matter.ementa = record["ementa"]
    return matter


def ingest_votes(session: Session, payload: list[dict[str, Any]] | None = None) -> tuple[int, int]:
    if payload is None:
        settings = get_settings()
        records = []
        for year in range(settings.votes_start_year, datetime.now(UTC).year + 1):
            records.extend(
                fetch_json(
                    f"{settings.senado_votes_url}?dataInicio={year}-01-01&dataFim={year}-12-31"
                )
            )
    else:
        records = payload
    senators_by_code = {
        senator.codigo_senado: senator for senator in session.scalars(select(Senator)).all()
    }
    voting_count = 0
    vote_count = 0
    for record in records:
        code = str(record.get("codigoSessaoVotacao") or record.get("sequencialVotacao"))
        voting = session.scalar(select(Voting).where(Voting.codigo_senado == code))
        if voting is None:
            voting = Voting(
                codigo_senado=code,
                data_hora=datetime.fromisoformat(record["dataSessao"]),
                descricao=record.get("descricaoVotacao") or "Votação no Plenário",
            )
            session.add(voting)
        matter = _matter_for(session, record)
        voting.materia = matter
        voting.tipo = "secreta" if record.get("votacaoSecreta") == "S" else "nominal"
        voting.resultado = str(record.get("resultadoVotacao") or "")
        raw_votes = record.get("votos") or []
        categorized = [canonical_vote(item.get("siglaVotoParlamentar")) for item in raw_votes]
        voting.total_sim = record.get("totalVotosSim") or categorized.count("SIM")
        voting.total_nao = record.get("totalVotosNao") or categorized.count("NAO")
        voting.total_abst = record.get("totalVotosAbstencao") or categorized.count("ABST")
        session.flush()
        existing = {vote.senador_id: vote for vote in voting.votos}
        for item, category in zip(raw_votes, categorized, strict=True):
            senator_code = str(item.get("codigoParlamentar"))
            senator = senators_by_code.get(senator_code)
            if senator is None:
                party = item.get("siglaPartidoParlamentar") or "SEM PARTIDO"
                senator = Senator(
                    codigo_senado=senator_code,
                    nome_parlamentar=item.get("nomeParlamentar") or "Sem nome",
                    uf=item.get("siglaUFParlamentar") or "--",
                    partido_sigla=party,
                    espectro_partido=spectrum_for_party(party),
                    mandato_tipo="titular",
                    ativo=False,
                )
                session.add(senator)
                session.flush()
                senators_by_code[senator_code] = senator
            vote = existing.get(senator.id)
            if vote is None:
                vote = Vote(votacao=voting, senador=senator, sigla_original="", categoria="AUSENTE")
                session.add(vote)
            vote.sigla_original = item.get("siglaVotoParlamentar") or ""
            vote.categoria = category
            vote_count += 1
        voting_count += 1
        if voting_count % 100 == 0:
            session.commit()
    session.commit()
    return voting_count, vote_count
