import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { 
  Colaborador, 
  Projeto, 
  Alocacao, 
  User,
  IColaboradorRepository, 
  IProjetoRepository, 
  IAlocacaoRepository, 
  IConfigRepository,
  IUserRepository,
  RTBA_PROJECT_ID
} from '../domain/types';
import dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DATABASE_URL;

export const pool = connectionString 
  ? new Pool({ connectionString })
  : new Pool({
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || 'alocacao'
    });

// Helper functions for parsing Postgres numeric fields and Date fields
const mapColaborador = (row: any): Colaborador => ({
  id: row.id,
  nome: row.nome,
  tipo: row.tipo,
  cargo: row.cargo,
  status: row.status,
  is_vaga: row.is_vaga,
  custo_mensal: row.custo_mensal !== null && row.custo_mensal !== undefined ? parseFloat(row.custo_mensal) : undefined,
  data_criacao: row.data_criacao instanceof Date ? row.data_criacao.toISOString() : row.data_criacao,
  data_atualizacao: row.data_atualizacao instanceof Date ? row.data_atualizacao.toISOString() : row.data_atualizacao
});

const mapProjeto = (row: any): Projeto => ({
  id: row.id,
  nome: row.nome,
  descricao: row.descricao || '',
  data_inicio: row.data_inicio,
  data_fim: row.data_fim,
  status: row.status,
  data_criacao: row.data_criacao instanceof Date ? row.data_criacao.toISOString() : row.data_criacao,
  data_atualizacao: row.data_atualizacao instanceof Date ? row.data_atualizacao.toISOString() : row.data_atualizacao
});

const mapAlocacao = (row: any): Alocacao => ({
  id: row.id,
  projeto_id: row.projeto_id,
  colaborador_id: row.colaborador_id,
  ano_mes: row.ano_mes,
  percentual_alocado: parseFloat(row.percentual_alocado)
});

const mapUser = (row: any): User => ({
  id: row.id,
  name: row.name,
  email: row.email,
  password_hash: row.password_hash,
  role: row.role,
  created_at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at
});

export class PgRepository implements IColaboradorRepository, IProjetoRepository, IAlocacaoRepository, IConfigRepository, IUserRepository {
  
  // --- Colaboradores ---
  async findAll(): Promise<Colaborador[]> {
    const res = await pool.query('SELECT * FROM colaboradores ORDER BY nome ASC');
    return res.rows.map(mapColaborador);
  }

  async findById(id: string): Promise<Colaborador | null> {
    const res = await pool.query('SELECT * FROM colaboradores WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    return mapColaborador(res.rows[0]);
  }

  async create(colaborador: Colaborador): Promise<Colaborador> {
    const newId = colaborador.id || uuidv4();
    const now = new Date().toISOString();
    const res = await pool.query(
      `INSERT INTO colaboradores (id, nome, tipo, cargo, status, is_vaga, custo_mensal, data_criacao, data_atualizacao)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        newId,
        colaborador.nome,
        colaborador.tipo,
        colaborador.cargo,
        colaborador.status,
        colaborador.is_vaga || false,
        colaborador.custo_mensal || 0,
        colaborador.data_criacao || now,
        colaborador.data_atualizacao || now
      ]
    );
    return mapColaborador(res.rows[0]);
  }

  async update(id: string, colaborador: Partial<Colaborador>): Promise<Colaborador> {
    const now = new Date().toISOString();
    const current = await this.findById(id);
    if (!current) throw new Error('Colaborador não encontrado');

    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    const updateableFields = ['nome', 'tipo', 'cargo', 'status', 'is_vaga', 'custo_mensal'];
    
    updateableFields.forEach(field => {
      if ((colaborador as any)[field] !== undefined) {
        fields.push(`${field} = $${idx}`);
        values.push((colaborador as any)[field]);
        idx++;
      }
    });

    fields.push(`data_atualizacao = $${idx}`);
    values.push(now);
    idx++;

    values.push(id);
    const query = `UPDATE colaboradores SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
    
    const res = await pool.query(query, values);
    return mapColaborador(res.rows[0]);
  }

  async delete(id: string): Promise<void> {
    await pool.query('DELETE FROM colaboradores WHERE id = $1', [id]);
  }

  // --- Projetos ---
  async findAllProjetos(): Promise<Projeto[]> {
    const res = await pool.query('SELECT * FROM projetos ORDER BY nome ASC');
    return res.rows.map(mapProjeto);
  }

  async findProjetoById(id: string): Promise<Projeto | null> {
    const res = await pool.query('SELECT * FROM projetos WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    return mapProjeto(res.rows[0]);
  }

  async createProjeto(projeto: Projeto): Promise<Projeto> {
    if (projeto.nome.toUpperCase() === 'RTBA' && projeto.id !== RTBA_PROJECT_ID) {
      throw new Error('O nome RTBA é reservado.');
    }
    const newId = projeto.id || uuidv4();
    const now = new Date().toISOString();
    const res = await pool.query(
      `INSERT INTO projetos (id, nome, descricao, data_inicio, data_fim, status, data_criacao, data_atualizacao)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        newId,
        projeto.nome,
        projeto.descricao || '',
        projeto.data_inicio,
        projeto.data_fim,
        projeto.status,
        projeto.data_criacao || now,
        projeto.data_atualizacao || now
      ]
    );
    return mapProjeto(res.rows[0]);
  }

  async updateProjeto(id: string, projeto: Partial<Projeto>): Promise<Projeto> {
    if (id === RTBA_PROJECT_ID) throw new Error('O projeto RTBA não pode ser modificado.');
    const now = new Date().toISOString();
    const current = await this.findProjetoById(id);
    if (!current) throw new Error('Projeto não encontrado');

    if (projeto.nome && projeto.nome.toUpperCase() === 'RTBA') {
      throw new Error('O nome RTBA é reservado.');
    }

    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    const updateableFields = ['nome', 'descricao', 'data_inicio', 'data_fim', 'status'];
    
    updateableFields.forEach(field => {
      if ((projeto as any)[field] !== undefined) {
        fields.push(`${field} = $${idx}`);
        values.push((projeto as any)[field]);
        idx++;
      }
    });

    fields.push(`data_atualizacao = $${idx}`);
    values.push(now);
    idx++;

    values.push(id);
    const query = `UPDATE projetos SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
    
    const res = await pool.query(query, values);
    return mapProjeto(res.rows[0]);
  }

  async deleteProjeto(id: string): Promise<void> {
    if (id === RTBA_PROJECT_ID) throw new Error('O projeto RTBA não pode ser excluído.');
    await pool.query('DELETE FROM projetos WHERE id = $1', [id]);
  }

  // --- Alocacoes ---
  async findAllAlocacoes(): Promise<Alocacao[]> {
    const res = await pool.query('SELECT * FROM alocacoes');
    return res.rows.map(mapAlocacao);
  }

  async findAlocacaoByColaborador(colaboradorId: string): Promise<Alocacao[]> {
    const res = await pool.query('SELECT * FROM alocacoes WHERE colaborador_id = $1', [colaboradorId]);
    return res.rows.map(mapAlocacao);
  }

  async findAlocacaoByProjeto(projetoId: string): Promise<Alocacao[]> {
    const res = await pool.query('SELECT * FROM alocacoes WHERE projeto_id = $1', [projetoId]);
    return res.rows.map(mapAlocacao);
  }

  async saveManyAlocacoes(alocacoes: Alocacao[]): Promise<void> {
    // We execute this in a transaction for safety
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const incoming of alocacoes) {
        const id = incoming.id || uuidv4();
        await client.query(
          `INSERT INTO alocacoes (id, projeto_id, colaborador_id, ano_mes, percentual_alocado)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (projeto_id, colaborador_id, ano_mes)
           DO UPDATE SET percentual_alocado = EXCLUDED.percentual_alocado`,
          [id, incoming.projeto_id, incoming.colaborador_id, incoming.ano_mes, incoming.percentual_alocado]
        );
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteManyAlocacoes(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await pool.query('DELETE FROM alocacoes WHERE id = ANY($1)', [ids]);
  }

  // --- Config ---
  async getConfig(key: string): Promise<string | null> {
    const res = await pool.query('SELECT valor FROM configuracoes WHERE chave = $1', [key]);
    if (res.rows.length === 0) return null;
    return res.rows[0].valor;
  }

  async setConfig(key: string, value: string): Promise<void> {
    await pool.query(
      `INSERT INTO configuracoes (chave, valor)
       VALUES ($1, $2)
       ON CONFLICT (chave)
       DO UPDATE SET valor = EXCLUDED.valor`,
      [key, value]
    );
  }

  // --- User Repository ---
  async findAllUsers(): Promise<User[]> {
    const res = await pool.query('SELECT * FROM users ORDER BY name ASC');
    return res.rows.map(mapUser);
  }

  async findUserById(id: string): Promise<User | null> {
    const res = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    return mapUser(res.rows[0]);
  }

  async findUserByEmail(email: string): Promise<User | null> {
    const res = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (res.rows.length === 0) return null;
    return mapUser(res.rows[0]);
  }

  async createUser(user: User): Promise<User> {
    const newId = user.id || uuidv4();
    const now = new Date().toISOString();
    const res = await pool.query(
      `INSERT INTO users (id, name, email, password_hash, role, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        newId,
        user.name,
        user.email.toLowerCase().trim(),
        user.password_hash,
        user.role,
        user.created_at || now
      ]
    );
    return mapUser(res.rows[0]);
  }

  async updateUser(id: string, user: Partial<User>): Promise<User> {
    const current = await this.findUserById(id);
    if (!current) throw new Error('Usuário não encontrado');

    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    const updateableFields = ['name', 'email', 'password_hash', 'role'];
    
    updateableFields.forEach(field => {
      if ((user as any)[field] !== undefined) {
        fields.push(`${field} = $${idx}`);
        let val = (user as any)[field];
        if (field === 'email') val = val.toLowerCase().trim();
        values.push(val);
        idx++;
      }
    });

    values.push(id);
    const query = `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
    
    const res = await pool.query(query, values);
    return mapUser(res.rows[0]);
  }

  async deleteUser(id: string): Promise<void> {
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
  }
}
