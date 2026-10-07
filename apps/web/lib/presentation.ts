import type { VoteCategory } from "./types";

export const voteLabels: Record<VoteCategory, string> = {
  SIM: "Sim",
  NAO: "Não",
  ABST: "Abstenção",
  OBSTRUCAO: "Obstrução",
  AUSENTE: "Ausente",
  LICENCA: "Licença",
  PRESIDENTE: "Presidente",
  SECRETO: "Voto secreto"
};

export function sampleLabel(n: number): string {
  return n < 10 ? "dados insuficientes" : `em ${n} votações`;
}
