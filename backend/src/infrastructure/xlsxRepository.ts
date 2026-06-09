import * as xlsx from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { 
  Colaborador, 
  Projeto, 
  Alocacao, 
  IColaboradorRepository, 
  IProjetoRepository, 
  IAlocacaoRepository, 
  IConfigRepository,
  RTBA_PROJECT_ID
} from '../domain/types';

const DATA_DIR = path.join(__dirname, '../../../data');
const FILE_PATH = path.join(DATA_DIR, 'alocacoes.xlsx');

export class XlsxRepository implements IColaboradorRepository, IProjetoRepository, IAlocacaoRepository, IConfigRepository {
  
  constructor() {
    this.ensureFileExists();
  }

  private ensureFileExists() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    
    if (!fs.existsSync(FILE_PATH)) {
      const wb = xlsx.utils.book_new();
      
      const wsColab = xlsx.utils.json_to_sheet([]);
      xlsx.utils.book_append_sheet(wb, wsColab, 'colaboradores');
      
      const initProjects: Projeto[] = [{
        id: RTBA_PROJECT_ID,
        nome: 'RTBA',
        descricao: 'Resource To Be Allocated',
        data_inicio: new Date().toISOString().split('T')[0],
        data_fim: '2099-12-31',
        status: 'ativo',
        data_criacao: new Date().toISOString(),
        data_atualizacao: new Date().toISOString()
      }];
      const wsProj = xlsx.utils.json_to_sheet(initProjects);
      xlsx.utils.book_append_sheet(wb, wsProj, 'projetos');
      
      const wsAloc = xlsx.utils.json_to_sheet([]);
      xlsx.utils.book_append_sheet(wb, wsAloc, 'alocacoes');
      
      const wsConf = xlsx.utils.json_to_sheet([]);
      xlsx.utils.book_append_sheet(wb, wsConf, 'configuracoes');

      xlsx.writeFile(wb, FILE_PATH);
    }
  }

  private readSheet<T>(sheetName: string): T[] {
    const wb = xlsx.readFile(FILE_PATH);
    const ws = wb.Sheets[sheetName];
    if (!ws) return [];
    return xlsx.utils.sheet_to_json<T>(ws);
  }

  private writeSheet<T>(sheetName: string, data: T[]) {
    const wb = xlsx.readFile(FILE_PATH);
    const newWs = xlsx.utils.json_to_sheet(data);
    wb.Sheets[sheetName] = newWs;
    xlsx.writeFile(wb, FILE_PATH);
  }

  // --- Colaborador ---
  async findAll(): Promise<Colaborador[]> {
    return this.readSheet<Colaborador>('colaboradores');
  }

  async findById(id: string): Promise<Colaborador | null> {
    const all = await this.findAll();
    return all.find(c => c.id === id) || null;
  }

  async create(colaborador: Colaborador): Promise<Colaborador> {
    const all = await this.findAll();
    const newColab = { ...colaborador, id: colaborador.id || uuidv4() };
    all.push(newColab);
    this.writeSheet('colaboradores', all);
    return newColab;
  }

  async update(id: string, colaborador: Partial<Colaborador>): Promise<Colaborador> {
    const all = await this.findAll();
    const index = all.findIndex(c => c.id === id);
    if (index === -1) throw new Error('Colaborador não encontrado');
    
    all[index] = { ...all[index], ...colaborador, data_atualizacao: new Date().toISOString() };
    this.writeSheet('colaboradores', all);
    return all[index];
  }

  async delete(id: string): Promise<void> {
    let all = await this.findAll();
    all = all.filter(c => c.id !== id);
    this.writeSheet('colaboradores', all);
  }

  // --- Projeto ---
  async findAllProjetos(): Promise<Projeto[]> {
    return this.readSheet<Projeto>('projetos');
  }

  async findProjetoById(id: string): Promise<Projeto | null> {
    const all = await this.findAllProjetos();
    return all.find(p => p.id === id) || null;
  }

  async createProjeto(projeto: Projeto): Promise<Projeto> {
    const all = await this.findAllProjetos();
    if (projeto.nome.toUpperCase() === 'RTBA' && projeto.id !== RTBA_PROJECT_ID) {
        throw new Error('O nome RTBA é reservado.');
    }
    const newProj = { ...projeto, id: projeto.id || uuidv4() };
    all.push(newProj);
    this.writeSheet('projetos', all);
    return newProj;
  }

  async updateProjeto(id: string, projeto: Partial<Projeto>): Promise<Projeto> {
    if (id === RTBA_PROJECT_ID) throw new Error('O projeto RTBA não pode ser modificado.');
    const all = await this.findAllProjetos();
    const index = all.findIndex(p => p.id === id);
    if (index === -1) throw new Error('Projeto não encontrado');
    
    if (projeto.nome && projeto.nome.toUpperCase() === 'RTBA') {
        throw new Error('O nome RTBA é reservado.');
    }

    all[index] = { ...all[index], ...projeto, data_atualizacao: new Date().toISOString() };
    this.writeSheet('projetos', all);
    return all[index];
  }

  async deleteProjeto(id: string): Promise<void> {
    if (id === RTBA_PROJECT_ID) throw new Error('O projeto RTBA não pode ser excluído.');
    let all = await this.findAllProjetos();
    all = all.filter(p => p.id !== id);
    this.writeSheet('projetos', all);
  }

  // --- Alocacao ---
  async findAllAlocacoes(): Promise<Alocacao[]> {
    return this.readSheet<Alocacao>('alocacoes');
  }

  async findAlocacaoByColaborador(colaboradorId: string): Promise<Alocacao[]> {
    const all = await this.findAllAlocacoes();
    return all.filter(a => a.colaborador_id === colaboradorId);
  }

  async findAlocacaoByProjeto(projetoId: string): Promise<Alocacao[]> {
    const all = await this.findAllAlocacoes();
    return all.filter(a => a.projeto_id === projetoId);
  }

  async saveManyAlocacoes(alocacoes: Alocacao[]): Promise<void> {
    let all = await this.findAllAlocacoes();
    
    for (const incoming of alocacoes) {
      const existingIndex = all.findIndex(a => 
         (incoming.id && a.id === incoming.id) || 
         (a.projeto_id === incoming.projeto_id && a.colaborador_id === incoming.colaborador_id && a.ano_mes === incoming.ano_mes)
      );
      
      if (existingIndex > -1) {
         all[existingIndex] = { ...all[existingIndex], ...incoming, id: all[existingIndex].id };
      } else {
         all.push({ ...incoming, id: incoming.id || uuidv4() });
      }
    }
    
    this.writeSheet('alocacoes', all);
  }

  async deleteManyAlocacoes(ids: string[]): Promise<void> {
    let all = await this.findAllAlocacoes();
    const idsSet = new Set(ids);
    all = all.filter(a => !idsSet.has(a.id));
    this.writeSheet('alocacoes', all);
  }

  // --- Config ---
  async getConfig(key: string): Promise<string | null> {
    const all = this.readSheet<{chave: string, valor: string}>('configuracoes');
    const conf = all.find(c => c.chave === key);
    return conf ? conf.valor : null;
  }

  async setConfig(key: string, value: string): Promise<void> {
    const all = this.readSheet<{chave: string, valor: string}>('configuracoes');
    const index = all.findIndex(c => c.chave === key);
    if (index > -1) {
      all[index].valor = value;
    } else {
      all.push({ chave: key, valor: value });
    }
    this.writeSheet('configuracoes', all);
  }
}
