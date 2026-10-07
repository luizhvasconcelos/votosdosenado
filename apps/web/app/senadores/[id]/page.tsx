import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Envelope, Phone } from "@phosphor-icons/react/dist/ssr";
import { LayerBadge } from "@/components/LayerBadge";
import { MetricCard } from "@/components/MetricCard";
import { AlignmentChart } from "@/components/AlignmentChart";
import { CommentSection } from "@/components/CommentSection";
import { ParliamentaryActivity } from "@/components/ParliamentaryActivity";
import { VoteTimeline } from "@/components/VoteTimeline";
import { getComments, getSenator } from "@/lib/api";
import { notFound } from "next/navigation";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const senator = await getSenator((await params).id);
  return senator ? { title: `${senator.nome_parlamentar} (${senator.partido_sigla}-${senator.uf})`, description: `Perfil, índices e votos recentes de ${senator.nome_parlamentar}.`, openGraph: { images: [`/senadores/${senator.id}/opengraph-image`] } } : { title: "Senador não encontrado" };
}

export default async function SenatorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [senator, comments] = await Promise.all([getSenator(id), getComments("senador", id)]);
  if (!senator) notFound();
  const metrics = Object.fromEntries((senator.indices || []).map(i => [i.tipo, i]));
  const elections = [...(senator.eleicoes || [])].sort((a, b) => b.ano - a.ano);
  const metricTypes = ["alinhamento_campo", "alinhamento_partido", "alinhamento_bloco", "presenca"];
  const incompleteMetrics = metricTypes.filter(type => !metrics[type] || metrics[type].n < 10);
  const futureMandate = Boolean(senator.mandato_inicio && new Date(`${senator.mandato_inicio}T12:00:00`) > new Date());
  return <div className="container detail-page"><Link href="/" className="back-link"><ArrowLeft /> Voltar ao plenário</Link>
    <section className="profile-hero"><div className="portrait">{senator.foto_url ? <Image src={senator.foto_url} alt={`Foto oficial de ${senator.nome_parlamentar}`} fill sizes="(max-width: 700px) 112px, 180px" priority /> : <span>{senator.nome_parlamentar.slice(0, 1)}</span>}</div><div className="profile-main"><LayerBadge type="fato" /><h1>{senator.nome_parlamentar}</h1><p className="profile-meta"><strong>{senator.partido_sigla}</strong> · {senator.uf} {senator.bloco && <>· {senator.bloco}</>}</p><div className="contact-row">{senator.email && <a href={`mailto:${senator.email}`}><Envelope /> {senator.email}</a>}{senator.telefone && <span><Phone /> (61) {senator.telefone}</span>}</div></div><dl className="mandate"><div><dt>Mandato</dt><dd>{senator.mandato_tipo}</dd></div><div><dt>Período</dt><dd>{senator.mandato_inicio ? new Date(`${senator.mandato_inicio}T12:00:00`).getFullYear() : "—"}–{senator.mandato_fim ? new Date(`${senator.mandato_fim}T12:00:00`).getFullYear() : "—"}</dd></div><div><dt>Classificação partidária</dt><dd className={`spectrum ${senator.espectro_partido}`}>{senator.espectro_partido}</dd></div></dl></section>
    <section><div className="section-heading"><div><LayerBadge type="fato" /><h2>Resultado eleitoral</h2><p>Votos nominais recebidos pela candidatura ao Senado, segundo o TSE.</p></div></div>{elections.length ? <div className="election-grid">{elections.map(election => <article key={`${election.ano}-${election.uf}`}><span>Eleição {election.ano}</span><strong>{election.votos.toLocaleString("pt-BR")}</strong><small>votos · {election.pct_validos != null ? `${election.pct_validos.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}% dos votos válidos` : "percentual indisponível"}</small><em>{election.eleito ? "Eleito" : election.posicao != null ? `${election.posicao}º lugar` : "Não eleito"}</em></article>)}</div> : <p className="empty-inline">A votação eleitoral individual ainda não está disponível para este perfil. Em suplências, os votos pertencem à chapa do titular.</p>}</section>
    <section><div className="section-heading"><div><LayerBadge type="metrica" /><h2>Índices de atuação</h2><p>O campo do senador é a referência principal. Compare com partido e bloco.</p></div></div>{incompleteMetrics.length > 0 && <p className="metrics-explainer"><strong>O que falta para calcular:</strong> {futureMandate ? "o mandato ainda não começou. Os índices aparecerão após a posse e o registro de pelo menos 10 votações nominais comparáveis." : "são necessárias pelo menos 10 votações nominais comparáveis. Para alinhamento, contam apenas votos SIM ou NÃO em que o partido, bloco ou campo tenha outros votantes e uma maioria definida; empates e demais categorias são descartados."}</p>}<div className="metrics-grid"><MetricCard label="Alinhamento com o campo" requirement="São necessários 10 votos SIM/NÃO com maioria definida no campo" {...metrics.alinhamento_campo} /><MetricCard label="Alinhamento com o partido" requirement="São necessários outros votantes do partido e 10 comparações válidas" {...metrics.alinhamento_partido} /><MetricCard label="Alinhamento com o bloco" requirement="São necessários 10 votos SIM/NÃO com maioria definida no bloco" {...metrics.alinhamento_bloco} /><MetricCard label="Presença nominal" requirement="São necessários 10 registros em votações nominais" {...metrics.presenca} /></div></section>
    <section className="alignment-section"><div className="section-heading"><div><LayerBadge type="metrica" /><h2>Onde acompanhou — e onde divergiu</h2><p>Cada marca representa um voto comparável. Abra a matéria para conferir o contexto completo.</p></div></div><AlignmentChart groups={senator.alinhamentos || []} /></section>
    <section className="activity-section"><div className="section-heading"><div><LayerBadge type="fato" /><h2>Atuação parlamentar</h2><p>Participação, projetos, relatorias, pronunciamentos e comissões no mandato atual.</p>{senator.atividade?.data_ref && <small className="data-reference">Dados oficiais atualizados em {new Date(`${senator.atividade.data_ref}T12:00:00`).toLocaleDateString("pt-BR")}{senator.atividade.periodo_inicio ? ` · período desde ${new Date(`${senator.atividade.periodo_inicio}T12:00:00`).toLocaleDateString("pt-BR")}` : ""}</small>}</div></div><ParliamentaryActivity activity={senator.atividade} participation={senator.participacao} /></section>
    <section><div className="section-heading"><div><LayerBadge type="fato" /><h2>Votos recentes</h2><p>Os 30 registros mais recentes disponíveis para este parlamentar.</p></div></div><VoteTimeline votes={senator.votos_recentes || []} /></section>
    <section className="history-section"><div className="section-heading"><div><LayerBadge type="fato" /><h2>Histórico partidário</h2></div></div><div className="history-list">{(senator.filiacoes || []).map(f => <div key={`${f.partido_sigla}-${f.inicio}`}><strong>{f.partido_sigla}</strong><span>{new Date(`${f.inicio}T12:00:00`).toLocaleDateString("pt-BR")} — {f.fim ? new Date(`${f.fim}T12:00:00`).toLocaleDateString("pt-BR") : "atual"}</span></div>)}{!senator.filiacoes?.length && <p className="empty-inline">Histórico ainda não importado.</p>}</div></section>
    <CommentSection target="senador" targetId={senator.id} initialComments={comments} />
  </div>;
}
