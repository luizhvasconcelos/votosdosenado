import { ArrowSquareOut } from "@phosphor-icons/react/dist/ssr";
import type { LegislativeActivity, Participation } from "@/lib/types";

function percent(value: number, total: number) {
  return total ? Math.round(value * 1000 / total) / 10 : 0;
}

export function ParliamentaryActivity({ activity, participation }: { activity?: LegislativeActivity | null; participation?: Participation | null }) {
  if (!activity && !participation?.total) return <p className="empty-inline">A atuação legislativa ainda não está disponível para este perfil.</p>;
  const cards = [
    { label: "Participação nominal", value: `${percent(participation?.presencas || 0, participation?.total || 0)}%`, detail: `${participation?.presencas || 0} de ${participation?.total || 0} registros` },
    { label: "Projetos de autoria", value: activity?.projetos_autoria ?? "—", detail: `${activity?.autorias_principais || 0} autorias principais` },
    { label: "Relatorias", value: activity?.relatorias ?? "—", detail: "designações no período" },
    { label: "Falas no Plenário", value: activity ? activity.discursos + activity.apartes : "—", detail: `${activity?.discursos || 0} discursos · ${activity?.apartes || 0} apartes` },
    { label: "Comissões ativas", value: activity?.comissoes_ativas ?? "—", detail: "titularidades e suplências" },
    { label: "Ausências", value: participation?.ausencias ?? "—", detail: `${participation?.licencas || 0} licenças separadas` },
  ];
  return <>
    <div className="activity-kpis">{cards.map(card => <article key={card.label}><span>{card.label}</span><strong>{card.value}</strong><small>{card.detail}</small></article>)}</div>
    {activity && <div className="activity-details">
      <ActivityList title="Projetos recentes" items={activity.autorias_recentes.map(item => ({ title: item.identificacao || "Matéria", description: item.ementa || "", date: item.data, url: item.url }))} />
      <ActivityList title="Relatorias recentes" items={activity.relatorias_recentes.map(item => ({ title: item.identificacao || "Matéria", description: item.ementa || "", date: item.data, url: item.url }))} />
      <ActivityList title="Pronunciamentos recentes" items={activity.discursos_recentes.map(item => ({ title: "Pronunciamento no Plenário", description: item.resumo || "", date: item.data, url: item.url }))} />
      <section className="commission-list"><h3>Comissões atuais <span>{activity.comissoes_ativas}</span></h3>{activity.comissoes.length ? <div>{activity.comissoes.map((item, index) => <span key={`${item.sigla}-${index}`}><strong>{item.sigla || "Comissão"}</strong>{item.participacao}</span>)}</div> : <p>Nenhuma comissão ativa registrada.</p>}</section>
    </div>}
  </>;
}

function ActivityList({ title, items }: { title: string; items: Array<{ title: string; description: string; date: string | null; url: string | null }> }) {
  return <section className="activity-list"><h3>{title} <span>{items.length}</span></h3>{items.length ? <div>{items.slice(0, 6).map((item, index) => {
    const content = <><div><strong>{item.title}</strong><small>{item.date ? new Date(`${item.date}T12:00:00`).toLocaleDateString("pt-BR") : "Data indisponível"}</small></div><p>{item.description}</p>{item.url && <ArrowSquareOut aria-hidden="true" />}</>;
    return item.url
      ? <a key={`${item.url}-${index}`} href={item.url} target="_blank" rel="noreferrer">{content}</a>
      : <article key={`${item.title}-${index}`}>{content}</article>;
  })}</div> : <p>Nenhum registro no período.</p>}</section>;
}
