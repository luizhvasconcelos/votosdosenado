import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowSquareOut } from "@phosphor-icons/react/dist/ssr";
import { Hemicycle } from "@/components/Hemicycle";
import { LayerBadge } from "@/components/LayerBadge";
import { NominalVoteList } from "@/components/NominalVoteList";
import { getVoting } from "@/lib/api";
import { notFound } from "next/navigation";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const vote = await getVoting((await params).id);
  const title = vote?.materia ? `${vote.materia.sigla_tipo} ${vote.materia.numero}/${vote.materia.ano}` : "Votação";
  return { title, description: vote?.descricao, openGraph: { images: [`/votacoes/${(await params).id}/opengraph-image`] } };
}
export default async function VotingPage({ params }: { params: Promise<{ id: string }> }) {
  const voting = await getVoting((await params).id);
  if (!voting) notFound();
  const senators = voting.votos?.map(v => v.senador) || [];
  const title = voting.materia ? `${voting.materia.sigla_tipo} ${voting.materia.numero}/${voting.materia.ano}` : "Votação no Plenário";
  return <div className="container detail-page"><Link href="/votacoes" className="back-link"><ArrowLeft /> Todas as votações</Link><LayerBadge type="fato" /><h1>{title}</h1><p className="lead">{voting.descricao}</p>
    {voting.materia && <aside className="matter-context" aria-label="Sobre a matéria"><div><span>Sobre o projeto</span><p>{voting.materia.ementa || "A fonte oficial não forneceu uma ementa para esta matéria."}</p></div>{voting.materia.url && <a href={voting.materia.url} target="_blank" rel="noreferrer">Ver projeto no Senado <ArrowSquareOut /></a>}</aside>}
    <div className="vote-score"><div><strong>{voting.total_sim}</strong><span>Sim</span></div><div><strong>{voting.total_nao}</strong><span>Não</span></div><div><strong>{voting.total_abst}</strong><span>Abstenções</span></div></div>{voting.tipo === "simbolica" ? <div className="notice">Aprovada em votação simbólica, sem registro individual.</div> : <Hemicycle senators={senators} voting={voting} />}<section className="nominal-section"><div className="section-heading"><div><h2>Lista nominal</h2><p>Filtre pelo tipo de voto para localizar rapidamente cada parlamentar.</p></div></div><NominalVoteList votes={voting.votos || []} /></section></div>;
}
