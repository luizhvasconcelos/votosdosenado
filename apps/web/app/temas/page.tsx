import Link from "next/link";
import { LayerBadge } from "@/components/LayerBadge";
import { ThemeDirectory } from "@/components/ThemeDirectory";
import { getThemes } from "@/lib/api";

export const metadata = { title: "Temas" };

export default async function ThemesPage() {
  const themes = await getThemes();
  return <div className="container listing-page themes-page">
    <LayerBadge type="editorial" />
    <h1>Temas</h1>
    <p className="lead">Explore as matérias por assunto e veja, em conjunto, como cada tema foi votado no Senado.</p>
    <aside className="coverage-note"><strong>Como os temas são definidos</strong><p>A classificação automática considera termos da ementa oficial. Cada relação mostra sua origem e pode receber revisão editorial sem alterar o texto ou os votos oficiais.</p><Link href="/metodologia">Leia a metodologia</Link></aside>
    <ThemeDirectory themes={themes} />
  </div>;
}
