import { LayerBadge } from "./LayerBadge";

export function MetricCard({ label, value, n, requirement }: { label: string; value?: number; n?: number; requirement?: string }) {
  const sample = Number.isFinite(n) ? Number(n) : 0;
  const validValue = Number.isFinite(value);
  const insufficient = sample < 10 || !validValue;
  const missing = Math.max(0, 10 - sample);
  const detail = sample > 0
    ? `${sample} de 10 votações comparáveis · faltam ${missing}`
    : requirement || "Ainda não há votações comparáveis";
  return <article className="metric-card"><LayerBadge type="metrica" /><span>{label}</span><strong>{insufficient ? "—" : `${value}%`}</strong><small>{insufficient ? detail : `em ${sample} votações comparáveis`}</small></article>;
}
