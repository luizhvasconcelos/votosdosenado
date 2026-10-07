import Link from "next/link";
import { LayerBadge } from "@/components/LayerBadge";
import { getMatters } from "@/lib/api";

export const metadata = { title: "Matérias" };
export default async function MattersPage() {
  const matters = await getMatters(100);
  return <div className="container listing-page"><LayerBadge type="fato" /><h1>Matérias legislativas</h1><p className="lead">Projetos com votação nominal registrada, ligados à tramitação oficial.</p><div className="card-list">{matters.map(m => <Link href={`/materias/${m.id}`} key={m.id} className="data-card"><div><small>{m.ano}</small><h2>{m.sigla_tipo} {m.numero}/{m.ano}</h2><p>{m.ementa}</p></div></Link>)}</div></div>;
}
