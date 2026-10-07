import Link from "next/link";
import { ArrowLeft, ArrowSquareOut } from "@phosphor-icons/react/dist/ssr";
import { LayerBadge } from "@/components/LayerBadge";
import { getMatter } from "@/lib/api";
import { notFound } from "next/navigation";

export default async function MatterPage({ params }: { params: Promise<{ id: string }> }) {
  const matter = await getMatter((await params).id);
  if (!matter) notFound();
  return <div className="container detail-page"><Link href="/materias" className="back-link"><ArrowLeft /> Todas as matérias</Link><LayerBadge type="fato" /><h1>{matter.sigla_tipo} {matter.numero}/{matter.ano}</h1><p className="lead">{matter.ementa}</p>{matter.url && <a className="button ghost" href={matter.url} target="_blank" rel="noreferrer">Ver fonte oficial <ArrowSquareOut /></a>}<section><h2>Votações desta matéria</h2><div className="card-list">{matter.votacoes?.map(v => <Link href={`/votacoes/${v.id}`} className="data-card" key={v.id}><div><small>{new Date(v.data_hora).toLocaleDateString("pt-BR")}</small><h3>{v.descricao}</h3></div><div className="score"><span className="sim">{v.total_sim} Sim</span><span className="nao">{v.total_nao} Não</span></div></Link>)}</div></section></div>;
}
