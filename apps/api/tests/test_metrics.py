from datetime import datetime

from sqlalchemy.orm import Session

from app.database import Base, make_engine
from app.metrics import calculate_alignment, calculate_presence
from app.models import Senator, Vote, Voting


def session_with_votes():
    engine = make_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    session = Session(engine)
    senators = [
        Senator(
            codigo_senado=str(i),
            nome_parlamentar=f"S{i}",
            uf="CE",
            partido_sigla="P",
            bloco="B",
            espectro_partido="centro",
        )
        for i in range(1, 5)
    ]
    voting = Voting(
        codigo_senado="1", data_hora=datetime(2026, 1, 1), descricao="Teste", tipo="nominal"
    )
    session.add_all([*senators, voting])
    session.flush()
    session.add_all(
        [
            Vote(votacao=voting, senador=senators[0], sigla_original="Sim", categoria="SIM"),
            Vote(votacao=voting, senador=senators[1], sigla_original="Sim", categoria="SIM"),
            Vote(votacao=voting, senador=senators[2], sigla_original="Não", categoria="NAO"),
            Vote(votacao=voting, senador=senators[3], sigla_original="Sim", categoria="SIM"),
        ]
    )
    session.commit()
    return session, senators


def test_alignment_excludes_senator_from_reference():
    session, senators = session_with_votes()
    result = calculate_alignment(session, "partido")
    assert result[senators[0].id] == (100.0, 1)
    assert result[senators[2].id] == (0.0, 1)


def test_presence_counts_registered_vote():
    session, senators = session_with_votes()
    result = calculate_presence(session)
    assert result[senators[0].id] == (100.0, 1)
