from datetime import date, datetime

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
