import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Envelope, Phone } from "@phosphor-icons/react/dist/ssr";
import { LayerBadge } from "@/components/LayerBadge";
import { MetricCard } from "@/components/MetricCard";
import { VoteTimeline } from "@/components/VoteTimeline";
import { getSenator } from "@/lib/api";
import { notFound } from "next/navigation";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const senator = await getSenator((await params).id);
  return senator ? { title: `${senator.nome_parlamentar} (${senator.partido_sigla}-${senator.uf})`, description: `Perfil, índices e votos recentes de ${senator.nome_parlamentar}.`, openGraph: { images: [`/senadores/${senator.id}/opengraph-image`] } } : { title: "Senador não encontrado" };
}

export default async function SenatorPage({ params }: { params: Promise<{ id: string }> }) {
  const senator = await getSenator((await params).id);
  if (!senator) notFound();
  const metrics = Object.fromEntries((senator.indices || []).map(i => [i.tipo, i]));
  return <div className="container detail-page"><Link href="/" className="back-link"><ArrowLeft /> Voltar ao plenário</Link>
    <section className="profile-hero"><div className="portrait">{senator.foto_url ? <Image src={senator.foto_url} alt={`Foto oficial de ${senator.nome_parlamentar}`} fill sizes="(max-width: 700px) 112px, 180px" priority /> : <span>{senator.nome_parlamentar.slice(0, 1)}</span>}</div><div className="profile-main"><LayerBadge type="fato" /><h1>{senator.nome_parlamentar}</h1><p className="profile-meta"><strong>{senator.partido_sigla}</strong> · {senator.uf} {senator.bloco && <>· {senator.bloco}</>}</p><div className="contact-row">{senator.email && <a href={`mailto:${senator.email}`}><Envelope /> {senator.email}</a>}{senator.telefone && <span><Phone /> (61) {senator.telefone}</span>}</div></div><dl className="mandate"><div><dt>Mandato</dt><dd>{senator.mandato_tipo}</dd></div><div><dt>Período</dt><dd>{senator.mandato_inicio ? new Date(`${senator.mandato_inicio}T12:00:00`).getFullYear() : "—"}–{senator.mandato_fim ? new Date(`${senator.mandato_fim}T12:00:00`).getFullYear() : "—"}</dd></div><div><dt>Classificação partidária</dt><dd className={`spectrum ${senator.espectro_partido}`}>{senator.espectro_partido}</dd></div></dl></section>
    <section><div className="section-heading"><div><LayerBadge type="metrica" /><h2>Índices de atuação</h2><p>O campo do senador é a referência principal. Compare com partido e bloco.</p></div></div><div className="metrics-grid"><MetricCard label="Alinhamento com o campo" {...metrics.alinhamento_campo} /><MetricCard label="Alinhamento com o partido" {...metrics.alinhamento_partido} /><MetricCard label="Alinhamento com o bloco" {...metrics.alinhamento_bloco} /><MetricCard label="Presença nominal" {...metrics.presenca} /></div></section>
    <section><div className="section-heading"><div><LayerBadge type="fato" /><h2>Votos recentes</h2><p>Os 30 registros mais recentes disponíveis para este parlamentar.</p></div></div><VoteTimeline votes={senator.votos_recentes || []} /></section>
    <section className="history-section"><div className="section-heading"><div><LayerBadge type="fato" /><h2>Histórico partidário</h2></div></div><div className="history-list">{(senator.filiacoes || []).map(f => <div key={`${f.partido_sigla}-${f.inicio}`}><strong>{f.partido_sigla}</strong><span>{new Date(`${f.inicio}T12:00:00`).toLocaleDateString("pt-BR")} — {f.fim ? new Date(`${f.fim}T12:00:00`).toLocaleDateString("pt-BR") : "atual"}</span></div>)}{!senator.filiacoes?.length && <p className="empty-inline">Histórico ainda não importado.</p>}</div></section>
  </div>;
}
