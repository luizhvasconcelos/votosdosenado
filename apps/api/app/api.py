from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc, func, or_, select
from sqlalchemy.orm import Session, selectinload

from .database import get_db
from .metrics import senator_alignment_details, senator_vote_summary
from .models import ElectionResult, Matter, Senator, Vote, Voting
from .schemas import (
    MatterDetail,
    MatterSummary,
    SenatorDetail,
    SenatorSummary,
    VotingDetail,
    VotingSummary,
)

router = APIRouter(prefix="/api/v1")


@router.get("/health")
def health(db: Session = Depends(get_db)) -> dict[str, object]:
    return {
        "status": "ok",
        "senadores": db.scalar(select(func.count()).select_from(Senator)) or 0,
        "votacoes": db.scalar(select(func.count()).select_from(Voting)) or 0,
    }


@router.get("/senadores", response_model=list[SenatorSummary])
def senators(
    partido: str | None = None,
    uf: str | None = None,
    bloco: str | None = None,
    espectro: str | None = None,
    busca: str | None = None,
    db: Session = Depends(get_db),
):
    query = (
        select(Senator)
        .options(selectinload(Senator.eleicoes))
        .where(Senator.ativo.is_(True))
        .order_by(Senator.uf, Senator.nome_parlamentar)
    )
    if partido:
        query = query.where(Senator.partido_sigla == partido)
    if uf:
        query = query.where(Senator.uf == uf)
    if bloco:
        query = query.where(Senator.bloco == bloco)
    if espectro:
        query = query.where(
            or_(Senator.espectro_comportamento == espectro, Senator.espectro_partido == espectro)
        )
    if busca:
        query = query.where(Senator.nome_parlamentar.ilike(f"%{busca}%"))
    return db.scalars(query).all()


@router.get("/senadores/composicao/{year}", response_model=list[SenatorSummary])
def senators_by_composition(year: int, db: Session = Depends(get_db)):
    if year != 2027:
        raise HTTPException(404, "Composição não disponível")
    return (
        db.scalars(
            select(Senator)
            .join(ElectionResult)
            .options(selectinload(Senator.eleicoes))
            .where(
                ElectionResult.ano.in_((2022, 2026)),
                ElectionResult.eleito.is_(True),
            )
            .order_by(Senator.uf, Senator.nome_parlamentar)
        )
        .unique()
        .all()
    )


@router.get("/senadores/{senator_id}", response_model=SenatorDetail)
def senator_detail(senator_id: int, db: Session = Depends(get_db)):
    senator = db.scalar(
        select(Senator)
        .options(
            selectinload(Senator.indices),
            selectinload(Senator.mandatos),
            selectinload(Senator.filiacoes),
            selectinload(Senator.eleicoes),
            selectinload(Senator.atividade),
        )
        .where(Senator.id == senator_id)
    )
    if senator is None:
        raise HTTPException(404, "Senador não encontrado")
    latest_by_type = {}
    for item in sorted(senator.indices, key=lambda i: i.data_ref, reverse=True):
        latest_by_type.setdefault(item.tipo, item)
    rows = db.execute(
        select(Vote, Voting, Matter)
        .join(Voting, Vote.votacao_id == Voting.id)
        .outerjoin(Matter, Voting.materia_id == Matter.id)
        .where(Vote.senador_id == senator.id)
        .order_by(desc(Voting.data_hora))
        .limit(30)
    ).all()
    payload = SenatorDetail.model_validate(senator).model_dump()
    payload["indices"] = list(latest_by_type.values())
    payload["participacao"] = senator_vote_summary(db, senator.id)
    payload["alinhamentos"] = [
        senator_alignment_details(db, senator, reference)
        for reference in ("campo", "partido", "bloco")
    ]
    payload["votos_recentes"] = [
        {
            "id": voting.id,
            "codigo_senado": voting.codigo_senado,
            "data_hora": voting.data_hora,
            "descricao": voting.descricao,
            "resultado": voting.resultado,
            "categoria": vote.categoria,
            "sigla_original": vote.sigla_original,
            "materia_id": matter.id if matter else None,
            "materia_identificacao": f"{matter.sigla_tipo} {matter.numero}/{matter.ano}"
            if matter
            else None,
        }
        for vote, voting, matter in rows
    ]
    return payload


@router.get("/votacoes", response_model=list[VotingSummary])
def votings(limit: int = Query(30, ge=1, le=200), db: Session = Depends(get_db)):
    return db.scalars(
        select(Voting)
        .options(selectinload(Voting.materia))
        .order_by(desc(Voting.data_hora))
        .limit(limit)
    ).all()


@router.get("/votacoes/{voting_id}", response_model=VotingDetail)
def voting_detail(voting_id: int, db: Session = Depends(get_db)):
    voting = db.scalar(
        select(Voting)
        .options(
            selectinload(Voting.materia), selectinload(Voting.votos).selectinload(Vote.senador)
        )
        .where(Voting.id == voting_id)
    )
    if voting is None:
        raise HTTPException(404, "Votação não encontrada")
    return voting


@router.get("/materias", response_model=list[MatterSummary])
def matters(limit: int = Query(30, ge=1, le=200), db: Session = Depends(get_db)):
    return db.scalars(
        select(Matter).order_by(desc(Matter.ano), Matter.sigla_tipo).limit(limit)
    ).all()


@router.get("/materias/{matter_id}", response_model=MatterDetail)
def matter_detail(matter_id: int, db: Session = Depends(get_db)):
    matter = db.scalar(
        select(Matter).options(selectinload(Matter.votacoes)).where(Matter.id == matter_id)
    )
    if matter is None:
        raise HTTPException(404, "Matéria não encontrada")
    return matter
