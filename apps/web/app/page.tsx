import Link from "next/link";
import { ArrowRight, CheckCircle, Database, Function as FunctionIcon } from "@phosphor-icons/react/dist/ssr";
import { Hemicycle } from "@/components/Hemicycle";
import { LayerBadge } from "@/components/LayerBadge";
import { getSenators, getVoting, getVotings } from "@/lib/api";

export default async function Home({ searchParams }: { searchParams: Promise<{ votacao?: string }> }) {
  const params = await searchParams;
  const [senators, votings] = await Promise.all([getSenators(), getVotings(12)]);
  const voting = params.votacao ? await getVoting(params.votacao) : null;
  return <>
    <section className="hero"><div className="container hero-grid"><div><span className="eyebrow">Transparência política, sem ruído</span><h1>Seu senador vota<br />como prometeu?</h1><p>Dados oficiais, métricas abertas e contexto para você acompanhar as decisões que mudam o Brasil.</p><div className="hero-actions"><a className="button primary" href="#plenaria">Explorar o plenário <ArrowRight /></a><Link className="button ghost" href="/metodologia">Como calculamos</Link></div></div><div className="hero-proof"><span>Fato</span><i /><span>Métrica</span><i /><span>Editorial</span><p>Três camadas sempre identificadas.</p></div></div></section>
    <section id="plenaria" className="section container"><div className="section-heading"><div><LayerBadge type="fato" /><h2>O plenário, voto a voto</h2><p>{voting ? `Modo votação: ${voting.materia ? `${voting.materia.sigla_tipo} ${voting.materia.numero}/${voting.materia.ano}` : "votação selecionada"}` : `${senators.length || 81} parlamentares em exercício, por espectro político partidário.`}</p></div><form className="voting-picker"><label htmlFor="votacao">Visualizar votação</label><select id="votacao" name="votacao" defaultValue={params.votacao || ""}><option value="">Espectro político</option>{votings.map(v => <option key={v.id} value={v.id}>{v.materia ? `${v.materia.sigla_tipo} ${v.materia.numero}/${v.materia.ano}` : "Votação"} · {new Date(v.data_hora).toLocaleDateString("pt-BR")}</option>)}</select><button className="button small" type="submit">Aplicar</button></form></div>
      {senators.length ? <Hemicycle senators={senators} voting={voting} /> : <div className="empty-state"><Database size={28} /><h3>Base local ainda não carregada</h3><p>Execute <code>make ingest</code> para importar os dados oficiais do Senado.</p></div>}
    </section>
    <section className="principles"><div className="container principle-grid"><article><Database /><LayerBadge type="fato" /><h3>O que aconteceu</h3><p>Votos, presença, mandato e autoria vêm das fontes oficiais.</p></article><article><FunctionIcon /><LayerBadge type="metrica" /><h3>Como se comporta</h3><p>Índices reproduzíveis, com fórmula pública e tamanho da amostra.</p></article><article><CheckCircle /><LayerBadge type="editorial" /><h3>O que era esperado</h3><p>Pautas curadas com justificativa e fonte, sem misturar opinião com fato.</p></article></div></section>
  </>;
}
