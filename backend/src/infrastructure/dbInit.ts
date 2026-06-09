import { pool } from './pgRepository';
import bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';
import * as xlsx from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
import { RTBA_PROJECT_ID } from '../domain/types';

export async function initDb() {
  console.log('Inicializando banco de dados...');
  
  // Create tables
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS colaboradores (
      id VARCHAR(255) PRIMARY KEY,
      nome VARCHAR(255) NOT NULL,
      tipo VARCHAR(10) NOT NULL,
      cargo VARCHAR(255) NOT NULL,
      status VARCHAR(20) NOT NULL,
      is_vaga BOOLEAN DEFAULT FALSE,
      custo_mensal NUMERIC(15, 2) DEFAULT 0,
      data_criacao VARCHAR(50) NOT NULL,
      data_atualizacao VARCHAR(50) NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS projetos (
      id VARCHAR(255) PRIMARY KEY,
      nome VARCHAR(255) NOT NULL,
      descricao TEXT,
      data_inicio VARCHAR(10) NOT NULL,
      data_fim VARCHAR(10) NOT NULL,
      status VARCHAR(20) NOT NULL,
      data_criacao VARCHAR(50) NOT NULL,
      data_atualizacao VARCHAR(50) NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS alocacoes (
      id VARCHAR(255) PRIMARY KEY,
      projeto_id VARCHAR(255) NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
      colaborador_id VARCHAR(255) NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
      ano_mes VARCHAR(7) NOT NULL,
      percentual_alocado NUMERIC(5, 2) NOT NULL,
      UNIQUE(projeto_id, colaborador_id, ano_mes)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS configuracoes (
      chave VARCHAR(255) PRIMARY KEY,
      valor TEXT NOT NULL
    );
  `);

  console.log('Tabelas verificadas/criadas.');

  // Create default admin if users table is empty
  const usersCountRes = await pool.query('SELECT COUNT(*) FROM users');
  const usersCount = parseInt(usersCountRes.rows[0].count);
  if (usersCount === 0) {
    const passwordHash = await bcrypt.hash('admin123', 10);
    const adminId = uuidv4();
    await pool.query(`
      INSERT INTO users (id, name, email, password_hash, role, created_at)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [adminId, 'Administrador', 'admin@alocacao.com', passwordHash, 'admin', new Date().toISOString()]);
    console.log('Usuário administrador padrão criado: admin@alocacao.com / admin123');
  }

  // Se a tabela de colaboradores estiver vazia, tentar fazer migração a partir do Excel legada
  const colabCountRes = await pool.query('SELECT COUNT(*) FROM colaboradores');
  const colabCount = parseInt(colabCountRes.rows[0].count);
  
  if (colabCount === 0) {
    const excelPath = path.join(__dirname, '../../../data/alocacoes.xlsx');
    if (fs.existsSync(excelPath)) {
      console.log(`Dados do Excel legados encontrados em ${excelPath}. Iniciando migração para PostgreSQL...`);
      try {
        const wb = xlsx.readFile(excelPath);
        
        // 1. Importar configuracoes
        const wsConf = wb.Sheets['configuracoes'];
        if (wsConf) {
          const configRows = xlsx.utils.sheet_to_json<any>(wsConf);
          for (const row of configRows) {
            await pool.query(
              `INSERT INTO configuracoes (chave, valor) VALUES ($1, $2) ON CONFLICT (chave) DO NOTHING`,
              [row.chave, row.valor]
            );
          }
          console.log(`Migrado(s) ${configRows.length} item(ns) de configuração.`);
        }

        // 2. Importar colaboradores
        const wsColab = wb.Sheets['colaboradores'];
        if (wsColab) {
          const colabRows = xlsx.utils.sheet_to_json<any>(wsColab);
          for (const row of colabRows) {
            await pool.query(
              `INSERT INTO colaboradores (id, nome, tipo, cargo, status, is_vaga, custo_mensal, data_criacao, data_atualizacao)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (id) DO NOTHING`,
              [
                row.id,
                row.nome,
                row.tipo,
                row.cargo,
                row.status,
                row.is_vaga === true || row.is_vaga === 'true' || row.is_vaga === 1,
                parseFloat(row.custo_mensal) || 0,
                row.data_criacao || new Date().toISOString(),
                row.data_atualizacao || new Date().toISOString()
              ]
            );
          }
          console.log(`Migrado(s) ${colabRows.length} colaborador(es).`);
        }

        // 3. Importar projetos
        const wsProj = wb.Sheets['projetos'];
        if (wsProj) {
          const projRows = xlsx.utils.sheet_to_json<any>(wsProj);
          for (const row of projRows) {
            await pool.query(
              `INSERT INTO projetos (id, nome, descricao, data_inicio, data_fim, status, data_criacao, data_atualizacao)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (id) DO NOTHING`,
              [
                row.id,
                row.nome,
                row.descricao || '',
                row.data_inicio,
                row.data_fim,
                row.status,
                row.data_criacao || new Date().toISOString(),
                row.data_atualizacao || new Date().toISOString()
              ]
            );
          }
          console.log(`Migrado(s) ${projRows.length} projeto(s).`);
        } else {
          // Se não há planilha de projetos, assegurar que o RTBA está cadastrado
          await pool.query(
            `INSERT INTO projetos (id, nome, descricao, data_inicio, data_fim, status, data_criacao, data_atualizacao)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (id) DO NOTHING`,
            [
              RTBA_PROJECT_ID,
              'RTBA',
              'Resource To Be Allocated',
              new Date().toISOString().split('T')[0],
              '2099-12-31',
              'ativo',
              new Date().toISOString(),
              new Date().toISOString()
            ]
          );
        }

        // Assegurar de qualquer forma que o projeto RTBA especial existe no banco de dados
        await pool.query(
          `INSERT INTO projetos (id, nome, descricao, data_inicio, data_fim, status, data_criacao, data_atualizacao)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (id) DO NOTHING`,
          [
            RTBA_PROJECT_ID,
            'RTBA',
            'Resource To Be Allocated',
            new Date().toISOString().split('T')[0],
            '2099-12-31',
            'ativo',
            new Date().toISOString(),
            new Date().toISOString()
          ]
        );

        // 4. Importar alocacoes
        const wsAloc = wb.Sheets['alocacoes'];
        if (wsAloc) {
          const alocRows = xlsx.utils.sheet_to_json<any>(wsAloc);
          for (const row of alocRows) {
            // Verificar integridade das chaves estrangeiras
            const pCheck = await pool.query('SELECT 1 FROM projetos WHERE id = $1', [row.projeto_id]);
            const cCheck = await pool.query('SELECT 1 FROM colaboradores WHERE id = $1', [row.colaborador_id]);
            
            if (pCheck.rows.length > 0 && cCheck.rows.length > 0) {
              await pool.query(
                `INSERT INTO alocacoes (id, projeto_id, colaborador_id, ano_mes, percentual_alocado)
                 VALUES ($1, $2, $3, $4, $5) ON CONFLICT (projeto_id, colaborador_id, ano_mes) DO NOTHING`,
                [
                  row.id || uuidv4(),
                  row.projeto_id,
                  row.colaborador_id,
                  row.ano_mes,
                  parseFloat(row.percentual_alocado) || 0
                ]
              );
            }
          }
          console.log(`Migrada(s) ${alocRows.length} alocação(ões).`);
        }
        
        console.log('Migração concluída com sucesso!');
      } catch (err) {
        console.error('Erro durante a migração dos dados do Excel para o PostgreSQL:', err);
      }
    } else {
      // Sem planilha, garante o RTBA padrão
      await pool.query(
        `INSERT INTO projetos (id, nome, descricao, data_inicio, data_fim, status, data_criacao, data_atualizacao)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (id) DO NOTHING`,
        [
          RTBA_PROJECT_ID,
          'RTBA',
          'Resource To Be Allocated',
          new Date().toISOString().split('T')[0],
          '2099-12-31',
          'ativo',
          new Date().toISOString(),
          new Date().toISOString()
        ]
      );
      console.log('RTBA especial criado.');
    }
  }
}
