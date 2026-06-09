export type TipoColaborador = 'RHD' | 'RHI';
export type Status = 'ativo' | 'inativo';

export interface Colaborador {
  id: string;
  nome: string;
  tipo: TipoColaborador;
  cargo: string;
  status: Status;
  is_vaga?: boolean;
  custo_mensal?: number;
  data_criacao: string;
  data_atualizacao: string;
}

export interface Projeto {
  id: string;
  nome: string;
  descricao: string;
  data_inicio: string;
  data_fim: string;
  status: Status;
  data_criacao: string;
  data_atualizacao: string;
}

export interface Alocacao {
  id: string;
  projeto_id: string;
  colaborador_id: string;
  ano_mes: string; // YYYY-MM
  percentual_alocado: number;
}

export interface AlocacaoAgrupadaMes {
  ano_mes: string;
  projetos: { projeto_id: string; percentual: number }[];
  rtba: number;
  total_alocado: number;
}

export interface ColaboradorComAlocacoes extends Colaborador {
  alocacoes_mensais: AlocacaoAgrupadaMes[];
}

export const RTBA_PROJECT_ID = 'rtba-special-id';

// Interfaces for Repositories
export interface IColaboradorRepository {
  findAll(): Promise<Colaborador[]>;
  findById(id: string): Promise<Colaborador | null>;
  create(colaborador: Colaborador): Promise<Colaborador>;
  update(id: string, colaborador: Partial<Colaborador>): Promise<Colaborador>;
  delete(id: string): Promise<void>;
}

export interface IProjetoRepository {
  findAllProjetos(): Promise<Projeto[]>;
  findProjetoById(id: string): Promise<Projeto | null>;
  createProjeto(projeto: Projeto): Promise<Projeto>;
  updateProjeto(id: string, projeto: Partial<Projeto>): Promise<Projeto>;
  deleteProjeto(id: string): Promise<void>;
}

export interface IAlocacaoRepository {
  findAllAlocacoes(): Promise<Alocacao[]>;
  findAlocacaoByColaborador(colaboradorId: string): Promise<Alocacao[]>;
  findAlocacaoByProjeto(projetoId: string): Promise<Alocacao[]>;
  saveManyAlocacoes(alocacoes: Alocacao[]): Promise<void>;
  deleteManyAlocacoes(ids: string[]): Promise<void>;
}

export interface IConfigRepository {
  getConfig(key: string): Promise<string | null>;
  setConfig(key: string, value: string): Promise<void>;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: 'admin' | 'gestor' | 'viewer';
  created_at: string;
}

export interface IUserRepository {
  findAllUsers(): Promise<User[]>;
  findUserById(id: string): Promise<User | null>;
  findUserByEmail(email: string): Promise<User | null>;
  createUser(user: User): Promise<User>;
  updateUser(id: string, user: Partial<User>): Promise<User>;
  deleteUser(id: string): Promise<void>;
}

