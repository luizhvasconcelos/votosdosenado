"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MagnifyingGlass } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { compareText, spectrumLabels, spectrumOf } from "@/lib/hemicycle";
import type { Senator, Spectrum } from "@/lib/types";

type Composition = "atual" | "2027" | "trocas";
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
  const parties = [...new Set(senators.map(item => item.partido_sigla))].sort(compareText);
  const states = [...new Set(senators.map(item => item.uf))].sort();
  const currentIds = useMemo(() => new Set(current.map(item => item.id)), [current]);
  const futureIds = useMemo(() => new Set(future.map(item => item.id)), [future]);
  const outgoing = useMemo(() => current.filter(item => !futureIds.has(item.id)), [current, futureIds]);
  const incoming = useMemo(() => future.filter(item => !currentIds.has(item.id)), [future, currentIds]);
  const changesByState = useMemo(() => [...new Set([...outgoing, ...incoming].map(item => item.uf))]
    .sort(compareText)
    .map(uf => ({
      uf,
      outgoing: outgoing.filter(item => item.uf === uf).sort((a, b) => compareText(a.nome_parlamentar, b.nome_parlamentar)),
      incoming: incoming.filter(item => item.uf === uf).sort((a, b) => compareText(a.nome_parlamentar, b.nome_parlamentar))
    })), [outgoing, incoming]);
  const visible = useMemo(() => senators.filter(senator => {
    const term = normalized(search.trim());
    return (!term || normalized(`${senator.nome_parlamentar} ${senator.partido_sigla} ${senator.uf}`).includes(term))
      && (!party || senator.partido_sigla === party)
      && (!state || senator.uf === state)
      && (!spectrum || spectrumOf(senator) === spectrum);
  }).sort((a, b) => {
    if (sort === "partido") return compareText(a.partido_sigla, b.partido_sigla) || compareText(a.nome_parlamentar, b.nome_parlamentar);
    if (sort === "estado") return compareText(a.uf, b.uf) || compareText(a.nome_parlamentar, b.nome_parlamentar);
    if (sort === "votos") return (latestElection(b)?.votos || -1) - (latestElection(a)?.votos || -1);
    return compareText(a.nome_parlamentar, b.nome_parlamentar);
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
      <button type="button" role="tab" aria-selected={composition === "trocas"} onClick={() => changeComposition("trocas")}>Quem sai e entra <span>{incoming.length}</span></button>
    </div>
    {composition === "2027" && <p className="directory-context"><strong>Posse em 2027.</strong> Esta visão combina os 27 ocupantes dos mandatos que seguem até 2031 com os 54 eleitos em 2026. Renúncias já efetivadas são refletidas; alterações judiciais e suplências posteriores ainda podem mudar a composição.</p>}
    {composition === "trocas" && <>
      <p className="directory-context"><strong>{outgoing.length} {outgoing.length === 1 ? "troca projetada" : "trocas projetadas"}.</strong> A comparação considera quem está em exercício hoje e os titulares eleitos para a legislatura iniciada em 2027. Licenças, decisões judiciais e convocações de suplentes podem alterar a ocupação efetiva.</p>
      <div className="transition-summary" aria-label="Resumo das mudanças"><div><strong>{outgoing.length}</strong><span>deixam a composição</span></div><ArrowRight aria-hidden="true" /><div><strong>{incoming.length}</strong><span>entram na composição</span></div></div>
      <div className="transition-grid">{changesByState.map(group => <section className="transition-state" key={group.uf} aria-labelledby={`change-${group.uf}`}>
        <h2 id={`change-${group.uf}`}>{group.uf}</h2>
        <div className="transition-columns"><div><h3>Quem sai</h3>{group.outgoing.length ? group.outgoing.map(senator => <TransitionPerson key={senator.id} senator={senator} status="out" />) : <p>Sem saída</p>}</div><ArrowRight className="transition-arrow" aria-hidden="true" /><div><h3>Quem entra</h3>{group.incoming.length ? group.incoming.map(senator => <TransitionPerson key={senator.id} senator={senator} status="in" />) : <p>Sem entrada</p>}</div></div>
      </section>)}</div>
    </>}
    {composition !== "trocas" && <>
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
    })}</div> : <div className="directory-empty"><MagnifyingGlass size={28} /><h2>Nenhum senador encontrado</h2><p>Tente remover um filtro ou buscar por outro nome, partido ou estado.</p><button type="button" className="button" onClick={clearFilters}>Limpar filtros</button></div>}</>}
  </>;
}

function TransitionPerson({ senator, status }: { senator: Senator; status: "in" | "out" }) {
  const field = spectrumOf(senator);
  return <Link href={`/senadores/${senator.id}`} className={`transition-person is-${status}`} aria-label={`Ver perfil de ${senator.nome_parlamentar}`}>
    <div className="transition-avatar">{senator.foto_url ? <Image src={senator.foto_url} alt="" fill sizes="52px" /> : <span aria-hidden="true">{senator.nome_parlamentar.slice(0, 1)}</span>}</div>
    <div><strong>{senator.nome_parlamentar}</strong><span><i className={`spectrum-marker ${field}`} />{senator.partido_sigla} · {spectrumLabels[field]}</span></div>
  </Link>;
}
