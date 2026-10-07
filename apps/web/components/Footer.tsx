import Link from "next/link";
import { Brand } from "./Brand";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div><Brand /><p>Transparência para acompanhar quem representa você.</p></div>
        <div><strong>Projeto</strong><Link href="/sobre">Sobre</Link><Link href="/metodologia">Metodologia</Link></div>
        <div><strong>Fontes</strong><a href="https://legis.senado.leg.br/dadosabertos/" target="_blank" rel="noreferrer">Dados Abertos do Senado</a></div>
      </div>
      <p className="independence">Projeto independente, sem vínculo com o Senado Federal. Dados obtidos das APIs públicas oficiais.</p>
    </footer>
  );
}
