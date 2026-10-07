"use client";

import Link from "next/link";
import { ArrowSquareOut, Check, X } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import type { AlignmentGroup, AlignmentVote } from "@/lib/types";

const labels = { campo: "Campo", partido: "Partido", bloco: "Bloco" };

export function AlignmentChart({ groups }: { groups: AlignmentGroup[] }) {
  const available = groups.filter(group => group.total > 0);
  const [reference, setReference] = useState<AlignmentGroup["referencia"]>(available[0]?.referencia || "campo");
  const [active, setActive] = useState<AlignmentVote | null>(null);
  const [showAll, setShowAll] = useState(false);
  const group = groups.find(item => item.referencia === reference) || available[0];
  const votes = useMemo(() => group?.votos || [], [group]);
  const displayed = showAll ? votes : votes.slice(0, 160);
  const percentage = group?.total ? Math.round(group.alinhados * 1000 / group.total) / 10 : 0;

  if (!available.length) return <p className="empty-inline">Ainda não há votações comparáveis para montar o histórico de alinhamento.</p>;

  return <div className="alignment-chart">
    <div className="alignment-controls" role="tablist" aria-label="Referência do alinhamento">
      {groups.map(item => <button key={item.referencia} type="button" role="tab" disabled={!item.total} aria-selected={item.referencia === group.referencia} onClick={() => { setReference(item.referencia); setActive(null); setShowAll(false); }}>{labels[item.referencia]} <span>{item.total}</span></button>)}
    </div>
    <div className="alignment-summary"><div><strong>{percentage}%</strong><span>dos votos acompanharam a maioria do {labels[group.referencia].toLocaleLowerCase("pt-BR")}</span></div><div className="alignment-stacked" role="img" aria-label={`${group.alinhados} votos alinhados e ${group.desalinhados} desalinhados`}><i className="aligned" style={{ width: `${percentage}%` }} /><i className="divergent" style={{ width: `${100 - percentage}%` }} /></div><div className="alignment-legend"><span><i className="aligned" /><Check /> Alinhados <strong>{group.alinhados}</strong></span><span><i className="divergent" /><X /> Desalinhados <strong>{group.desalinhados}</strong></span></div></div>
    <div className="alignment-viz">
      {active && <div className="alignment-popover" role="tooltip"><div><span>{active.materia_identificacao || "Votação nominal"}</span><time>{new Date(active.data_hora).toLocaleDateString("pt-BR")}</time></div><strong>{active.alinhado ? "Acompanhou" : "Divergiu da"} maioria</strong><p>Votou {active.voto === "SIM" ? "Sim" : "Não"}; o {labels[group.referencia].toLocaleLowerCase("pt-BR")} votou majoritariamente {active.maioria === "SIM" ? "Sim" : "Não"}.</p><small>{active.descricao} · clique para abrir</small></div>}
      <div className="alignment-vote-grid" aria-label="Histórico de votos comparáveis">{displayed.map(vote => <Link key={vote.votacao_id} href={vote.materia_id ? `/materias/${vote.materia_id}` : `/votacoes/${vote.votacao_id}`} className={vote.alinhado ? "aligned" : "divergent"} aria-label={`${vote.materia_identificacao || "Votação"}: votou ${vote.voto}, ${vote.alinhado ? "alinhado" : "desalinhado"}`} onMouseEnter={() => setActive(vote)} onMouseLeave={() => setActive(null)} onFocus={() => setActive(vote)} onBlur={() => setActive(null)}>{vote.alinhado ? <Check aria-hidden="true" /> : <X aria-hidden="true" />}</Link>)}</div>
    </div>
    {votes.length > 160 && <button className="alignment-more" type="button" onClick={() => setShowAll(value => !value)}>{showAll ? "Mostrar apenas os 160 mais recentes" : `Mostrar todos os ${votes.length} votos`} </button>}
    <p className="chart-help"><ArrowSquareOut aria-hidden="true" /> Passe o cursor ou use Tab para ver o voto. Clique para abrir a matéria.</p>
  </div>;
}
