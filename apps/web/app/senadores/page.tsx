import { LayerBadge } from "@/components/LayerBadge";
import { SenatorDirectory } from "@/components/SenatorDirectory";
import { getFutureSenators, getSenators } from "@/lib/api";

export const metadata = {
  title: "Senadores",
  description: "Consulte os senadores por nome, partido, estado, espectro político e votação eleitoral."
};

export default async function SenatorsPage() {
  const [current, future] = await Promise.all([getSenators(), getFutureSenators()]);
  return <div className="container listing-page senators-page"><LayerBadge type="fato" /><h1>Senadores</h1><p className="lead">Encontre quem representa cada estado, compare partidos e campos políticos e consulte a votação eleitoral de cada parlamentar.</p><SenatorDirectory current={current} future={future} /></div>;
}
