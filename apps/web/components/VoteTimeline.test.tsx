// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SenatorVote } from "@/lib/types";
import { VoteTimeline } from "./VoteTimeline";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a href={String(href)} {...props}>{children}</a>,
}));

afterEach(cleanup);

const votes: SenatorVote[] = [
  { id: 1, data_hora: "2026-09-01T14:00:00", descricao: "Programa de educação básica", resultado: "Aprovado", categoria: "SIM", sigla_original: "Sim", materia_id: 10, materia_identificacao: "PL 10/2026" },
  { id: 2, data_hora: "2026-09-02T14:00:00", descricao: "Alteração de imposto", resultado: "Rejeitado", categoria: "NAO", sigla_original: "Não", materia_id: 11, materia_identificacao: "PEC 2/2026" },
];

describe("VoteTimeline", () => {
  it("searches recent votes without requiring accents", () => {
    render(<VoteTimeline votes={votes} />);

    fireEvent.change(screen.getByRole("searchbox", { name: "Buscar nos votos recentes" }), { target: { value: "educacao" } });

    expect(screen.getByText("Programa de educação básica")).toBeInTheDocument();
    expect(screen.queryByText("Alteração de imposto")).not.toBeInTheDocument();
    expect(screen.getByText("Mostrando 1 de 2 registros")).toBeInTheDocument();
  });

  it("combines the keyword query with the vote-category filter", () => {
    render(<VoteTimeline votes={votes} />);

    fireEvent.change(screen.getByRole("searchbox", { name: "Buscar nos votos recentes" }), { target: { value: "educacao" } });
    fireEvent.click(screen.getByRole("button", { name: /Não 1/i }));

    expect(screen.getByText("Nenhum voto encontrado")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));
    expect(screen.getByText("Mostrando 2 de 2 registros")).toBeInTheDocument();
  });
});
