from datetime import datetime

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models import Matter, MatterTheme, Senator, Voting
from app.themes import classify_text, sync_themes


def test_comments_replies_and_exclusive_opinion_reactions():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        senator = Senator(
            codigo_senado="1",
            nome_parlamentar="Senadora Teste",
            uf="CE",
            partido_sigla="P",
            espectro_partido="centro",
        )
        session.add(senator)
        session.commit()
        senator_id = senator.id

    def override_db():
        with Session(engine) as session:
            yield session

    app.dependency_overrides[get_db] = override_db
    try:
        with TestClient(app) as client:
            root = client.post(
                f"/api/v1/comentarios/senador/{senator_id}",
                json={
                    "autor_nome": "Ana",
                    "corpo": "Comentário principal",
                    "visitor_id": "visitor-00001",
                },
            ).json()
            comment_id = root[0]["id"]
            reply = client.post(
                f"/api/v1/comentarios/senador/{senator_id}",
                json={
                    "autor_nome": "Bruno",
                    "corpo": "Uma resposta",
                    "visitor_id": "visitor-00002",
                    "parent_id": comment_id,
                },
            ).json()
            assert reply[0]["respostas"][0]["corpo"] == "Uma resposta"

            approved = client.post(
                f"/api/v1/reacoes/comentarios/{comment_id}",
                json={"visitor_id": "visitor-00001", "tipo": "aprovar"},
            ).json()
            assert approved[0]["reacoes"]["aprovar"] == 1
            disapproved = client.post(
                f"/api/v1/reacoes/comentarios/{comment_id}",
                json={"visitor_id": "visitor-00001", "tipo": "desaprovar"},
            ).json()
            assert disapproved[0]["reacoes"]["aprovar"] == 0
            assert disapproved[0]["reacoes"]["desaprovar"] == 1
    finally:
        app.dependency_overrides.clear()


def test_theme_classification_and_aggregate_endpoint():
    assert classify_text("Amplia o atendimento do Sistema Único de Saúde em hospitais") == ["saude"]
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        matter = Matter(
            codigo_senado="M1",
            sigla_tipo="PL",
            numero="1",
            ano=2026,
            ementa="Amplia os serviços de saúde e o atendimento hospitalar.",
        )
        matter.votacoes.append(
            Voting(
                codigo_senado="V1",
                data_hora=datetime(2026, 1, 1),
                descricao="Votação do projeto",
                tipo="nominal",
                total_sim=40,
                total_nao=20,
                total_abst=2,
            )
        )
        session.add(matter)
        session.commit()
        assert sync_themes(session) == 1
        assert session.scalar(select(MatterTheme)) is not None

    def override_db():
        with Session(engine) as session:
            yield session

    app.dependency_overrides[get_db] = override_db
    try:
        with TestClient(app) as client:
            response = client.get("/api/v1/temas/saude")
            assert response.status_code == 200
            payload = response.json()
            assert payload["materias"] == 1
            assert payload["votacoes"] == 1
            assert payload["totais"] == {
                "sim": 40,
                "nao": 20,
                "abstencoes": 2,
                "total": 62,
            }
    finally:
        app.dependency_overrides.clear()
