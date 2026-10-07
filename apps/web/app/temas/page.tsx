import { LayerBadge } from "@/components/LayerBadge";

const themes = ["Segurança pública", "Tributação", "STF e Judiciário", "Agro", "Costumes", "Economia", "Educação", "Saúde", "Meio ambiente"];
export const metadata = { title: "Temas" };
export default function ThemesPage() { return <div className="container listing-page"><LayerBadge type="editorial" /><h1>Temas</h1><p className="lead">A classificação temática combina os assuntos oficiais da matéria com revisão editorial. A origem ficará visível em cada item.</p><div className="theme-grid">{themes.map((theme, i) => <article key={theme}><span>{String(i + 1).padStart(2, "0")}</span><h2>{theme}</h2><p>A classificação automática será preenchida após a carga completa das matérias.</p></article>)}</div></div>; }
