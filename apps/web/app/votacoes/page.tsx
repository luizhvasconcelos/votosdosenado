import Link from "next/link";
import { ArrowSquareOut } from "@phosphor-icons/react/dist/ssr";
import { LayerBadge } from "@/components/LayerBadge";
import { getVotings } from "@/lib/api";

export const metadata = { title: "Votações" };
export default async function VotingsPage() {
  const votings = await getVotings(100);
  return <div className="container listing-page"><LayerBadge type="fato" /><h1>Votações nominais</h1><p className="lead">Este projeto independente transforma os registros oficiais do Senado em uma leitura acessível de quem votou, como votou e sobre qual matéria.</p>
    <aside className="coverage-note"><strong>Recorte desta página</strong><p>As 100 votações mais recentes da base local. A cobertura reúne votações nominais e secretas de plenário desde 2019; votações simbólicas não têm lista individual.</p><Link href="/sobre">Conheça o projeto</Link></aside>
    <div className="card-list">{votings.map(v => <article key={v.id} className="data-card"><Link href={`/votacoes/${v.id}`} className="data-card-main"><small>{new Date(v.data_hora).toLocaleDateString("pt-BR")}</small><h2>{v.materia ? `${v.materia.sigla_tipo} ${v.materia.numero}/${v.materia.ano}` : "Votação no Plenário"}</h2><p>{v.descricao}</p>{v.materia?.ementa && <p className="matter-summary"><strong>Sobre o projeto:</strong> {v.materia.ementa}</p>}</Link><div className="data-card-aside"><div className="score"><span className="sim">{v.total_sim} Sim</span><span className="nao">{v.total_nao} Não</span><span>{v.total_abst} Abst.</span></div>{v.materia?.url && <a className="official-link" href={v.materia.url} target="_blank" rel="noreferrer">Projeto no Senado <ArrowSquareOut /></a>}</div></article>)}</div></div>;
}
