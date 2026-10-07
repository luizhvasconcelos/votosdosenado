export type Spectrum = "direita" | "centro" | "esquerda";
export type VoteCategory = "SIM" | "NAO" | "ABST" | "OBSTRUCAO" | "AUSENTE" | "LICENCA" | "PRESIDENTE" | "SECRETO";

export interface Senator {
  id: number;
  codigo_senado: string;
  nome_parlamentar: string;
  nome_civil?: string | null;
  uf: string;
  partido_sigla: string;
  bloco: string | null;
  foto_url: string | null;
  email?: string | null;
  telefone?: string | null;
  espectro_partido: Spectrum;
  espectro_comportamento: Spectrum | null;
  ativo: boolean;
  mandato_inicio?: string | null;
  mandato_fim?: string | null;
  mandato_tipo?: string;
  indices?: IndexSnapshot[];
  votos_recentes?: SenatorVote[];
  mandatos?: Array<{ legislatura: string; inicio: string; fim: string; tipo: string; participacao: string | null }>;
  filiacoes?: Array<{ partido_sigla: string; inicio: string; fim: string | null }>;
  eleicoes?: Array<{ ano: number; uf: string; votos: number; pct_validos: number | null; posicao: number | null; eleito: boolean }>;
}

export interface Matter {
  id: number;
  codigo_senado: string;
  sigla_tipo: string;
  numero: string;
  ano: number;
  ementa: string;
  url: string | null;
  votacoes?: Voting[];
}

export interface Voting {
  id: number;
  codigo_senado: string;
  data_hora: string;
  descricao: string;
  tipo: "nominal" | "simbolica" | "secreta";
  resultado: string | null;
  total_sim: number;
  total_nao: number;
  total_abst: number;
  materia: Matter | null;
  votos?: Array<{ senador: Senator; categoria: VoteCategory; sigla_original: string }>;
}

export interface IndexSnapshot { tipo: string; valor: number; n: number; data_ref: string }

export interface SenatorVote {
  id: number;
  data_hora: string;
  descricao: string;
  resultado: string | null;
  categoria: VoteCategory;
  sigla_original: string;
  materia_id: number | null;
  materia_identificacao: string | null;
}
