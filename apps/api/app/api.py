from collections import Counter, defaultdict

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc, func, or_, select
from sqlalchemy.orm import Session, selectinload

from .database import get_db
from .metrics import senator_alignment_details, senator_vote_summary
from .models import (
    Comment,
    CommentReaction,
    ElectionResult,
    Matter,
    MatterTheme,
    Senator,
    Theme,
    Vote,
    Voting,
)
from .schemas import (
    CommentCreate,
    CommentOut,
    MatterDetail,
    MatterSummary,
    ReactionCreate,
    SenatorDetail,
    SenatorSummary,
    ThemeDetailOut,
    ThemeSummaryOut,
    VotingDetail,
    VotingSummary,
)
from .themes import THEME_DEFINITIONS, theme_summary

router = APIRouter(prefix="/api/v1")


def _ensure_target(db: Session, target_type: str, target_id: int) -> None:
    model = {"senador": Senator, "votacao": Voting}.get(target_type)
    if model is None or db.get(model, target_id) is None:
        raise HTTPException(404, "Página comentada não encontrada")


def _comment_payloads(
    db: Session, target_type: str, target_id: int, visitor_id: str | None = None
) -> list[dict[str, object]]:
    comments = db.scalars(
        select(Comment)
        .where(
            Comment.alvo_tipo == target_type,
            Comment.alvo_id == target_id,
            Comment.status == "publicado",
        )
        .order_by(Comment.criado_em)
    ).all()
    ids = [comment.id for comment in comments]
    reactions = (
        db.scalars(select(CommentReaction).where(CommentReaction.comentario_id.in_(ids))).all()
        if ids
        else []
    )
    counts: dict[int, Counter[str]] = defaultdict(Counter)
    visitor_reactions: dict[int, list[str]] = defaultdict(list)
    for reaction in reactions:
        counts[reaction.comentario_id][reaction.tipo] += 1
        if visitor_id and reaction.visitor_id == visitor_id:
            visitor_reactions[reaction.comentario_id].append(reaction.tipo)

    payload_by_id: dict[int, dict[str, object]] = {}
    roots: list[dict[str, object]] = []
    for comment in comments:
        payload_by_id[comment.id] = {
            "id": comment.id,
            "autor_nome": comment.autor_nome,
            "corpo": comment.corpo,
            "criado_em": comment.criado_em,
            "parent_id": comment.parent_id,
            "reacoes": {
                "curtir": counts[comment.id]["curtir"],
                "aprovar": counts[comment.id]["aprovar"],
                "desaprovar": counts[comment.id]["desaprovar"],
            },
            "reacoes_visitante": visitor_reactions[comment.id],
            "respostas": [],
        }
    for comment in comments:
        payload = payload_by_id[comment.id]
        parent = payload_by_id.get(comment.parent_id or -1)
        if parent:
            replies = parent["respostas"]
            assert isinstance(replies, list)
            replies.append(payload)
        else:
            roots.append(payload)
    return list(reversed(roots))


@router.get("/health")
def health(db: Session = Depends(get_db)) -> dict[str, object]:
    return {
        "status": "ok",
        "senadores": db.scalar(select(func.count()).select_from(Senator)) or 0,
        "votacoes": db.scalar(select(func.count()).select_from(Voting)) or 0,
    }


@router.get("/comentarios/{target_type}/{target_id}", response_model=list[CommentOut])
def comments(
    target_type: str,
    target_id: int,
    visitor_id: str | None = Query(None, pattern=r"^[a-zA-Z0-9-]{12,64}$"),
    db: Session = Depends(get_db),
):
    _ensure_target(db, target_type, target_id)
    return _comment_payloads(db, target_type, target_id, visitor_id)


@router.post("/comentarios/{target_type}/{target_id}", response_model=list[CommentOut])
def create_comment(
    target_type: str,
    target_id: int,
    data: CommentCreate,
    db: Session = Depends(get_db),
):
    _ensure_target(db, target_type, target_id)
    author = data.autor_nome.strip()
    body = data.corpo.strip()
    if len(author) < 2 or len(body) < 2:
        raise HTTPException(422, "Informe nome e comentário válidos")
    parent_id = data.parent_id
    if parent_id is not None:
        parent = db.get(Comment, parent_id)
        if (
            parent is None
            or parent.alvo_tipo != target_type
            or parent.alvo_id != target_id
            or parent.status != "publicado"
        ):
            raise HTTPException(422, "Comentário respondido não encontrado")
        parent_id = parent.parent_id or parent.id
    db.add(
        Comment(
            alvo_tipo=target_type,
            alvo_id=target_id,
            parent_id=parent_id,
            autor_nome=author,
            corpo=body,
            visitor_id=data.visitor_id,
        )
    )
    db.commit()
    return _comment_payloads(db, target_type, target_id, data.visitor_id)


@router.post("/reacoes/comentarios/{comment_id}", response_model=list[CommentOut])
def react_to_comment(comment_id: int, data: ReactionCreate, db: Session = Depends(get_db)):
    comment = db.get(Comment, comment_id)
    if comment is None or comment.status != "publicado":
        raise HTTPException(404, "Comentário não encontrado")
    existing = db.scalar(
        select(CommentReaction).where(
            CommentReaction.comentario_id == comment_id,
            CommentReaction.visitor_id == data.visitor_id,
            CommentReaction.tipo == data.tipo,
        )
    )
    if existing:
        db.delete(existing)
    else:
        if data.tipo in {"aprovar", "desaprovar"}:
            opposite = "desaprovar" if data.tipo == "aprovar" else "aprovar"
            previous = db.scalar(
                select(CommentReaction).where(
                    CommentReaction.comentario_id == comment_id,
                    CommentReaction.visitor_id == data.visitor_id,
                    CommentReaction.tipo == opposite,
                )
            )
            if previous:
                db.delete(previous)
        db.add(
            CommentReaction(
                comentario_id=comment_id,
                visitor_id=data.visitor_id,
                tipo=data.tipo,
            )
        )
    db.commit()
    return _comment_payloads(db, comment.alvo_tipo, comment.alvo_id, data.visitor_id)


@router.get("/temas", response_model=list[ThemeSummaryOut])
def themes(db: Session = Depends(get_db)):
    by_slug = {theme.slug: theme for theme in db.scalars(select(Theme)).all()}
    result = []
    for definition in THEME_DEFINITIONS:
        theme = by_slug.get(definition["slug"])
        matter_count = 0
        voting_count = 0
        if theme:
            matter_count = (
                db.scalar(
                    select(func.count())
                    .select_from(MatterTheme)
                    .where(MatterTheme.tema_id == theme.id)
                )
                or 0
            )
            voting_count = (
                db.scalar(
                    select(func.count())
                    .select_from(Voting)
                    .join(MatterTheme, Voting.materia_id == MatterTheme.materia_id)
                    .where(MatterTheme.tema_id == theme.id)
                )
                or 0
            )
        result.append(
            {
                "slug": definition["slug"],
                "nome": definition["nome"],
                "resumo": definition["resumo"],
                "materias": matter_count,
                "votacoes": voting_count,
            }
        )
    return result


@router.get("/temas/{slug}", response_model=ThemeDetailOut)
def theme_detail(slug: str, db: Session = Depends(get_db)):
    theme = db.scalar(select(Theme).where(Theme.slug == slug))
    if theme is None:
        raise HTTPException(404, "Tema não encontrado")
    rows = (
        db.execute(
            select(Matter, MatterTheme.origem)
            .join(MatterTheme, MatterTheme.materia_id == Matter.id)
            .options(selectinload(Matter.votacoes))
            .where(MatterTheme.tema_id == theme.id)
            .order_by(desc(Matter.ano), desc(Matter.id))
        )
        .unique()
        .all()
    )
    totals = Counter()
    voting_count = 0
    matters_payload = []
    for matter, origin in rows:
        voting_count += len(matter.votacoes)
        for voting in matter.votacoes:
            totals["sim"] += voting.total_sim
            totals["nao"] += voting.total_nao
            totals["abstencoes"] += voting.total_abst
        payload = MatterSummary.model_validate(matter).model_dump()
        payload["origem_tema"] = origin
        payload["votacoes"] = [
            VotingSummary.model_validate(voting).model_dump() for voting in matter.votacoes
        ]
        matters_payload.append(payload)
    total_votes = totals["sim"] + totals["nao"] + totals["abstencoes"]
    return {
        "slug": theme.slug,
        "nome": theme.nome,
        "resumo": theme_summary(theme.slug),
        "materias": len(rows),
        "votacoes": voting_count,
        "totais": {
            "sim": totals["sim"],
            "nao": totals["nao"],
            "abstencoes": totals["abstencoes"],
            "total": total_votes,
        },
        "materias_relacionadas": matters_payload,
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
