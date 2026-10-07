from collections import Counter, defaultdict
from datetime import date

from sqlalchemy import delete, select
from sqlalchemy.orm import Session, selectinload

from .models import IndexSnapshot, Matter, Senator, Vote, Voting


def _majority(votes: list[str]) -> str | None:
    counts = Counter(vote for vote in votes if vote in {"SIM", "NAO"})
    if counts["SIM"] == counts["NAO"]:
        return None
    return "SIM" if counts["SIM"] > counts["NAO"] else "NAO"


def calculate_alignment(session: Session, reference: str) -> dict[int, tuple[float, int]]:
    senators = {s.id: s for s in session.scalars(select(Senator)).all()}
    votings = session.scalars(
        select(Voting).options(selectinload(Voting.votos)).where(Voting.tipo == "nominal")
    ).all()
    matches: Counter[int] = Counter()
    totals: Counter[int] = Counter()

    for voting in votings:
        vote_by_senator = {vote.senador_id: vote.categoria for vote in voting.votos}
        for senator_id, own_vote in vote_by_senator.items():
            if own_vote not in {"SIM", "NAO"}:
                continue
            senator = senators.get(senator_id)
            if not senator:
                continue
            key = {
                "partido": senator.partido_sigla,
                "bloco": senator.bloco,
                "campo": senator.espectro_comportamento or senator.espectro_partido,
            }[reference]
            peer_votes = [
                category
                for peer_id, category in vote_by_senator.items()
                if peer_id != senator_id
                and peer_id in senators
                and {
                    "partido": senators[peer_id].partido_sigla,
                    "bloco": senators[peer_id].bloco,
                    "campo": senators[peer_id].espectro_comportamento
                    or senators[peer_id].espectro_partido,
                }[reference]
                == key
            ]
            majority = _majority(peer_votes)
            if majority is None:
                continue
            totals[senator_id] += 1
            matches[senator_id] += own_vote == majority

    return {
        senator_id: (round(matches[senator_id] * 100 / total, 1), total)
        for senator_id, total in totals.items()
    }


def calculate_presence(session: Session) -> dict[int, tuple[float, int]]:
    rows = session.execute(
        select(Vote.senador_id, Vote.categoria).join(Voting).where(Voting.tipo == "nominal")
    ).all()
    categories: dict[int, list[str]] = defaultdict(list)
    for senator_id, category in rows:
        categories[senator_id].append(category)
    return {
        senator_id: (
            round(
                sum(v not in {"AUSENTE", "LICENCA"} for v in votes) * 100 / len(votes),
                1,
            ),
            len(votes),
        )
        for senator_id, votes in categories.items()
        if votes
    }


def senator_vote_summary(session: Session, senator_id: int) -> dict[str, int]:
    categories = session.scalars(
        select(Vote.categoria)
        .join(Voting)
        .where(Vote.senador_id == senator_id, Voting.tipo == "nominal")
    ).all()
    counts = Counter(categories)
    return {
        "total": len(categories),
        "presencas": sum(
            count for category, count in counts.items() if category not in {"AUSENTE", "LICENCA"}
        ),
        "sim": counts["SIM"],
        "nao": counts["NAO"],
        "abstencoes": counts["ABST"],
        "obstrucoes": counts["OBSTRUCAO"],
        "ausencias": counts["AUSENTE"],
        "licencas": counts["LICENCA"],
        "secretos": counts["SECRETO"],
    }


def senator_alignment_details(
    session: Session, senator: Senator, reference: str
) -> dict[str, object]:
    senators = {item.id: item for item in session.scalars(select(Senator)).all()}
    votings = (
        session.scalars(
            select(Voting)
            .join(Vote)
            .options(selectinload(Voting.votos), selectinload(Voting.materia))
            .where(
                Vote.senador_id == senator.id,
                Voting.tipo == "nominal",
            )
            .order_by(Voting.data_hora.desc())
        )
        .unique()
        .all()
    )
    key = {
        "partido": senator.partido_sigla,
        "bloco": senator.bloco,
        "campo": senator.espectro_comportamento or senator.espectro_partido,
    }[reference]
    details = []
    for voting in votings:
        own_vote = next(
            (vote.categoria for vote in voting.votos if vote.senador_id == senator.id), None
        )
        if own_vote not in {"SIM", "NAO"}:
            continue
        peer_votes = []
        for vote in voting.votos:
            peer = senators.get(vote.senador_id)
            if peer is None or peer.id == senator.id:
                continue
            peer_key = {
                "partido": peer.partido_sigla,
                "bloco": peer.bloco,
                "campo": peer.espectro_comportamento or peer.espectro_partido,
            }[reference]
            if peer_key == key:
                peer_votes.append(vote.categoria)
        majority = _majority(peer_votes)
        if majority is None:
            continue
        matter: Matter | None = voting.materia
        details.append(
            {
                "votacao_id": voting.id,
                "data_hora": voting.data_hora,
                "voto": own_vote,
                "maioria": majority,
                "alinhado": own_vote == majority,
                "materia_id": matter.id if matter else None,
                "materia_identificacao": (
                    f"{matter.sigla_tipo} {matter.numero}/{matter.ano}" if matter else None
                ),
                "descricao": voting.descricao,
            }
        )
    aligned = sum(bool(item["alinhado"]) for item in details)
    return {
        "referencia": reference,
        "alinhados": aligned,
        "desalinhados": len(details) - aligned,
        "total": len(details),
        "votos": details,
    }


def refresh_snapshots(session: Session, data_ref: date | None = None) -> int:
    ref = data_ref or date.today()
    session.execute(delete(IndexSnapshot).where(IndexSnapshot.data_ref == ref))
    count = 0
    for reference in ("partido", "bloco", "campo"):
        for senator_id, (value, n) in calculate_alignment(session, reference).items():
            session.add(
                IndexSnapshot(
                    senador_id=senator_id,
                    data_ref=ref,
                    tipo=f"alinhamento_{reference}",
                    valor=value,
                    n=n,
                )
            )
            count += 1
    for senator_id, (value, n) in calculate_presence(session).items():
        session.add(
            IndexSnapshot(
                senador_id=senator_id,
                data_ref=ref,
                tipo="presenca",
                valor=value,
                n=n,
            )
        )
        count += 1
    session.commit()
    return count
