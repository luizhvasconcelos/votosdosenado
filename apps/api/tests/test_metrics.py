from datetime import datetime

from sqlalchemy.orm import Session

from app.database import Base, make_engine
from app.metrics import (
    calculate_alignment,
    calculate_presence,
    senator_alignment_details,
    senator_vote_summary,
)
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


def test_presence_separates_absence_and_license():
    session, senators = session_with_votes()
    second = Voting(
        codigo_senado="2", data_hora=datetime(2026, 1, 2), descricao="Licença", tipo="nominal"
    )
    session.add(second)
    session.flush()
    session.add(
        Vote(
            votacao=second,
            senador=senators[0],
            sigla_original="Licença",
            categoria="LICENCA",
        )
    )
    session.commit()

    result = calculate_presence(session)
    assert result[senators[0].id] == (50.0, 2)


def test_profile_vote_metrics_include_traceable_alignment():
    session, senators = session_with_votes()
    summary = senator_vote_summary(session, senators[2].id)
    details = senator_alignment_details(session, senators[2], "partido")

    assert summary == {
        "total": 1,
        "presencas": 1,
        "sim": 0,
        "nao": 1,
        "abstencoes": 0,
        "obstrucoes": 0,
        "ausencias": 0,
        "licencas": 0,
        "secretos": 0,
    }
    assert details["alinhados"] == 0
    assert details["desalinhados"] == 1
    assert details["votos"][0]["voto"] == "NAO"
    assert details["votos"][0]["maioria"] == "SIM"
