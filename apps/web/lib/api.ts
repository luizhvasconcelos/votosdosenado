import type { Matter, Senator, Voting } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

async function api<T>(path: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(`${API_URL}/api/v1${path}`, { next: { revalidate: 300 } });
    if (!response.ok) return fallback;
    return response.json() as Promise<T>;
  } catch {
    return fallback;
  }
}

export const getSenators = () => api<Senator[]>("/senadores", []);
export const getSenator = (id: string) => api<Senator | null>(`/senadores/${id}`, null);
export const getVotings = (limit = 30) => api<Voting[]>(`/votacoes?limit=${limit}`, []);
export const getVoting = (id: string) => api<Voting | null>(`/votacoes/${id}`, null);
export const getMatters = (limit = 30) => api<Matter[]>(`/materias?limit=${limit}`, []);
export const getMatter = (id: string) => api<Matter | null>(`/materias/${id}`, null);
