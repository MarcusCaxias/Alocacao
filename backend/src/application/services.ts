import { XlsxRepository } from '../infrastructure/xlsxRepository';
import { validateAlocacoes, calculateRTBA } from '../domain/alocacaoRules';
import { Colaborador, Projeto, Alocacao, ColaboradorComAlocacoes, RTBA_PROJECT_ID } from '../domain/types';

export class AppService {
  private repo: XlsxRepository;

  constructor() {
    this.repo = new XlsxRepository();
  }

  // --- Colaboradores ---
  async getColaboradores(): Promise<Colaborador[]> {
    return this.repo.findAll();
  }

  async getColaboradorById(id: string): Promise<Colaborador | null> {
    return this.repo.findById(id);
  }

  async createColaborador(data: Omit<Colaborador, 'id' | 'data_criacao' | 'data_atualizacao'>): Promise<Colaborador> {
    const colab = {
      ...data,
      id: '', // Will be generated in repo
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

  async getColaboradoresComAlocacoes(mesInicio: string, mesFim: string): Promise<ColaboradorComAlocacoes[]> {
    const colaboradores = await this.repo.findAll();
    const alocacoes = await this.repo.findAllAlocacoes();

    return colaboradores.map(c => {
      const colabAlocs = alocacoes.filter(a => a.colaborador_id === c.id && a.ano_mes >= mesInicio && a.ano_mes <= mesFim);
      
      const meses = new Set<string>();
      colabAlocs.forEach(a => meses.add(a.ano_mes));
      
      // Se não tem alocação no mês X, RTBA é 100%. Devemos gerar todos os meses do período?
      // Por simplicidade, vamos agrupar apenas os meses que têm alocação, 
      // ou gerar a lista de meses entre mesInicio e mesFim.
      
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

      return {
        ...c,
        alocacoes_mensais
      };
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
