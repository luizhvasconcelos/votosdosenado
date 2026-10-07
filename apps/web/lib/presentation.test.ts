import { describe, expect, it } from "vitest";
import { sampleLabel, voteLabels } from "./presentation";

describe("presentation labels", () => {
  it("translates canonical votes without losing meaning", () => {
    expect(voteLabels.NAO).toBe("Não");
    expect(voteLabels.SECRETO).toBe("Voto secreto");
  });

  it("hides percentages for small samples", () => {
    expect(sampleLabel(9)).toBe("dados insuficientes");
    expect(sampleLabel(10)).toBe("em 10 votações");
  });
});
