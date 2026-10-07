// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ThemeSummary } from "@/lib/types";
import { ThemeDirectory } from "./ThemeDirectory";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a href={String(href)} {...props}>{children}</a>,
}));

afterEach(cleanup);

const themes: ThemeSummary[] = [
  { slug: "educacao", nome: "Educação", resumo: "Ensino, escolas e universidades.", materias: 12, votacoes: 18 },
  { slug: "tributacao", nome: "Tributação", resumo: "Impostos e benefícios fiscais.", materias: 20, votacoes: 24 },
];

describe("ThemeDirectory", () => {
  it("filters theme names and summaries instantly", () => {
    render(<ThemeDirectory themes={themes} />);

    fireEvent.change(screen.getByRole("searchbox", { name: "Buscar temas" }), { target: { value: "universidades" } });

    expect(screen.getByRole("heading", { name: "Educação" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Tributação" })).not.toBeInTheDocument();
    expect(screen.getByText("1 de 2 temas")).toBeInTheDocument();
  });
});
