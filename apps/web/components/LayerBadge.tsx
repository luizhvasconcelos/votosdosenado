export function LayerBadge({ type }: { type: "fato" | "metrica" | "editorial" }) {
  const labels = { fato: "Dado oficial", metrica: "Métrica calculada", editorial: "Curadoria editorial" };
  return <span className={`layer-badge ${type}`}>{labels[type]}</span>;
}
