import type { CommunityComment, Matter, Senator, ThemeDetail, ThemeSummary, Voting } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

async function api<T>(path: string, fallback: T, revalidate = 300): Promise<T> {
  try {
    const response = await fetch(
      `${API_URL}/api/v1${path}`,
      revalidate ? { next: { revalidate } } : { cache: "no-store" }
    );
    if (!response.ok) return fallback;
    return response.json() as Promise<T>;
  } catch {
    return fallback;
  }
}

export const getSenators = () => api<Senator[]>("/senadores", []);
export const getFutureSenators = () => api<Senator[]>("/senadores/composicao/2027", []);
export const getSenator = (id: string) => api<Senator | null>(`/senadores/${id}`, null, 0);
export const getVotings = (limit = 30, query = "") => {
  const params = new URLSearchParams({ limit: String(limit) });
  if (query.trim()) params.set("busca", query.trim());
  return api<Voting[]>(`/votacoes?${params}`, []);
};
export const getVoting = (id: string) => api<Voting | null>(`/votacoes/${id}`, null);
export const getMatters = (limit = 30) => api<Matter[]>(`/materias?limit=${limit}`, []);
export const getMatter = (id: string) => api<Matter | null>(`/materias/${id}`, null);
export const getComments = (target: "senador" | "votacao", id: string) => api<CommunityComment[]>(`/comentarios/${target}/${id}`, [], 0);
export const getThemes = () => api<ThemeSummary[]>("/temas", []);
export const getTheme = (slug: string) => api<ThemeDetail | null>(`/temas/${slug}`, null);
