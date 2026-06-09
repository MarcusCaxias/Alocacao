import { PgRepository } from '../infrastructure/pgRepository';
import { validateAlocacoes, calculateRTBA } from '../domain/alocacaoRules';
import { Colaborador, Projeto, Alocacao, ColaboradorComAlocacoes, RTBA_PROJECT_ID, User } from '../domain/types';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-in-production';

export class AppService {
  private repo: PgRepository;

  constructor() {
    this.repo = new PgRepository();
  }

  // --- Autenticação ---
  async login(email: string, passwordPlain: string): Promise<{ token: string, user: Omit<User, 'password_hash'> } | null> {
    const user = await this.repo.findUserByEmail(email);
    if (!user) return null;

    const isValid = await bcrypt.compare(passwordPlain, user.password_hash);
    if (!isValid) return null;

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    const { password_hash, ...userWithoutPassword } = user;
    return { token, user: userWithoutPassword };
  }

  // --- Usuários (Apenas Admin) ---
  async getUsers(): Promise<Omit<User, 'password_hash'>[]> {
    const users = await this.repo.findAllUsers();
    return users.map(u => {
      const { password_hash, ...rest } = u;
      return rest;
    });
  }

  async createUser(data: Omit<User, 'id' | 'created_at'>): Promise<Omit<User, 'password_hash'>> {
    const password_hash = await bcrypt.hash(data.password_hash, 10);
    const user = {
      ...data,
      id: '',
      password_hash,
      created_at: new Date().toISOString()
    } as User;
    const created = await this.repo.createUser(user);
    const { password_hash: _, ...rest } = created;
    return rest;
  }

  async updateUser(id: string, data: Partial<User>): Promise<Omit<User, 'password_hash'>> {
    const updateData = { ...data };
    if (data.password_hash) {
      updateData.password_hash = await bcrypt.hash(data.password_hash, 10);
    }
    const updated = await this.repo.updateUser(id, updateData);
    const { password_hash: _, ...rest } = updated;
    return rest;
  }

  async deleteUser(id: string): Promise<void> {
    return this.repo.deleteUser(id);
  }

  // --- Colaboradores ---
  async getColaboradores(userRole?: string): Promise<Colaborador[]> {
    const list = await this.repo.findAll();
    if (userRole === 'viewer') {
      return list.map(c => {
        const { custo_mensal, ...rest } = c;
        return rest;
      });
    }
    return list;
  }

  async getColaboradorById(id: string, userRole?: string): Promise<Colaborador | null> {
    const colab = await this.repo.findById(id);
    if (colab && userRole === 'viewer') {
      const { custo_mensal, ...rest } = colab;
      return rest;
    }
    return colab;
  }

  async createColaborador(data: Omit<Colaborador, 'id' | 'data_criacao' | 'data_atualizacao'>): Promise<Colaborador> {
    const colab = {
      ...data,
      id: '', 
      data_criacao: new Date().toISOString(),
      data_atualizacao: new Date().toISOString()
    } as Colaborador;
    return this.repo.create(colab);
  }

  async updateColaborador(id: string, data: Partial<Colaborador>): Promise<Colaborador> {
    return this.repo.update(id, data);
  }

  async deleteColaborador(id: string): Promise<void> {
    return this.repo.delete(id);
  }

  // --- Projetos ---
  async getProjetos(): Promise<Projeto[]> {
    return this.repo.findAllProjetos();
  }

  async getProjetoById(id: string): Promise<Projeto | null> {
    return this.repo.findProjetoById(id);
  }

  async createProjeto(data: Omit<Projeto, 'id' | 'data_criacao' | 'data_atualizacao'>): Promise<Projeto> {
    const proj = {
      ...data,
      id: '', 
      data_criacao: new Date().toISOString(),
      data_atualizacao: new Date().toISOString()
    } as Projeto;
    return this.repo.createProjeto(proj);
  }

  async updateProjeto(id: string, data: Partial<Projeto>): Promise<Projeto> {
    return this.repo.updateProjeto(id, data);
  }

  async deleteProjeto(id: string): Promise<void> {
    return this.repo.deleteProjeto(id);
  }

  // --- Alocacoes ---
  async getAllAlocacoes(): Promise<Alocacao[]> {
    return this.repo.findAllAlocacoes();
  }

  async getAlocacoesPorProjeto(projetoId: string): Promise<Alocacao[]> {
    const alocacoes = await this.repo.findAllAlocacoes();
    return alocacoes.filter(a => a.projeto_id === projetoId);
  }

  async salvarAlocacoes(novasAlocacoes: Alocacao[]): Promise<void> {
    const allExisting = await this.repo.findAllAlocacoes();
    const colaboradores = await this.repo.findAll();
    validateAlocacoes(allExisting, novasAlocacoes, colaboradores);
    await this.repo.saveManyAlocacoes(novasAlocacoes);
  }

  async getDashboardData() {
    const colaboradores = await this.repo.findAll();
    const projetos = await this.repo.findAllProjetos();
    const alocacoes = await this.repo.findAllAlocacoes();

    const ativos = colaboradores.filter(c => c.status === 'ativo').length;
    const projetosAtivos = projetos.filter(p => p.status === 'ativo').length;

    // Calcular RTBA atual (mês corrente)
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    let totalRtbaMesCorrente = 0;
    
    colaboradores.forEach(c => {
      const alocs = alocacoes.filter(a => a.colaborador_id === c.id && a.ano_mes === currentMonth);
      totalRtbaMesCorrente += calculateRTBA(alocs);
    });

    return {
      totalColaboradoresAtivos: ativos,
      totalProjetosAtivos: projetosAtivos,
      capacidadeTotalDisponivelCorrente: totalRtbaMesCorrente,
      ocupacaoMediaCorrente: ativos > 0 ? (ativos * 100 - totalRtbaMesCorrente) / ativos : 0
    };
  }

  async getColaboradoresComAlocacoes(mesInicio: string, mesFim: string, userRole?: string): Promise<ColaboradorComAlocacoes[]> {
    const colaboradores = await this.repo.findAll();
    const alocacoes = await this.repo.findAllAlocacoes();

    return colaboradores.map(c => {
      const colabAlocs = alocacoes.filter(a => a.colaborador_id === c.id && a.ano_mes >= mesInicio && a.ano_mes <= mesFim);
      
      const mesesNoIntervalo = this.gerarMeses(mesInicio, mesFim);
      
      const alocacoes_mensais = mesesNoIntervalo.map(mes => {
        const alocsMes = colabAlocs.filter(a => a.ano_mes === mes);
        const projetos = alocsMes.map(a => ({ projeto_id: a.projeto_id, percentual: a.percentual_alocado }));
        const total_alocado = alocsMes.reduce((acc, curr) => acc + curr.percentual_alocado, 0);
        return {
          ano_mes: mes,
          projetos,
          total_alocado,
          rtba: calculateRTBA(alocsMes)
        };
      });

      const mapped = {
        ...c,
        alocacoes_mensais
      } as ColaboradorComAlocacoes;

      if (userRole === 'viewer') {
        delete mapped.custo_mensal;
      }

      return mapped;
    });
  }

  private gerarMeses(start: string, end: string): string[] {
    const result = [];
    const [startYear, startMonth] = start.split('-').map(Number);
    const [endYear, endMonth] = end.split('-').map(Number);
    
    let currentYear = startYear;
    let currentMonth = startMonth;
    
    while (currentYear < endYear || (currentYear === endYear && currentMonth <= endMonth)) {
      const monthStr = String(currentMonth).padStart(2, '0');
      result.push(`${currentYear}-${monthStr}`);
      
      currentMonth++;
      if (currentMonth > 12) {
        currentMonth = 1;
        currentYear++;
      }
    }
    return result;
  }
}
