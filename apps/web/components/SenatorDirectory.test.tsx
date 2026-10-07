// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi } from "vitest";
import type { Senator } from "@/lib/types";
import { SenatorDirectory } from "./SenatorDirectory";

vi.mock("next/image", () => ({ default: ({ alt }: { alt: string }) => <span role="img" aria-label={alt} /> }));
vi.mock("next/link", () => ({ default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a href={String(href)} {...props}>{children}</a> }));

function senator(id: number, name: string, uf: string): Senator {
  return {
    id, codigo_senado: String(id), nome_parlamentar: name, uf,
    partido_sigla: "PT", bloco: null, foto_url: null,
    espectro_partido: "esquerda", espectro_comportamento: null, ativo: true
  };
}

describe("SenatorDirectory", () => {
  it("shows who leaves and enters the 2027 composition", () => {
    const staying = senator(1, "Permanece", "CE");
    render(<SenatorDirectory
      current={[staying, senator(2, "Senador que sai", "SP")]}
      future={[staying, senator(3, "Senadora que entra", "SP")]}
    />);

    fireEvent.click(screen.getByRole("tab", { name: /quem sai e entra/i }));

    expect(screen.getByText("Senador que sai")).toBeInTheDocument();
    expect(screen.getByText("Senadora que entra")).toBeInTheDocument();
    expect(screen.queryByText("Permanece")).not.toBeInTheDocument();
    expect(screen.getByText(/1 troca projetada/i)).toBeInTheDocument();
  });
});
