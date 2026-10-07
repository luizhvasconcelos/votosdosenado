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
  participacao?: Participation | null;
  alinhamentos?: AlignmentGroup[];
  atividade?: LegislativeActivity | null;
}

export interface Participation {
  total: number;
  presencas: number;
  sim: number;
  nao: number;
  abstencoes: number;
  obstrucoes: number;
  ausencias: number;
  licencas: number;
  secretos: number;
}

export interface AlignmentVote {
  votacao_id: number;
  data_hora: string;
  voto: "SIM" | "NAO";
  maioria: "SIM" | "NAO";
  alinhado: boolean;
  materia_id: number | null;
  materia_identificacao: string | null;
  descricao: string;
}

export interface AlignmentGroup {
  referencia: "campo" | "partido" | "bloco";
  alinhados: number;
  desalinhados: number;
  total: number;
  votos: AlignmentVote[];
}

export interface ActivityItem {
  codigo: string;
  data: string | null;
  url: string | null;
  identificacao?: string | null;
  ementa?: string | null;
  resumo?: string | null;
}

export interface LegislativeActivity {
  data_ref: string;
  periodo_inicio: string | null;
  autorias_total: number;
  projetos_autoria: number;
  autorias_principais: number;
  relatorias: number;
  discursos: number;
  apartes: number;
  comissoes_ativas: number;
  autorias_recentes: ActivityItem[];
  relatorias_recentes: ActivityItem[];
  discursos_recentes: ActivityItem[];
  comissoes: Array<{ sigla: string | null; nome: string | null; participacao: string | null; inicio: string | null }>;
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
