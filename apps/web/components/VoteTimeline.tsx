"use client";

import Link from "next/link";
import { MagnifyingGlass, X } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { VoteBadge } from "./VoteBadge";
import { voteLabels } from "@/lib/presentation";
import { matchesSearch } from "@/lib/search";
import type { SenatorVote, VoteCategory } from "@/lib/types";

const categoryOrder: VoteCategory[] = ["SIM", "NAO", "ABST", "OBSTRUCAO", "SECRETO", "AUSENTE", "LICENCA", "PRESIDENTE"];

export function VoteTimeline({ votes }: { votes: SenatorVote[] }) {
  const [filter, setFilter] = useState<VoteCategory | "">("");
  const [query, setQuery] = useState("");
  const counts = useMemo(() => new Map(categoryOrder.map(category => [category, votes.filter(vote => vote.categoria === category).length])), [votes]);
  const categories = categoryOrder.filter(category => (counts.get(category) || 0) > 0);
  const visible = useMemo(() => votes.filter(vote => (
    (!filter || vote.categoria === filter)
    && matchesSearch(query, vote.materia_identificacao, vote.descricao, vote.resultado, vote.sigla_original)
  )), [filter, query, votes]);

  if (!votes.length) return <p className="empty-inline">Nenhum voto nominal importado.</p>;
  return <>
    <div className="inline-search vote-search"><label htmlFor="recent-vote-search">Buscar nos votos recentes</label><div><MagnifyingGlass aria-hidden="true" /><input id="recent-vote-search" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Ex.: educação, imposto ou PL 123" />{query && <button type="button" onClick={() => setQuery("")} aria-label="Limpar busca nos votos recentes"><X aria-hidden="true" /></button>}</div><small>Busca por matéria, descrição, resultado e voto.</small></div>
    <div className="vote-filters" role="group" aria-label="Filtrar votos recentes">
      <button type="button" className={!filter ? "is-active" : ""} aria-pressed={!filter} onClick={() => setFilter("")}>Todos <strong>{votes.length}</strong></button>
      {categories.map(category => <button type="button" key={category} className={filter === category ? "is-active" : ""} aria-pressed={filter === category} onClick={() => setFilter(category)}>{voteLabels[category]} <strong>{counts.get(category)}</strong></button>)}
    </div>
    <p className="filtered-count" aria-live="polite">Mostrando {visible.length} de {votes.length} registros</p>
    {visible.length ? <div className="timeline">{visible.map(vote => <Link href={`/votacoes/${vote.id}`} className="timeline-row" key={vote.id}><time>{new Date(vote.data_hora).toLocaleDateString("pt-BR")}</time><div><strong>{vote.materia_identificacao || "Votação no Plenário"}</strong><p>{vote.descricao}</p></div><VoteBadge value={vote.categoria} /></Link>)}</div> : <div className="search-empty compact"><MagnifyingGlass aria-hidden="true" /><h3>Nenhum voto encontrado</h3><p>Tente usar menos palavras ou selecionar outra categoria.</p><button className="button ghost" type="button" onClick={() => { setQuery(""); setFilter(""); }}>Limpar filtros</button></div>}
  </>;
}
