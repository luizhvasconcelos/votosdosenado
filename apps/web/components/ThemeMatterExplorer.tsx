"use client";

import Link from "next/link";
import { ArrowRight, MagnifyingGlass, X } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { matchesSearch } from "@/lib/search";
import type { ThemedMatter } from "@/lib/types";

export function ThemeMatterExplorer({ matters }: { matters: ThemedMatter[] }) {
  const [query, setQuery] = useState("");
  const visible = useMemo(() => matters.filter(matter => matchesSearch(
    query,
    matter.sigla_tipo,
    matter.numero,
    String(matter.ano),
    matter.ementa,
    ...matter.votacoes.map(voting => voting.descricao),
  )), [matters, query]);

  return <>
    <div className="inline-search"><label htmlFor="theme-matter-search">Buscar neste tema</label><div><MagnifyingGlass aria-hidden="true" /><input id="theme-matter-search" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Digite uma palavra-chave, tipo ou número" />{query && <button type="button" onClick={() => setQuery("")} aria-label="Limpar busca neste tema"><X aria-hidden="true" /></button>}</div><small aria-live="polite">{visible.length} de {matters.length} matérias</small></div>
    {visible.length ? <div className="theme-matter-list">{visible.map(matter => <article key={matter.id}>
      <div className="theme-matter-copy"><div><span>{matter.sigla_tipo} {matter.numero}/{matter.ano}</span><small>Classificação {matter.origem_tema}</small></div><h3><Link href={`/materias/${matter.id}`}>{matter.ementa || "Ementa não informada"}</Link></h3></div>
      {matter.votacoes.length ? <div className="theme-voting-links">{matter.votacoes.map(voting => <Link href={`/votacoes/${voting.id}`} key={voting.id}><span>{new Date(voting.data_hora).toLocaleDateString("pt-BR")}</span><strong>{voting.total_sim} Sim · {voting.total_nao} Não · {voting.total_abst} Abst.</strong><ArrowRight aria-hidden="true" /></Link>)}</div> : <p className="empty-inline">Sem votação nominal relacionada.</p>}
    </article>)}</div> : <div className="search-empty compact"><MagnifyingGlass aria-hidden="true" /><h2>Nenhuma matéria encontrada neste tema</h2><p>Tente usar menos palavras ou buscar pelo tipo e número da matéria.</p><button className="button ghost" type="button" onClick={() => setQuery("")}>Limpar busca</button></div>}
  </>;
}
