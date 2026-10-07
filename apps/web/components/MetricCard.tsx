import { LayerBadge } from "./LayerBadge";

export function MetricCard({ label, value, n }: { label: string; value?: number; n?: number }) {
  const sample = Number.isFinite(n) ? Number(n) : 0;
  const validValue = Number.isFinite(value);
  const insufficient = sample < 10 || !validValue;
  const missing = Math.max(0, 10 - sample);
  return <article className="metric-card"><LayerBadge type="metrica" /><span>{label}</span><strong>{insufficient ? "—" : `${value}%`}</strong><small>{insufficient ? `${sample} de 10 votações comparáveis · faltam ${missing}` : `em ${sample} votações comparáveis`}</small></article>;
}
