"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { VoteBadge } from "./VoteBadge";
import { voteLabels } from "@/lib/presentation";
import type { SenatorVote, VoteCategory } from "@/lib/types";

const categoryOrder: VoteCategory[] = ["SIM", "NAO", "ABST", "OBSTRUCAO", "SECRETO", "AUSENTE", "LICENCA", "PRESIDENTE"];

export function VoteTimeline({ votes }: { votes: SenatorVote[] }) {
  const [filter, setFilter] = useState<VoteCategory | "">("");
  const counts = useMemo(() => new Map(categoryOrder.map(category => [category, votes.filter(vote => vote.categoria === category).length])), [votes]);
  const categories = categoryOrder.filter(category => (counts.get(category) || 0) > 0);
  const visible = filter ? votes.filter(vote => vote.categoria === filter) : votes;

  if (!votes.length) return <p className="empty-inline">Nenhum voto nominal importado.</p>;
  return <>
    <div className="vote-filters" role="group" aria-label="Filtrar votos recentes">
      <button type="button" className={!filter ? "is-active" : ""} aria-pressed={!filter} onClick={() => setFilter("")}>Todos <strong>{votes.length}</strong></button>
      {categories.map(category => <button type="button" key={category} className={filter === category ? "is-active" : ""} aria-pressed={filter === category} onClick={() => setFilter(category)}>{voteLabels[category]} <strong>{counts.get(category)}</strong></button>)}
    </div>
    <p className="filtered-count" aria-live="polite">Mostrando {visible.length} de {votes.length} registros</p>
    <div className="timeline">{visible.map(vote => <Link href={`/votacoes/${vote.id}`} className="timeline-row" key={vote.id}><time>{new Date(vote.data_hora).toLocaleDateString("pt-BR")}</time><div><strong>{vote.materia_identificacao || "Votação no Plenário"}</strong><p>{vote.descricao}</p></div><VoteBadge value={vote.categoria} /></Link>)}</div>
  </>;
}
