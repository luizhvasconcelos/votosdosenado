import Link from "next/link";
export default function NotFound() { return <div className="container empty-state not-found"><h1>Página não encontrada</h1><p>O registro pode ainda não ter sido carregado na base local.</p><Link className="button primary" href="/">Voltar ao plenário</Link></div>; }
