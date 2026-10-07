import { describe, expect, it } from "vitest";
import { compareText, getVoteBreakdowns, orderSenators, seatPositions } from "./hemicycle";
import type { Senator, Voting } from "./types";

function senator(id: number, name: string, spectrum: Senator["espectro_partido"], party: string): Senator {
  return {
    id, codigo_senado: String(id), nome_parlamentar: name, uf: "CE",
    partido_sigla: party, bloco: null, foto_url: null, espectro_partido: spectrum,
    espectro_comportamento: null, ativo: true
  };
}

const left = senator(1, "Esquerda", "esquerda", "PT");
const center = senator(2, "Centro", "centro", "MDB");
const right = senator(3, "Direita", "direita", "PL");

describe("hemicycle grouping", () => {
  it("orders left, center and right spatially", () => {
    expect(orderSenators([right, left, center]).map(item => item.id)).toEqual([1, 2, 3]);
  });

  it("uses a deterministic text order independent of server locale", () => {
    expect(["União", "Ágata", "Brasil"].sort(compareText)).toEqual(["Ágata", "Brasil", "União"]);
  });

  it("keeps all 81 seats inside the canvas without overlaps", () => {
    expect(seatPositions).toHaveLength(81);
    for (let first = 0; first < seatPositions.length; first += 1) {
      expect(seatPositions[first].x).toBeGreaterThanOrEqual(25);
      expect(seatPositions[first].x).toBeLessThanOrEqual(615);
      expect(String(seatPositions[first].x).split(".")[1]?.length || 0).toBeLessThanOrEqual(6);
      for (let second = first + 1; second < seatPositions.length; second += 1) {
        const distance = Math.hypot(
          seatPositions[first].x - seatPositions[second].x,
          seatPositions[first].y - seatPositions[second].y
        );
        expect(distance).toBeGreaterThan(25);
      }
    }
  });

  it("calculates vote percentages by spectrum", () => {
    const voting = {
      votos: [
        { senador: left, categoria: "SIM", sigla_original: "Sim" },
        { senador: center, categoria: "NAO", sigla_original: "Não" },
        { senador: right, categoria: "SIM", sigla_original: "Sim" }
      ]
    } as Voting;
    const breakdowns = getVoteBreakdowns([right, left, center], voting, "espectro");
    expect(breakdowns.map(group => group.key)).toEqual(["esquerda", "centro", "direita"]);
    expect(breakdowns[0].categories[0]).toMatchObject({ category: "SIM", percentage: 100 });
  });
});
