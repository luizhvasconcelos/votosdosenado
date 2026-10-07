from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class IndexOut(ORMModel):
    tipo: str
    valor: float
    n: int
    data_ref: date


class MandateOut(ORMModel):
    legislatura: str
    inicio: date
    fim: date
    tipo: str
    participacao: str | None


class AffiliationOut(ORMModel):
    partido_sigla: str
    inicio: date
    fim: date | None


class ElectionOut(ORMModel):
    ano: int
    uf: str
    votos: int
    pct_validos: float | None
    posicao: int | None
    eleito: bool


class ActivityItemOut(BaseModel):
    codigo: str
    data: str | None = None
    url: str | None = None
    identificacao: str | None = None
    ementa: str | None = None
    resumo: str | None = None


class CommissionOut(BaseModel):
    sigla: str | None = None
    nome: str | None = None
    participacao: str | None = None
    inicio: str | None = None


class LegislativeActivityOut(ORMModel):
    data_ref: date
    periodo_inicio: date | None
    autorias_total: int
    projetos_autoria: int
    autorias_principais: int
    relatorias: int
    discursos: int
    apartes: int
    comissoes_ativas: int
    autorias_recentes: list[ActivityItemOut] = Field(default_factory=list)
    relatorias_recentes: list[ActivityItemOut] = Field(default_factory=list)
    discursos_recentes: list[ActivityItemOut] = Field(default_factory=list)
    comissoes: list[CommissionOut] = Field(default_factory=list)


class ParticipationOut(BaseModel):
    total: int
    presencas: int
    sim: int
    nao: int
    abstencoes: int
    obstrucoes: int
    ausencias: int
    licencas: int
    secretos: int


class AlignmentVoteOut(BaseModel):
    votacao_id: int
    data_hora: datetime
    voto: str
    maioria: str
    alinhado: bool
    materia_id: int | None
    materia_identificacao: str | None
    descricao: str


class AlignmentGroupOut(BaseModel):
    referencia: str
    alinhados: int
    desalinhados: int
    total: int
    votos: list[AlignmentVoteOut] = Field(default_factory=list)


class SenatorSummary(ORMModel):
    id: int
    codigo_senado: str
    nome_parlamentar: str
    uf: str
    partido_sigla: str
    bloco: str | None
    foto_url: str | None
    espectro_partido: str
    espectro_comportamento: str | None
    ativo: bool
    eleicoes: list[ElectionOut] = Field(default_factory=list)


class VoteSummary(ORMModel):
    categoria: str
    sigla_original: str


class SenatorVoteOut(ORMModel):
    id: int
    codigo_senado: str
    data_hora: datetime
    descricao: str
    resultado: str | None
    categoria: str
    sigla_original: str
    materia_id: int | None
    materia_identificacao: str | None


class SenatorDetail(SenatorSummary):
    nome_civil: str | None
    email: str | None
    telefone: str | None
    mandato_inicio: date | None
    mandato_fim: date | None
    mandato_tipo: str
    indices: list[IndexOut] = Field(default_factory=list)
    votos_recentes: list[SenatorVoteOut] = Field(default_factory=list)
    mandatos: list[MandateOut] = Field(default_factory=list)
    filiacoes: list[AffiliationOut] = Field(default_factory=list)
    atividade: LegislativeActivityOut | None = None
    participacao: ParticipationOut | None = None
    alinhamentos: list[AlignmentGroupOut] = Field(default_factory=list)


class MatterSummary(ORMModel):
    id: int
    codigo_senado: str
    sigla_tipo: str
    numero: str
    ano: int
    ementa: str
    url: str | None


class VotingSummary(ORMModel):
    id: int
    codigo_senado: str
    data_hora: datetime
    descricao: str
    tipo: str
    resultado: str | None
    total_sim: int
    total_nao: int
    total_abst: int
    materia: MatterSummary | None


class NamedVote(ORMModel):
    senador: SenatorSummary
    categoria: str
    sigla_original: str


class VotingDetail(VotingSummary):
    votos: list[NamedVote]


class MatterDetail(MatterSummary):
    votacoes: list[VotingSummary]


class CommentCreate(BaseModel):
    autor_nome: str = Field(min_length=2, max_length=60)
    corpo: str = Field(min_length=2, max_length=1200)
    visitor_id: str = Field(pattern=r"^[a-zA-Z0-9-]{12,64}$")
    parent_id: int | None = None


class ReactionCreate(BaseModel):
    visitor_id: str = Field(pattern=r"^[a-zA-Z0-9-]{12,64}$")
    tipo: Literal["curtir", "aprovar", "desaprovar"]


class ReactionSummary(BaseModel):
    curtir: int = 0
    aprovar: int = 0
    desaprovar: int = 0


class CommentOut(BaseModel):
    id: int
    autor_nome: str
    corpo: str
    criado_em: datetime
    parent_id: int | None
    reacoes: ReactionSummary
    reacoes_visitante: list[str] = Field(default_factory=list)
    respostas: list["CommentOut"] = Field(default_factory=list)


class ThemeSummaryOut(BaseModel):
    slug: str
    nome: str
    resumo: str
    materias: int
    votacoes: int


class ThemeVoteTotals(BaseModel):
    sim: int
    nao: int
    abstencoes: int
    total: int


class ThemedMatterOut(MatterSummary):
    origem_tema: str
    votacoes: list[VotingSummary] = Field(default_factory=list)


class ThemeDetailOut(ThemeSummaryOut):
    totais: ThemeVoteTotals
    materias_relacionadas: list[ThemedMatterOut] = Field(default_factory=list)
