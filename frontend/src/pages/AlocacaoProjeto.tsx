import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { API_URL } from '../config';

interface Projeto { id: string; nome: string; status: string; data_inicio: string; data_fim: string; }
interface Colaborador { id: string; nome: string; tipo: string; cargo: string; is_vaga?: boolean; custo_mensal?: number; }
interface Alocacao { id?: string; projeto_id: string; colaborador_id: string; ano_mes: string; percentual_alocado: number | string; }

const parseNumber = (v: string | number | undefined | null) => {
  if (v === undefined || v === null) return 0;
  if (typeof v === 'number') return v;
  if (typeof v !== 'string') return 0;
  const parsed = parseFloat(v.replace(',', '.'));
  return isNaN(parsed) ? 0 : parsed;
};

export default function AlocacaoProjeto() {
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [alocacoes, setAlocacoes] = useState<Alocacao[]>([]);
  
  const [selectedProjeto, setSelectedProjeto] = useState('');
  const [filtroInicio, setFiltroInicio] = useState('');
  const [filtroFim, setFiltroFim] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroVaga, setFiltroVaga] = useState('todas');
  
  const [meses, setMeses] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const canEdit = user && (user.role === 'admin' || user.role === 'gestor');
  const canSeeCost = user && (user.role === 'admin' || user.role === 'gestor');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [projRes, colabRes] = await Promise.all([
        fetch(`${API_URL}/projetos`),
        fetch(`${API_URL}/colaboradores`)
      ]);
      const p = await projRes.json();
      const c = await colabRes.json();
      setProjetos(p.filter((x: any) => x.nome !== 'RTBA'));
      setColaboradores(c);
    } catch (e) {
      console.error(e);
    }
  };

  const loadAlocacoes = async (projetoId: string) => {
    if (!projetoId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/alocacoes/projeto/${projetoId}`);
      const data = await res.json();
      setAlocacoes(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAlocacoes(selectedProjeto);
    const p = projetos.find(x => x.id === selectedProjeto);
    if (p) {
      setFiltroInicio(new Date().toISOString().slice(0, 7));
      setFiltroFim(p.data_fim.slice(0, 7));
    }
  }, [selectedProjeto, projetos]);

  useEffect(() => {
    if (filtroInicio && filtroFim) {
      const arr = [];
      const [startYear, startMonth] = filtroInicio.split('-').map(Number);
      const [endYear, endMonth] = filtroFim.split('-').map(Number);
      
      let y = startYear;
      let m = startMonth;
      let count = 0;
      
      while ((y < endYear || (y === endYear && m <= endMonth)) && count < 120) {
        arr.push(`${y}-${String(m).padStart(2, '0')}`);
        m++;
        if (m > 12) {
          m = 1;
          y++;
        }
        count++;
      }
      setMeses(arr);
    } else {
      setMeses([]);
    }
  }, [filtroInicio, filtroFim]);

  const handleAlocacaoChange = (colabId: string, mes: string, val: string) => {
    if (!canEdit) return;
    setAlocacoes(prev => {
      const clone = [...prev];
      const index = clone.findIndex(a => a.colaborador_id === colabId && a.ano_mes === mes && a.projeto_id === selectedProjeto);
      if (index > -1) {
        clone[index] = { ...clone[index], percentual_alocado: val };
      } else {
        clone.push({
          projeto_id: selectedProjeto,
          colaborador_id: colabId,
          ano_mes: mes,
          percentual_alocado: val
        });
      }
      return clone;
    });
  };

  const saveAlocacoes = async () => {
    if (!selectedProjeto || !canEdit) return;

    const payload = alocacoes.map(a => ({
      ...a,
      percentual_alocado: parseNumber(a.percentual_alocado)
    }));

    try {
      const res = await fetch(`${API_URL}/alocacoes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alocacoes: payload })
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error);
      }
      alert('Alocações salvas com sucesso!');
      loadAlocacoes(selectedProjeto);
    } catch (e: any) {
      alert(`Erro ao salvar: ${e.message}`);
    }
  };

  const colabsIdsInTable = Array.from(new Set(alocacoes.filter(a => a.projeto_id === selectedProjeto).map(a => a.colaborador_id)));
  const colabsInTable = colaboradores.filter(c => colabsIdsInTable.includes(c.id));
  const filteredColabsInTable = colabsInTable.filter(c => {
    const matchTipo = filtroTipo ? c.tipo === filtroTipo : true;
    const matchVaga = filtroVaga === 'todas' ? true : (filtroVaga === 'apenas_vagas' ? c.is_vaga : !c.is_vaga);
    return matchTipo && matchVaga;
  });

  const addColaboradorRow = (colabId: string) => {
    if (!canEdit) return;
    if (!colabId || colabsIdsInTable.includes(colabId) || meses.length === 0) return;
    setAlocacoes([...alocacoes, {
      projeto_id: selectedProjeto,
      colaborador_id: colabId,
      ano_mes: meses[0],
      percentual_alocado: 0
    }]);
  };

  const projSelecionadoData = projetos.find(p => p.id === selectedProjeto);

  const isOutOfProjectBounds = (mes: string) => {
    if (!projSelecionadoData) return false;
    return mes < projSelecionadoData.data_inicio.slice(0, 7) || mes > projSelecionadoData.data_fim.slice(0, 7);
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-slate-800">Alocação por Projeto</h1>
        {canEdit && (
          <button 
            onClick={saveAlocacoes}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors"
          >
            <Save className="w-5 h-5 mr-2" /> Salvar Alterações
          </button>
        )}
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 mb-6">
        <label className="block text-sm font-medium text-slate-700 mb-2">Selecione o Projeto</label>
        <select 
          className="w-full max-w-md p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
          value={selectedProjeto}
          onChange={e => setSelectedProjeto(e.target.value)}
        >
          <option value="">-- Selecione --</option>
          {projetos.map(p => (
            <option key={p.id} value={p.id}>{p.nome}</option>
          ))}
        </select>
      </div>

      {selectedProjeto && (
        <>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 mb-6 flex flex-wrap gap-4 items-center">
             <span className="text-sm font-semibold text-slate-600">Filtrar Período Visível:</span>
             <input 
               type="month" 
               value={filtroInicio} 
               onChange={e => setFiltroInicio(e.target.value)} 
               className="p-2 border border-slate-200 rounded-lg text-sm" 
             />
             <span className="text-sm text-slate-500">até</span>
             <input 
               type="month" 
               value={filtroFim} 
               onChange={e => setFiltroFim(e.target.value)} 
               className="p-2 border border-slate-200 rounded-lg text-sm" 
             />
             <span className="text-xs text-slate-400 mr-4">(Padrão: duração do projeto)</span>

             <span className="text-sm font-semibold text-slate-600 border-l pl-4 border-slate-200">Filtros:</span>
             <select 
               value={filtroTipo} 
               onChange={e => setFiltroTipo(e.target.value)} 
               className="p-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-700"
             >
               <option value="">Todos os Tipos</option>
               <option value="RHD">RHD</option>
               <option value="RHI">RHI</option>
             </select>
             <select 
               value={filtroVaga} 
               onChange={e => setFiltroVaga(e.target.value)} 
               className="p-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-700"
             >
               <option value="todas">Recursos + Vagas</option>
               <option value="apenas_contratados">Apenas Contratados</option>
               <option value="apenas_vagas">Apenas Vagas</option>
             </select>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            {canEdit && (
              <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center gap-4">
                <span className="text-sm font-semibold text-slate-600">Adicionar Colaborador:</span>
                <select 
                  className="p-2 border border-slate-200 rounded-lg text-sm max-w-xs"
                  onChange={e => addColaboradorRow(e.target.value)}
                  defaultValue=""
                >
                  <option value="" disabled>Selecione um recurso...</option>
                  {colaboradores.filter(c => !colabsIdsInTable.includes(c.id)).map(c => (
                    <option key={c.id} value={c.id}>{c.nome} {c.is_vaga ? '(Vaga)' : ''} - {c.tipo} ({c.cargo})</option>
                  ))}
                </select>
              </div>
            )}

            <div className="overflow-x-auto">
              {loading ? <div className="p-8 text-center text-slate-500">Carregando...</div> : (
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 min-w-[200px]">Colaborador</th>
                      {meses.map(m => (
                        <th key={m} className="px-6 py-4 text-center min-w-[120px]">
                          {m}
                          {isOutOfProjectBounds(m) && <div className="text-[10px] text-rose-500 font-normal">Fora do Prazo</div>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {canSeeCost && filteredColabsInTable.length > 0 && (
                      <tr className="bg-slate-100 border-b-2 border-slate-200 font-bold text-slate-700">
                        <td className="px-6 py-4">Custo Total no Projeto</td>
                        {meses.map(m => {
                          const totalCustoMes = filteredColabsInTable.reduce((sum, c) => {
                            const aloc = alocacoes.find(a => a.colaborador_id === c.id && a.ano_mes === m && a.projeto_id === selectedProjeto);
                            const pct = aloc ? parseNumber(aloc.percentual_alocado) : 0;
                            const custo = c.custo_mensal || 0;
                            return sum + (custo * pct / 100);
                          }, 0);
                          return (
                            <td key={m} className="px-4 py-4 text-center text-slate-800 font-bold">
                              R$ {totalCustoMes.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          );
                        })}
                      </tr>
                    )}
                    {filteredColabsInTable.map(c => (
                      <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-slate-800">
                          {c.nome} 
                          {c.is_vaga && <span className="ml-1 text-[10px] bg-amber-100 text-amber-700 px-1 py-0.5 rounded font-bold uppercase">Vaga</span>}
                          <span className="text-xs ml-2 font-normal px-2 bg-slate-200 rounded-full">{c.tipo}</span>
                          <br/>
                          <span className="text-xs text-slate-400 font-normal">{c.cargo}</span>
                        </td>
                        {meses.map(m => {
                          const aloc = alocacoes.find(a => a.colaborador_id === c.id && a.ano_mes === m && a.projeto_id === selectedProjeto);
                          const val = aloc ? aloc.percentual_alocado : '';
                          const disabled = isOutOfProjectBounds(m);
                          
                          return (
                            <td key={m} className={`px-4 py-4 text-center ${disabled ? 'bg-slate-100/50' : ''}`}>
                              <div className="flex items-center justify-center">
                                <input 
                                  type="text" inputMode="decimal"
                                  value={val}
                                  onChange={e => handleAlocacaoChange(c.id, m, e.target.value)}
                                  disabled={disabled || !canEdit}
                                  className={`w-20 text-center p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 ${disabled || !canEdit ? 'opacity-50 cursor-not-allowed bg-slate-100' : ''}`}
                                />
                                <span className={`ml-1 ${disabled ? 'text-slate-300' : 'text-slate-500'}`}>%</span>
                              </div>
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                    {filteredColabsInTable.length === 0 && (
                      <tr>
                        <td colSpan={meses.length + 1} className="p-8 text-center text-slate-500">
                          Nenhum colaborador encontrado com os filtros selecionados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
