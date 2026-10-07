// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CommunityComment } from "@/lib/types";
import { CommentSection } from "./CommentSection";

const comments: CommunityComment[] = [{
  id: 1,
  autor_nome: "Ana",
  corpo: "Comentário principal",
  criado_em: "2026-10-07T10:00:00",
  parent_id: null,
  reacoes: { curtir: 2, aprovar: 1, desaprovar: 0 },
  reacoes_visitante: [],
  respostas: [],
}];

beforeEach(() => {
  localStorage.setItem("votosdosenado-visitor", "visitor-00001");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => comments }));
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
});

describe("CommentSection", () => {
  it("shows reactions and moves focus to a reply with clear context", async () => {
    render(<CommentSection target="senador" targetId={1} initialComments={comments} />);

    expect(screen.getByText("Comentário principal")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Curtir comentário de Ana/i })).toHaveTextContent("2");
    fireEvent.click(screen.getByRole("button", { name: "Responder" }));
    expect(screen.getByText(/Respondendo a/)).toHaveTextContent("Ana");
    expect(screen.getByRole("textbox", { name: /Comentário/ })).toHaveFocus();

    await waitFor(() => expect(fetch).toHaveBeenCalledWith(expect.stringContaining("visitor_id=visitor-00001")));
  });

  it("sends the selected reaction with the anonymous browser identity", async () => {
    const updated = [{ ...comments[0], reacoes: { ...comments[0].reacoes, aprovar: 2 }, reacoes_visitante: ["aprovar" as const] }];
    const mockedFetch = vi.mocked(fetch);
    mockedFetch.mockResolvedValueOnce({ ok: true, json: async () => comments } as Response);
    mockedFetch.mockResolvedValueOnce({ ok: true, json: async () => updated } as Response);
    render(<CommentSection target="votacao" targetId={7} initialComments={comments} />);

    fireEvent.click(screen.getByRole("button", { name: /^Aprovar comentário de Ana/i }));
    await waitFor(() => expect(mockedFetch).toHaveBeenCalledWith(
      "/backend/api/v1/reacoes/comentarios/1",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ visitor_id: "visitor-00001", tipo: "aprovar" }),
      }),
    ));
  });
});
