import type { Senator, Spectrum, VoteCategory, Voting } from "./types";

export type ColorMode = "espectro" | "partido";

export const spectrumColors: Record<Spectrum, string> = {
  esquerda: "#a13d55",
  centro: "#b86b13",
  direita: "#2563a8"
};

export const spectrumLabels: Record<Spectrum, string> = {
  esquerda: "Esquerda",
  centro: "Centro",
  direita: "Direita"
};

export const voteColors: Record<VoteCategory, string> = {
  SIM: "#16805b",
  NAO: "#b7393f",
  ABST: "#bf7416",
  OBSTRUCAO: "#7042a2",
  AUSENTE: "#aeb5bd",
  LICENCA: "#568197",
  PRESIDENTE: "#2f596a",
  SECRETO: "#5f6972"
};

const partyColors: Record<string, string> = {
  AVANTE: "#8a4f16", MDB: "#287c5b", PDT: "#bb3e35", PL: "#215995",
  PODE: "#15788a", PP: "#364f8b", PSB: "#b64d3e", PSD: "#4f7465",
  PSDB: "#2f70b7", PT: "#a92d35", REPUBLICANOS: "#684b91",
  "S/Partido": "#68737a", UNIÃO: "#b46617"
};

const fallbackPartyColors = ["#315e75", "#795b28", "#5f6d3c", "#76509a", "#8b4e62"];

export function partyColor(party: string): string {
  if (partyColors[party]) return partyColors[party];
  const hash = [...party].reduce((total, character) => total + character.charCodeAt(0), 0);
  return fallbackPartyColors[hash % fallbackPartyColors.length];
}

export function spectrumOf(senator: Senator): Spectrum {
  return senator.espectro_comportamento || senator.espectro_partido;
}

export function orderSenators(senators: Senator[]): Senator[] {
  const order: Record<Spectrum, number> = { esquerda: 0, centro: 1, direita: 2 };
  return [...senators].sort((a, b) =>
    order[spectrumOf(a)] - order[spectrumOf(b)] ||
    a.partido_sigla.localeCompare(b.partido_sigla, "pt-BR") ||
    a.nome_parlamentar.localeCompare(b.nome_parlamentar, "pt-BR")
  );
}

export interface SeatPosition { x: number; y: number; rotation: number }

function buildSeatPositions(): SeatPosition[] {
  // Four concentric rows keep a consistent 40px radial gutter. The angular
  // order creates political wedges (left → centre → right) across every row,
  // instead of filling one row at a time.
  const centerX = 320;
  const centerY = 348;
  const rows = [18, 20, 21, 22];
  const radii = [174, 214, 254, 294];
  const start = Math.PI + Math.PI / 12;
  const end = Math.PI * 2 - Math.PI / 12;
  const positions = rows.flatMap((count, row) => Array.from({ length: count }, (_, index) => {
    const angle = start + (index / (count - 1)) * (end - start);
    return {
      x: centerX + Math.cos(angle) * radii[row],
      y: centerY + Math.sin(angle) * radii[row],
      rotation: angle * 180 / Math.PI + 90
    };
  }));
  return positions.sort((a, b) => Math.atan2(a.y - centerY, a.x - centerX) - Math.atan2(b.y - centerY, b.x - centerX) || a.x - b.x);
}

export const seatPositions = buildSeatPositions();

export interface GroupBreakdown {
  key: string;
  label: string;
  color: string;
  total: number;
  categories: Array<{ category: VoteCategory; count: number; percentage: number }>;
}

export function getVoteBreakdowns(
  senators: Senator[], voting: Voting, mode: ColorMode
): GroupBreakdown[] {
  const voteBySenator = new Map(voting.votos?.map(vote => [vote.senador.id, vote.categoria]));
  const groups = new Map<string, Senator[]>();
  for (const senator of senators) {
    const key = mode === "espectro" ? spectrumOf(senator) : senator.partido_sigla;
    groups.set(key, [...(groups.get(key) || []), senator]);
  }
  const spectrumOrder: Record<string, number> = { esquerda: 0, centro: 1, direita: 2 };
  return [...groups.entries()].map(([key, members]) => {
    const counts = new Map<VoteCategory, number>();
    for (const member of members) {
      const category = voteBySenator.get(member.id);
      if (category) counts.set(category, (counts.get(category) || 0) + 1);
    }
    const total = [...counts.values()].reduce((sum, count) => sum + count, 0);
    return {
      key,
      label: mode === "espectro" ? spectrumLabels[key as Spectrum] : key,
      color: mode === "espectro" ? spectrumColors[key as Spectrum] : partyColor(key),
      total,
      categories: [...counts.entries()].map(([category, count]) => ({
        category, count, percentage: total ? Math.round((count * 1000) / total) / 10 : 0
      })).sort((a, b) => b.count - a.count)
    };
  }).filter(group => group.total > 0).sort((a, b) => mode === "espectro"
    ? spectrumOrder[a.key] - spectrumOrder[b.key]
    : a.label.localeCompare(b.label, "pt-BR"));
}
