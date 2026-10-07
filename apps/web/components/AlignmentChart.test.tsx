// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AlignmentGroup } from "@/lib/types";
import { AlignmentChart } from "./AlignmentChart";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a href={String(href)} {...props}>{children}</a>,
}));

afterEach(cleanup);

const groups: AlignmentGroup[] = [
  {
    referencia: "campo",
    alinhados: 1,
    desalinhados: 1,
    total: 2,
    votos: [
      {
        votacao_id: 10,
        data_hora: "2026-09-01T14:00:00",
        voto: "SIM",
        maioria: "SIM",
        alinhado: true,
        materia_id: 99,
        materia_identificacao: "PL 99/2026",
        descricao: "Votação do projeto",
      },
      {
        votacao_id: 11,
        data_hora: "2026-09-02T14:00:00",
        voto: "NAO",
        maioria: "SIM",
        alinhado: false,
        materia_id: null,
        materia_identificacao: null,
        descricao: "Votação sem matéria vinculada",
      },
    ],
  },
  { referencia: "partido", alinhados: 1, desalinhados: 0, total: 1, votos: [] },
  { referencia: "bloco", alinhados: 0, desalinhados: 0, total: 0, votos: [] },
];

describe("AlignmentChart", () => {
  it("shows the ratio, traceable links and vote detail on hover", () => {
    render(<AlignmentChart groups={groups} />);

    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(screen.getByText("Alinhados").parentElement).toHaveTextContent("1");
    expect(screen.getByText("Desalinhados").parentElement).toHaveTextContent("1");

    const alignedVote = screen.getByRole("link", { name: /PL 99\/2026: votou SIM, alinhado/i });
    expect(alignedVote).toHaveAttribute("href", "/materias/99");

    fireEvent.mouseEnter(alignedVote);
    expect(screen.getByRole("tooltip")).toHaveTextContent("Votou Sim");
    expect(screen.getByRole("tooltip")).toHaveTextContent("Acompanhou maioria");

    const divergentVote = screen.getByRole("link", { name: /Votação: votou NAO, desalinhado/i });
    expect(divergentVote).toHaveAttribute("href", "/votacoes/11");
  });

  it("lets keyboard users switch the comparison reference", () => {
    render(<AlignmentChart groups={groups} />);

    fireEvent.click(screen.getByRole("tab", { name: /Partido 1/i }));
    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Partido 1/i })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: /Bloco 0/i })).toBeDisabled();
  });
});
