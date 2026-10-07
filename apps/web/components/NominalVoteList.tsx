"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { VoteBadge } from "./VoteBadge";
import { voteLabels } from "@/lib/presentation";
import type { VoteCategory, Voting } from "@/lib/types";

type NamedVote = NonNullable<Voting["votos"]>[number];
const categoryOrder: VoteCategory[] = ["SIM", "NAO", "ABST", "OBSTRUCAO", "SECRETO", "AUSENTE", "LICENCA", "PRESIDENTE"];

export function NominalVoteList({ votes }: { votes: NamedVote[] }) {
  const [filter, setFilter] = useState<VoteCategory | "">("");
  const counts = useMemo(() => new Map(categoryOrder.map(category => [category, votes.filter(vote => vote.categoria === category).length])), [votes]);
  const categories = categoryOrder.filter(category => (counts.get(category) || 0) > 0);
  const visible = filter ? votes.filter(vote => vote.categoria === filter) : votes;

  return <>
    <div className="vote-filters" role="group" aria-label="Filtrar lista nominal">
      <button type="button" className={!filter ? "is-active" : ""} aria-pressed={!filter} onClick={() => setFilter("")}>Todos <strong>{votes.length}</strong></button>
      {categories.map(category => <button type="button" key={category} className={filter === category ? "is-active" : ""} aria-pressed={filter === category} onClick={() => setFilter(category)}>{voteLabels[category]} <strong>{counts.get(category)}</strong></button>)}
    </div>
    <p className="filtered-count" aria-live="polite">Mostrando {visible.length} de {votes.length} parlamentares</p>
    <div className="nominal-grid">{visible.map(vote => <Link href={`/senadores/${vote.senador.id}`} key={vote.senador.id}><span>{vote.senador.nome_parlamentar}<small>{vote.senador.partido_sigla}/{vote.senador.uf}</small></span><VoteBadge value={vote.categoria} /></Link>)}</div>
  </>;
}
