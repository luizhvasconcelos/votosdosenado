import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { LayerBadge } from "@/components/LayerBadge";
import { ThemeMatterExplorer } from "@/components/ThemeMatterExplorer";
import { getTheme } from "@/lib/api";
import { notFound } from "next/navigation";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const theme = await getTheme((await params).slug);
  return theme ? { title: theme.nome, description: theme.resumo } : { title: "Tema não encontrado" };
}

export default async function ThemePage({ params }: { params: Promise<{ slug: string }> }) {
  const theme = await getTheme((await params).slug);
  if (!theme) notFound();
  const total = theme.totais.total;
  const shares = {
    sim: total ? theme.totais.sim * 100 / total : 0,
    nao: total ? theme.totais.nao * 100 / total : 0,
    abstencoes: total ? theme.totais.abstencoes * 100 / total : 0,
  };
  return <div className="container detail-page theme-detail-page">
    <Link href="/temas" className="back-link"><ArrowLeft /> Todos os temas</Link>
    <LayerBadge type="editorial" /><h1>{theme.nome}</h1><p className="lead">{theme.resumo}</p>
    <section className="theme-overview" aria-labelledby="theme-votes-title">
      <div className="theme-overview-heading"><div><span>Visão agregada</span><h2 id="theme-votes-title">Como o tema foi votado</h2><p>Soma dos votos individuais registrados nas votações nominais relacionadas.</p></div><dl><div><dt>Matérias</dt><dd>{theme.materias}</dd></div><div><dt>Votações</dt><dd>{theme.votacoes}</dd></div></dl></div>
      {total ? <div className="theme-vote-chart">
        <div className="theme-stacked" role="img" aria-label={`${theme.totais.sim} votos Sim, ${theme.totais.nao} votos Não e ${theme.totais.abstencoes} abstenções`}><i className="sim" style={{ width: `${shares.sim}%` }} /><i className="nao" style={{ width: `${shares.nao}%` }} /><i className="abst" style={{ width: `${shares.abstencoes}%` }} /></div>
        <div className="theme-chart-legend"><span><i className="sim" /><strong>{theme.totais.sim.toLocaleString("pt-BR")}</strong> Sim <small>{shares.sim.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%</small></span><span><i className="nao" /><strong>{theme.totais.nao.toLocaleString("pt-BR")}</strong> Não <small>{shares.nao.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%</small></span><span><i className="abst" /><strong>{theme.totais.abstencoes.toLocaleString("pt-BR")}</strong> Abstenções <small>{shares.abstencoes.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%</small></span></div>
      </div> : <p className="empty-inline">Ainda não há votos individuais suficientes para montar o gráfico deste tema.</p>}
    </section>
    <section className="theme-matters"><div className="section-heading"><div><LayerBadge type="fato" /><h2>Matérias e votações relacionadas</h2><p>Abra uma matéria ou votação para consultar o texto e a lista nominal.</p></div></div>
      <ThemeMatterExplorer matters={theme.materias_relacionadas} />
    </section>
  </div>;
}
