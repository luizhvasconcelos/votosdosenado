"use client";

import Image from "next/image";
import Link from "next/link";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { spectrumLabels, spectrumOf } from "@/lib/hemicycle";
import type { Senator, Spectrum } from "@/lib/types";

type Composition = "atual" | "2027";
type SortMode = "nome" | "partido" | "estado" | "votos";

function normalized(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
}

function latestElection(senator: Senator) {
  return [...(senator.eleicoes || [])].sort((a, b) => b.ano - a.ano)[0];
}

export function SenatorDirectory({ current, future }: { current: Senator[]; future: Senator[] }) {
  const [composition, setComposition] = useState<Composition>("atual");
  const [search, setSearch] = useState("");
  const [party, setParty] = useState("");
  const [state, setState] = useState("");
  const [spectrum, setSpectrum] = useState<Spectrum | "">("");
  const [sort, setSort] = useState<SortMode>("nome");
  const senators = composition === "atual" ? current : future;
  const parties = [...new Set(senators.map(item => item.partido_sigla))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const states = [...new Set(senators.map(item => item.uf))].sort();
  const visible = useMemo(() => senators.filter(senator => {
    const term = normalized(search.trim());
    return (!term || normalized(`${senator.nome_parlamentar} ${senator.partido_sigla} ${senator.uf}`).includes(term))
      && (!party || senator.partido_sigla === party)
      && (!state || senator.uf === state)
      && (!spectrum || spectrumOf(senator) === spectrum);
  }).sort((a, b) => {
    if (sort === "partido") return a.partido_sigla.localeCompare(b.partido_sigla, "pt-BR") || a.nome_parlamentar.localeCompare(b.nome_parlamentar, "pt-BR");
    if (sort === "estado") return a.uf.localeCompare(b.uf) || a.nome_parlamentar.localeCompare(b.nome_parlamentar, "pt-BR");
    if (sort === "votos") return (latestElection(b)?.votos || -1) - (latestElection(a)?.votos || -1);
    return a.nome_parlamentar.localeCompare(b.nome_parlamentar, "pt-BR");
  }), [senators, search, party, state, spectrum, sort]);

  function changeComposition(value: Composition) {
    setComposition(value);
    setParty("");
    setState("");
    setSpectrum("");
  }

  function clearFilters() {
    setSearch(""); setParty(""); setState(""); setSpectrum(""); setSort("nome");
  }

  return <>
    <div className="directory-tabs" role="tablist" aria-label="Composição do Senado">
      <button type="button" role="tab" aria-selected={composition === "atual"} onClick={() => changeComposition("atual")}>Em exercício <span>{current.length}</span></button>
      <button type="button" role="tab" aria-selected={composition === "2027"} onClick={() => changeComposition("2027")}>Composição 2027 <span>{future.length}</span></button>
    </div>
    {composition === "2027" && <p className="directory-context"><strong>Posse em 2027.</strong> Esta visão combina os 27 eleitos em 2022 com os 54 eleitos em 2026. Alterações judiciais e suplências posteriores podem mudar a composição.</p>}
    <div className="directory-toolbar">
      <label className="directory-search" htmlFor="senator-search"><span>Buscar senador</span><div><MagnifyingGlass aria-hidden="true" /><input id="senator-search" type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Nome, partido ou estado" /></div></label>
      <label htmlFor="directory-party">Partido<select id="directory-party" value={party} onChange={event => setParty(event.target.value)}><option value="">Todos</option>{parties.map(item => <option key={item}>{item}</option>)}</select></label>
      <label htmlFor="directory-state">Estado<select id="directory-state" value={state} onChange={event => setState(event.target.value)}><option value="">Todos</option>{states.map(item => <option key={item}>{item}</option>)}</select></label>
      <label htmlFor="directory-spectrum">Espectro<select id="directory-spectrum" value={spectrum} onChange={event => setSpectrum(event.target.value as Spectrum | "")}><option value="">Todos</option><option value="esquerda">Esquerda</option><option value="centro">Centro</option><option value="direita">Direita</option></select></label>
      <label htmlFor="directory-sort">Ordenar por<select id="directory-sort" value={sort} onChange={event => setSort(event.target.value as SortMode)}><option value="nome">Nome</option><option value="partido">Partido</option><option value="estado">Estado</option><option value="votos">Mais votados</option></select></label>
    </div>
    <div className="directory-results"><p aria-live="polite"><strong>{visible.length}</strong> de {senators.length} senadores</p>{(search || party || state || spectrum || sort !== "nome") && <button type="button" onClick={clearFilters}>Limpar filtros</button>}</div>
    {visible.length ? <div className="senator-grid">{visible.map(senator => {
      const election = latestElection(senator);
      const field = spectrumOf(senator);
      return <Link href={`/senadores/${senator.id}`} className="senator-card" key={senator.id} aria-label={`Ver perfil de ${senator.nome_parlamentar}`}>
        <div className="senator-avatar">{senator.foto_url ? <Image src={senator.foto_url} alt={`Foto de ${senator.nome_parlamentar}`} fill sizes="88px" /> : <span aria-hidden="true">{senator.nome_parlamentar.slice(0, 1)}</span>}</div>
        <div className="senator-card-main"><span className={`spectrum-marker ${field}`} /> <small>{senator.partido_sigla} · {senator.uf}</small><h2>{senator.nome_parlamentar}</h2><span className={`spectrum-label ${field}`}>{spectrumLabels[field]}</span></div>
        <div className="senator-election"><strong>{election ? election.votos.toLocaleString("pt-BR") : "—"}</strong><span>{election ? `votos em ${election.ano}` : "votação não disponível"}</span></div>
      </Link>;
    })}</div> : <div className="directory-empty"><MagnifyingGlass size={28} /><h2>Nenhum senador encontrado</h2><p>Tente remover um filtro ou buscar por outro nome, partido ou estado.</p><button type="button" className="button" onClick={clearFilters}>Limpar filtros</button></div>}
  </>;
}
