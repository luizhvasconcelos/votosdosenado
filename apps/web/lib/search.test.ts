import { describe, expect, it } from "vitest";
import { matchesSearch, normalizeSearch } from "./search";

describe("keyword search", () => {
  it("ignores accents and capitalization", () => {
    expect(normalizeSearch("  EDUCAÇÃO Pública  ")).toBe("educacao publica");
    expect(matchesSearch("educacao", "Política de Educação Básica")).toBe(true);
  });

  it("requires every search term but accepts terms from different fields", () => {
    expect(matchesSearch("pl saude", "PL 42/2026", "Amplia serviços de saúde")).toBe(true);
    expect(matchesSearch("pl seguranca", "PL 42/2026", "Amplia serviços de saúde")).toBe(false);
  });
});
