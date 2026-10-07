import { ImageResponse } from "next/og";
import { getSenator } from "@/lib/api";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const senator = await getSenator((await params).id);
  return new ImageResponse(<div style={{ width: "100%", height: "100%", display: "flex", padding: 72, background: "#f4f0e7", color: "#132d35", fontFamily: "sans-serif", flexDirection: "column", justifyContent: "space-between" }}><div style={{ display: "flex", fontSize: 34, fontWeight: 700 }}>votos<span style={{ color: "#b66a16" }}>do</span>senado</div><div style={{ display: "flex", flexDirection: "column" }}><span style={{ color: "#2563a8", fontSize: 24, textTransform: "uppercase", letterSpacing: 3 }}>Perfil parlamentar</span><span style={{ fontSize: 76, fontWeight: 700, marginTop: 16 }}>{senator?.nome_parlamentar || "Senador"}</span><span style={{ fontSize: 36, marginTop: 12 }}>{senator?.partido_sigla} · {senator?.uf}</span></div><span style={{ fontSize: 24 }}>Dados oficiais e métricas abertas</span></div>, size);
}
