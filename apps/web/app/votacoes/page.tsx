import Link from "next/link";
import { ArrowSquareOut, MagnifyingGlass, X } from "@phosphor-icons/react/dist/ssr";
import { LayerBadge } from "@/components/LayerBadge";
import { getVotings } from "@/lib/api";

export const metadata = { title: "Votações" };
export default async function VotingsPage({ searchParams }: { searchParams: Promise<{ busca?: string | string[] }> }) {
  const rawQuery = (await searchParams).busca;
  const query = (Array.isArray(rawQuery) ? rawQuery[0] : rawQuery || "").trim().slice(0, 120);
  const votings = await getVotings(query ? 200 : 100, query);
  return <div className="container listing-page"><LayerBadge type="fato" /><h1>Votações nominais</h1><p className="lead">Este projeto independente transforma os registros oficiais do Senado em uma leitura acessível de quem votou, como votou e sobre qual matéria.</p>
    <form className="page-search" role="search" method="get"><label htmlFor="voting-search">Buscar nas votações</label><div><MagnifyingGlass aria-hidden="true" /><input id="voting-search" name="busca" type="search" defaultValue={query} maxLength={120} placeholder="Ex.: educação, imposto, segurança ou PL 123" />{query && <Link href="/votacoes" aria-label="Limpar busca"><X aria-hidden="true" /></Link>}<button type="submit">Buscar</button></div><small>Pesquisa a descrição da votação, identificação e ementa da matéria.</small></form>
    <p className="search-result-count" aria-live="polite">{query ? <>{votings.length} resultado{votings.length === 1 ? "" : "s"} para <strong>“{query}”</strong></> : <>Mostrando as {votings.length} votações mais recentes</>}</p>
    <aside className="coverage-note"><strong>{query ? "Resultado da busca" : "Recorte desta página"}</strong><p>{query ? "A busca percorre toda a base local e mostra até 200 correspondências, das mais recentes para as mais antigas." : "As 100 votações mais recentes da base local. A cobertura reúne votações nominais e secretas de plenário desde 2019; votações simbólicas não têm lista individual."}</p><Link href="/sobre">Conheça o projeto</Link></aside>
    {votings.length ? <div className="card-list">{votings.map(v => <article key={v.id} className="data-card"><Link href={`/votacoes/${v.id}`} className="data-card-main"><small>{new Date(v.data_hora).toLocaleDateString("pt-BR")}</small><h2>{v.materia ? `${v.materia.sigla_tipo} ${v.materia.numero}/${v.materia.ano}` : "Votação no Plenário"}</h2><p>{v.descricao}</p>{v.materia?.ementa && <p className="matter-summary"><strong>Sobre o projeto:</strong> {v.materia.ementa}</p>}</Link><div className="data-card-aside"><div className="score"><span className="sim">{v.total_sim} Sim</span><span className="nao">{v.total_nao} Não</span><span>{v.total_abst} Abst.</span></div>{v.materia?.url && <a className="official-link" href={v.materia.url} target="_blank" rel="noreferrer">Projeto no Senado <ArrowSquareOut /></a>}</div></article>)}</div> : <div className="search-empty"><MagnifyingGlass aria-hidden="true" /><h2>Nenhuma votação encontrada</h2><p>Tente usar menos palavras ou buscar pelo assunto, tipo ou número da matéria.</p><Link className="button ghost" href="/votacoes">Limpar busca</Link></div>}</div>;
}
