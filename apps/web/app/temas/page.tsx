import Link from "next/link";
import { ArrowRight, ChartBar } from "@phosphor-icons/react/dist/ssr";
import { LayerBadge } from "@/components/LayerBadge";
import { getThemes } from "@/lib/api";

export const metadata = { title: "Temas" };

export default async function ThemesPage() {
  const themes = await getThemes();
  return <div className="container listing-page themes-page">
    <LayerBadge type="editorial" />
    <h1>Temas</h1>
    <p className="lead">Explore as matérias por assunto e veja, em conjunto, como cada tema foi votado no Senado.</p>
    <aside className="coverage-note"><strong>Como os temas são definidos</strong><p>A classificação automática considera termos da ementa oficial. Cada relação mostra sua origem e pode receber revisão editorial sem alterar o texto ou os votos oficiais.</p><Link href="/metodologia">Leia a metodologia</Link></aside>
    <div className="theme-grid">{themes.map((theme, index) => <Link href={`/temas/${theme.slug}`} className="theme-card" key={theme.slug}>
      <div className="theme-card-top"><span>{String(index + 1).padStart(2, "0")}</span><ArrowRight aria-hidden="true" /></div>
      <h2>{theme.nome}</h2><p>{theme.resumo}</p>
      <footer><span>{theme.materias} matérias</span><span><ChartBar aria-hidden="true" /> {theme.votacoes} votações</span></footer>
    </Link>)}</div>
  </div>;
}
