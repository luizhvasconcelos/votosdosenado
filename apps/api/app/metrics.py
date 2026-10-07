from collections import Counter, defaultdict
from datetime import date

from sqlalchemy import delete, select
from sqlalchemy.orm import Session, selectinload

from .models import IndexSnapshot, Senator, Vote, Voting


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
            round(sum(v != "AUSENTE" for v in votes) * 100 / len(votes), 1),
            len(votes),
        )
        for senator_id, votes in categories.items()
        if votes
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
