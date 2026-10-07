from datetime import date, datetime
from typing import Any

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class Senator(Base):
    __tablename__ = "senador"

    id: Mapped[int] = mapped_column(primary_key=True)
    codigo_senado: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    nome_parlamentar: Mapped[str] = mapped_column(String(180), index=True)
    nome_civil: Mapped[str | None] = mapped_column(String(240))
    uf: Mapped[str] = mapped_column(String(2), index=True)
    partido_sigla: Mapped[str] = mapped_column(String(30), index=True)
    bloco: Mapped[str | None] = mapped_column(String(120), index=True)
    foto_url: Mapped[str | None] = mapped_column(Text)
    email: Mapped[str | None] = mapped_column(String(180))
    telefone: Mapped[str | None] = mapped_column(String(40))
    espectro_partido: Mapped[str] = mapped_column(String(20), default="centro")
    espectro_comportamento: Mapped[str | None] = mapped_column(String(20))
    ativo: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    mandato_inicio: Mapped[date | None] = mapped_column(Date)
    mandato_fim: Mapped[date | None] = mapped_column(Date)
    mandato_tipo: Mapped[str] = mapped_column(String(20), default="titular")

    votos: Mapped[list["Vote"]] = relationship(back_populates="senador")
    indices: Mapped[list["IndexSnapshot"]] = relationship(back_populates="senador")
    mandatos: Mapped[list["Mandate"]] = relationship(back_populates="senador")
    filiacoes: Mapped[list["Affiliation"]] = relationship(back_populates="senador")
    eleicoes: Mapped[list["ElectionResult"]] = relationship(back_populates="senador")
    atividade: Mapped["LegislativeActivity | None"] = relationship(
        back_populates="senador", uselist=False
    )


class Mandate(Base):
    __tablename__ = "mandato"
    __table_args__ = (UniqueConstraint("senador_id", "codigo_senado"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    senador_id: Mapped[int] = mapped_column(ForeignKey("senador.id"), index=True)
    codigo_senado: Mapped[str] = mapped_column(String(30))
    legislatura: Mapped[str] = mapped_column(String(30))
    inicio: Mapped[date] = mapped_column(Date)
    fim: Mapped[date] = mapped_column(Date)
    tipo: Mapped[str] = mapped_column(String(20))
    participacao: Mapped[str | None] = mapped_column(String(80))

    senador: Mapped[Senator] = relationship(back_populates="mandatos")


class Affiliation(Base):
    __tablename__ = "filiacao"
    __table_args__ = (UniqueConstraint("senador_id", "partido_sigla", "inicio"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    senador_id: Mapped[int] = mapped_column(ForeignKey("senador.id"), index=True)
    partido_sigla: Mapped[str] = mapped_column(String(30))
    inicio: Mapped[date] = mapped_column(Date)
    fim: Mapped[date | None] = mapped_column(Date)

    senador: Mapped[Senator] = relationship(back_populates="filiacoes")


class ElectionResult(Base):
    __tablename__ = "eleicao_resultado"
    __table_args__ = (UniqueConstraint("senador_id", "ano", "uf"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    senador_id: Mapped[int] = mapped_column(ForeignKey("senador.id"), index=True)
    ano: Mapped[int] = mapped_column(Integer, index=True)
    uf: Mapped[str] = mapped_column(String(2))
    votos: Mapped[int] = mapped_column(Integer)
    pct_validos: Mapped[float | None] = mapped_column(Float)
    posicao: Mapped[int | None] = mapped_column(Integer)
    eleito: Mapped[bool] = mapped_column(Boolean)

    senador: Mapped[Senator] = relationship(back_populates="eleicoes")


class LegislativeActivity(Base):
    __tablename__ = "atividade_legislativa"

    id: Mapped[int] = mapped_column(primary_key=True)
    senador_id: Mapped[int] = mapped_column(ForeignKey("senador.id"), unique=True, index=True)
    data_ref: Mapped[date] = mapped_column(Date, index=True)
    periodo_inicio: Mapped[date | None] = mapped_column(Date)
    autorias_total: Mapped[int] = mapped_column(Integer, default=0)
    projetos_autoria: Mapped[int] = mapped_column(Integer, default=0)
    autorias_principais: Mapped[int] = mapped_column(Integer, default=0)
    relatorias: Mapped[int] = mapped_column(Integer, default=0)
    discursos: Mapped[int] = mapped_column(Integer, default=0)
    apartes: Mapped[int] = mapped_column(Integer, default=0)
    comissoes_ativas: Mapped[int] = mapped_column(Integer, default=0)
    autorias_recentes: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)
    relatorias_recentes: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)
    discursos_recentes: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)
    comissoes: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)

    senador: Mapped[Senator] = relationship(back_populates="atividade")


class Party(Base):
    __tablename__ = "partido"

    sigla: Mapped[str] = mapped_column(String(30), primary_key=True)
    nome: Mapped[str] = mapped_column(String(120))
    espectro_default: Mapped[str] = mapped_column(String(20))


class Matter(Base):
    __tablename__ = "materia"

    id: Mapped[int] = mapped_column(primary_key=True)
    codigo_senado: Mapped[str] = mapped_column(String(30), unique=True, index=True)
    sigla_tipo: Mapped[str] = mapped_column(String(20), index=True)
    numero: Mapped[str] = mapped_column(String(30))
    ano: Mapped[int] = mapped_column(Integer, index=True)
    ementa: Mapped[str] = mapped_column(Text, default="")
    situacao: Mapped[str | None] = mapped_column(String(180))
    url: Mapped[str | None] = mapped_column(Text)

    votacoes: Mapped[list["Voting"]] = relationship(back_populates="materia")


class Voting(Base):
    __tablename__ = "votacao"

    id: Mapped[int] = mapped_column(primary_key=True)
    codigo_senado: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    materia_id: Mapped[int | None] = mapped_column(ForeignKey("materia.id"), index=True)
    data_hora: Mapped[datetime] = mapped_column(DateTime, index=True)
    descricao: Mapped[str] = mapped_column(Text)
    tipo: Mapped[str] = mapped_column(String(20), default="nominal", index=True)
    resultado: Mapped[str | None] = mapped_column(String(80))
    total_sim: Mapped[int] = mapped_column(Integer, default=0)
    total_nao: Mapped[int] = mapped_column(Integer, default=0)
    total_abst: Mapped[int] = mapped_column(Integer, default=0)

    materia: Mapped[Matter | None] = relationship(back_populates="votacoes")
    votos: Mapped[list["Vote"]] = relationship(
        back_populates="votacao", cascade="all, delete-orphan"
    )


class Vote(Base):
    __tablename__ = "voto"
    __table_args__ = (UniqueConstraint("votacao_id", "senador_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    votacao_id: Mapped[int] = mapped_column(ForeignKey("votacao.id"), index=True)
    senador_id: Mapped[int] = mapped_column(ForeignKey("senador.id"), index=True)
    sigla_original: Mapped[str] = mapped_column(String(80))
    categoria: Mapped[str] = mapped_column(String(20), index=True)

    votacao: Mapped[Voting] = relationship(back_populates="votos")
    senador: Mapped[Senator] = relationship(back_populates="votos")


class IndexSnapshot(Base):
    __tablename__ = "indice_snapshot"
    __table_args__ = (UniqueConstraint("senador_id", "data_ref", "tipo"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    senador_id: Mapped[int] = mapped_column(ForeignKey("senador.id"), index=True)
    data_ref: Mapped[date] = mapped_column(Date, index=True)
    tipo: Mapped[str] = mapped_column(String(40), index=True)
    valor: Mapped[float] = mapped_column(Float)
    n: Mapped[int] = mapped_column(Integer)

    senador: Mapped[Senator] = relationship(back_populates="indices")


class Theme(Base):
    __tablename__ = "tema"

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(80), unique=True)
    nome: Mapped[str] = mapped_column(String(120))


class MatterTheme(Base):
    __tablename__ = "materia_tema"

    materia_id: Mapped[int] = mapped_column(ForeignKey("materia.id"), primary_key=True)
    tema_id: Mapped[int] = mapped_column(ForeignKey("tema.id"), primary_key=True)
    origem: Mapped[str] = mapped_column(String(20))


class Orientation(Base):
    __tablename__ = "orientacao"

    id: Mapped[int] = mapped_column(primary_key=True)
    votacao_id: Mapped[int] = mapped_column(ForeignKey("votacao.id"), index=True)
    bancada: Mapped[str] = mapped_column(String(120))
    orientacao: Mapped[str] = mapped_column(String(20))


class PriorityAgenda(Base):
    __tablename__ = "pauta_prioritaria"

    id: Mapped[int] = mapped_column(primary_key=True)
    materia_id: Mapped[int] = mapped_column(ForeignKey("materia.id"), index=True)
    voto_esperado: Mapped[str] = mapped_column(String(20))
    justificativa: Mapped[str] = mapped_column(Text)
    fonte_promessa_url: Mapped[str] = mapped_column(Text)
    ativa: Mapped[bool] = mapped_column(Boolean, default=True)


class EditorialHistory(Base):
    __tablename__ = "pauta_prioritaria_historico"

    id: Mapped[int] = mapped_column(primary_key=True)
    pauta_id: Mapped[int] = mapped_column(ForeignKey("pauta_prioritaria.id"), index=True)
    acao: Mapped[str] = mapped_column(String(20))
    motivo: Mapped[str] = mapped_column(Text)
    autor: Mapped[str] = mapped_column(String(120))
    criado_em: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Event(Base):
    __tablename__ = "evento"

    id: Mapped[int] = mapped_column(primary_key=True)
    tipo: Mapped[str] = mapped_column(String(60), index=True)
    payload_json: Mapped[dict[str, Any]] = mapped_column(JSON)
    criado_em: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)


class User(Base):
    __tablename__ = "usuario"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(240), unique=True, index=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    consentimento_em: Mapped[datetime] = mapped_column(DateTime)
    consentimento_versao: Mapped[str] = mapped_column(String(30))


class Follow(Base):
    __tablename__ = "seguimento"
    __table_args__ = (UniqueConstraint("usuario_id", "alvo_tipo", "alvo_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuario.id"), index=True)
    alvo_tipo: Mapped[str] = mapped_column(String(20))
    alvo_id: Mapped[str] = mapped_column(String(80))
    criado_em: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Notification(Base):
    __tablename__ = "notificacao"

    id: Mapped[int] = mapped_column(primary_key=True)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuario.id"), index=True)
    evento_id: Mapped[int] = mapped_column(ForeignKey("evento.id"), index=True)
    canal: Mapped[str] = mapped_column(String(20))
    enviada_em: Mapped[datetime | None] = mapped_column(DateTime)
    status: Mapped[str] = mapped_column(String(30))
