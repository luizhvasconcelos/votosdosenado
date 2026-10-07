"use client";

import Link from "next/link";
import { ArrowRight, ChartBar, MagnifyingGlass, X } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { matchesSearch } from "@/lib/search";
import type { ThemeSummary } from "@/lib/types";

export function ThemeDirectory({ themes }: { themes: ThemeSummary[] }) {
  const [query, setQuery] = useState("");
  const visible = useMemo(() => themes.filter(theme => matchesSearch(query, theme.nome, theme.resumo)), [themes, query]);
  return <>
    <div className="inline-search"><label htmlFor="theme-search">Buscar temas</label><div><MagnifyingGlass aria-hidden="true" /><input id="theme-search" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Ex.: saúde, educação ou impostos" />{query && <button type="button" onClick={() => setQuery("")} aria-label="Limpar busca de temas"><X aria-hidden="true" /></button>}</div><small aria-live="polite">{visible.length} de {themes.length} temas</small></div>
    {visible.length ? <div className="theme-grid">{visible.map(theme => {
      const index = themes.findIndex(item => item.slug === theme.slug);
      return <Link href={`/temas/${theme.slug}`} className="theme-card" key={theme.slug}>
        <div className="theme-card-top"><span>{String(index + 1).padStart(2, "0")}</span><ArrowRight aria-hidden="true" /></div>
        <h2>{theme.nome}</h2><p>{theme.resumo}</p>
        <footer><span>{theme.materias} matérias</span><span><ChartBar aria-hidden="true" /> {theme.votacoes} votações</span></footer>
      </Link>;
    })}</div> : <div className="search-empty compact"><MagnifyingGlass aria-hidden="true" /><h2>Nenhum tema encontrado</h2><p>Tente buscar um assunto mais amplo, como saúde, economia ou direitos.</p><button className="button ghost" type="button" onClick={() => setQuery("")}>Limpar busca</button></div>}
  </>;
}
