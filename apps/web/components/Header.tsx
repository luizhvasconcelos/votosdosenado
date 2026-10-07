import Link from "next/link";
import { Brand } from "./Brand";

export function Header() {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Brand />
        <nav aria-label="Navegação principal">
          <Link href="/">Plenário</Link>
          <Link href="/votacoes">Votações</Link>
          <Link href="/materias">Matérias</Link>
          <Link href="/temas">Temas</Link>
          <Link href="/metodologia">Metodologia</Link>
        </nav>
      </div>
    </header>
  );
}
