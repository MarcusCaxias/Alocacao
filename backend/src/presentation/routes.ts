import { Router } from 'express';
import { AppService } from '../application/services';
import { authMiddleware } from './authMiddleware';
import * as xlsx from 'xlsx';

export const routes = Router();
const service = new AppService();

// --- Rota de Autenticação ---
routes.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
    }
    const result = await service.login(email, password);
    if (!result) {
      return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
    }
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- Gerenciamento de Usuários (Apenas Admin) ---
routes.get('/users', authMiddleware(['admin']), async (req, res) => {
  try {
    const data = await service.getUsers();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

routes.post('/users', authMiddleware(['admin']), async (req, res) => {
  try {
    const data = await service.createUser(req.body);
    res.json(data);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

routes.put('/users/:id', authMiddleware(['admin']), async (req, res) => {
  try {
    const data = await service.updateUser(req.params.id as string, req.body);
    res.json(data);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

routes.delete('/users/:id', authMiddleware(['admin']), async (req, res) => {
  try {
    await service.deleteUser(req.params.id as string);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// --- Dashboard ---
routes.get('/dashboard', authMiddleware(['admin', 'gestor', 'viewer']), async (req, res) => {
  try {
    const data = await service.getDashboardData();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- Colaboradores ---
routes.get('/colaboradores', authMiddleware(['admin', 'gestor', 'viewer']), async (req, res) => {
  try {
    const role = (req as any).user.role;
    const data = await service.getColaboradores(role);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

routes.post('/colaboradores', authMiddleware(['admin', 'gestor']), async (req, res) => {
  try {
    const data = await service.createColaborador(req.body);
    res.json(data);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

routes.put('/colaboradores/:id', authMiddleware(['admin', 'gestor']), async (req, res) => {
  try {
    const data = await service.updateColaborador(req.params.id as string, req.body);
    res.json(data);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

routes.delete('/colaboradores/:id', authMiddleware(['admin', 'gestor']), async (req, res) => {
  try {
    await service.deleteColaborador(req.params.id as string);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// --- Projetos ---
routes.get('/projetos', authMiddleware(['admin', 'gestor', 'viewer']), async (req, res) => {
  try {
    const data = await service.getProjetos();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

routes.post('/projetos', authMiddleware(['admin', 'gestor']), async (req, res) => {
  try {
    const data = await service.createProjeto(req.body);
    res.json(data);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

routes.put('/projetos/:id', authMiddleware(['admin', 'gestor']), async (req, res) => {
  try {
    const data = await service.updateProjeto(req.params.id as string, req.body);
    res.json(data);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

routes.delete('/projetos/:id', authMiddleware(['admin', 'gestor']), async (req, res) => {
  try {
    await service.deleteProjeto(req.params.id as string);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// --- Alocações ---
routes.get('/alocacoes', authMiddleware(['admin', 'gestor', 'viewer']), async (req, res) => {
  try {
    const data = await service.getAllAlocacoes();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

routes.get('/alocacoes/projeto/:id', authMiddleware(['admin', 'gestor', 'viewer']), async (req, res) => {
  try {
    const data = await service.getAlocacoesPorProjeto(req.params.id as string);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

routes.post('/alocacoes', authMiddleware(['admin', 'gestor']), async (req, res) => {
  try {
    await service.salvarAlocacoes(req.body.alocacoes);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

routes.get('/alocacoes/colaboradores', authMiddleware(['admin', 'gestor', 'viewer']), async (req, res) => {
  try {
    const { inicio, fim } = req.query as { inicio: string, fim: string };
    if (!inicio || !fim) {
      return res.status(400).json({ error: 'Período inicio e fim são obrigatórios (YYYY-MM)'});
    }
    const role = (req as any).user.role;
    const data = await service.getColaboradoresComAlocacoes(inicio, fim, role);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

routes.get('/alocacoes/export', authMiddleware(['admin', 'gestor', 'viewer']), async (req, res) => {
  try {
    const { inicio, fim, nome, tipo, status, vaga, projetos } = req.query as { 
      inicio?: string, 
      fim?: string, 
      nome?: string, 
      tipo?: string, 
      status?: string, 
      vaga?: string, 
      projetos?: string 
    };

    if (!inicio || !fim) {
      return res.status(400).json({ error: 'Período inicio e fim são obrigatórios (YYYY-MM)'});
    }

    const role = (req as any).user.role;
    const data = await service.getColaboradoresComAlocacoes(inicio, fim, role);
    const projetosDb = await service.getProjetos();
    const activeProjects = projetosDb.filter(p => p.nome !== 'RTBA');
    
    let selectedProjectIds: string[] = [];
    if (projetos !== undefined) {
      selectedProjectIds = projetos.split(',').filter(Boolean);
    } else {
      selectedProjectIds = activeProjects.map(p => p.id);
    }

    const allAlocacoes = await service.getAllAlocacoes();

    const filtered = data.filter(c => {
      const matchNome = nome ? (c.nome.toLowerCase().includes(nome.toLowerCase()) || c.cargo.toLowerCase().includes(nome.toLowerCase())) : true;
      const matchTipo = tipo ? c.tipo === tipo : true;
      const matchStatus = status ? c.status === status : true;
      const matchVaga = vaga === 'todas' || !vaga ? true : (vaga === 'apenas_vagas' ? c.is_vaga : !c.is_vaga);
      
      const alocacoesDoColab = allAlocacoes.filter(a => a.colaborador_id === c.id);
      const isDefaultSelection = selectedProjectIds.length === activeProjects.length;
      const matchProjeto = isDefaultSelection || alocacoesDoColab.some(a => 
        selectedProjectIds.includes(a.projeto_id)
      );

      return matchNome && matchTipo && matchStatus && matchVaga && matchProjeto;
    });

    const start = new Date(`${inicio}-01T12:00:00`);
    const end = new Date(`${fim}-01T12:00:00`);
    const meses: string[] = [];
    let current = start;
    while (current <= end) {
      meses.push(current.toISOString().slice(0, 7));
      current.setMonth(current.getMonth() + 1);
    }

    const rows: any[] = [];
    
    filtered.forEach(c => {
      const alocacoesDoColab = allAlocacoes.filter(a => a.colaborador_id === c.id);
      const projsIds = Array.from(new Set(alocacoesDoColab.map(a => a.projeto_id))).filter(id => id !== 'rtba-special-id');
      const projsDoColab = activeProjects.filter(p => projsIds.includes(p.id) && selectedProjectIds.includes(p.id));

      projsDoColab.forEach(p => {
        const row: any = {
          'Projeto': p.nome,
          'Nome do Colaborador': c.nome,
          'Tipo (RHD/RHI)': c.tipo,
          'Cargo': c.cargo,
        };

        meses.forEach(m => {
          const aloc = alocacoesDoColab.find(a => a.ano_mes === m && a.projeto_id === p.id);
          if (aloc && aloc.percentual_alocado > 0) {
            row[m] = `${aloc.percentual_alocado}%`;
          } else {
            row[m] = '';
          }
        });

        rows.push(row);
      });
    });

    const worksheet = xlsx.utils.json_to_sheet(rows);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Alocacoes');

    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Disposition', `attachment; filename=alocacoes_${inicio}_a_${fim}.xlsx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

routes.get('/alocacoes/export-rtba', authMiddleware(['admin', 'gestor', 'viewer']), async (req, res) => {
  try {
    const { inicio, fim, nome, tipo, status } = req.query as { inicio?: string, fim?: string, nome?: string, tipo?: string, status?: string };
    if (!inicio || !fim) {
      return res.status(400).json({ error: 'Período inicio e fim são obrigatórios (YYYY-MM)'});
    }
    const role = (req as any).user.role;
    const data = await service.getColaboradoresComAlocacoes(inicio, fim, role);
    
    const filtered = data.filter(c => {
      const matchNome = nome ? (c.nome.toLowerCase().includes(nome.toLowerCase()) || c.cargo.toLowerCase().includes(nome.toLowerCase())) : true;
      const matchTipo = tipo ? c.tipo === tipo : true;
      const matchStatus = status ? c.status === status : true;
      return matchNome && matchTipo && matchStatus;
    });

    const start = new Date(`${inicio}-01T12:00:00`);
    const end = new Date(`${fim}-01T12:00:00`);
    const meses: string[] = [];
    let current = start;
    while (current <= end) {
      meses.push(current.toISOString().slice(0, 7));
      current.setMonth(current.getMonth() + 1);
    }

    const rows: any[] = [];
    
    filtered.forEach(c => {
      const row: any = {
        Nome: c.nome,
        Tipo: c.tipo,
        Cargo: c.cargo,
        Status: c.status,
      };
      
      let hasAnyRtba = false;

      meses.forEach(m => {
        const alocMes = c.alocacoes_mensais.find(a => a.ano_mes === m);
        const rtbaVal = alocMes ? alocMes.rtba : 100;
        
        if (rtbaVal >= 0.01) {
          row[m] = `${Number(rtbaVal.toFixed(2))}%`;
          hasAnyRtba = true;
        } else {
          row[m] = '';
        }
      });
      
      if (hasAnyRtba) {
        rows.push(row);
      }
    });

    const worksheet = xlsx.utils.json_to_sheet(rows);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'RTBA');

    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Disposition', `attachment; filename=rtba_${inicio}_a_${fim}.xlsx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
