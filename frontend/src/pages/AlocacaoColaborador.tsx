import { useState, useEffect, Fragment, useRef } from 'react';
import { Layers, Save, ChevronDown, ChevronRight, Plus, Search, Download } from 'lucide-react';
import { API_URL } from '../config';

interface Projeto { id: string; nome: string; status: string; data_inicio: string; data_fim: string; }
interface Colaborador { id: string; nome: string; tipo: string; cargo: string; status: string; is_vaga?: boolean; custo_mensal?: number; }
interface Alocacao { id?: string; projeto_id: string; colaborador_id: string; ano_mes: string; percentual_alocado: number | string; }

export default function AlocacaoColaborador() {
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [alocacoes, setAlocacoes] = useState<Alocacao[]>([]);
  
  const [meses, setMeses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const [filtroNome, setFiltroNome] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('ativo');
  const [filtroVaga, setFiltroVaga] = useState('todas');
  const [filtroProjetos, setFiltroProjetos] = useState<string[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  
  const isProjectsFilterInitialized = useRef(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const [filtroInicio, setFiltroInicio] = useState('');
  const [filtroFim, setFiltroFim] = useState('');

  const [expandedCols, setExpandedCols] = useState<Set<string>>(new Set());

  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const canEdit = user && (user.role === 'admin' || user.role === 'gestor');

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    // defaults
    const d = new Date();
    const start = d.toISOString().slice(0, 7);
    const end = new Date(d.getFullYear(), d.getMonth() + 5, 1).toISOString().slice(0, 7);
    setFiltroInicio(start);
    setFiltroFim(end);
    fetchData();
  }, []);

  useEffect(() => {
    if (filtroInicio && filtroFim) {
      const arr = [];
      const [startYear, startMonth] = filtroInicio.split('-').map(Number);
      const [endYear, endMonth] = filtroFim.split('-').map(Number);
      
      let y = startYear;
      let m = startMonth;
      let count = 0;
      
      while ((y < endYear || (y === endYear && m <= endMonth)) && count < 60) {
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

  const fetchData = async () => {
    setLoading(true);
    try {
      const [projRes, colabRes, alocRes] = await Promise.all([
        fetch(`${API_URL}/projetos`),
        fetch(`${API_URL}/colaboradores`),
        fetch(`${API_URL}/alocacoes`)
      ]);
      const p = await projRes.json();
      const c = await colabRes.json();
      const a = await alocRes.json();
      
      setProjetos(p);
      setColaboradores(c);
      setAlocacoes(a);

      const activeProjs = p.filter((x: any) => x.nome !== 'RTBA').map((x: any) => x.id);
      if (!isProjectsFilterInitialized.current) {
        setFiltroProjetos(activeProjs);
        isProjectsFilterInitialized.current = true;
      } else {
        setFiltroProjetos(prev => prev.filter(id => activeProjs.includes(id)));
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const toggleExpand = (id: string) => {
    const next = new Set(expandedCols);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedCols(next);
  };

  const handleAlocacaoChange = (colabId: string, projId: string, mes: string, val: string) => {
    if (!canEdit) return;
    setAlocacoes(prev => {
      const clone = [...prev];
      const index = clone.findIndex(a => a.colaborador_id === colabId && a.ano_mes === mes && a.projeto_id === projId);
      if (index > -1) {
        clone[index] = { ...clone[index], percentual_alocado: val };
      } else {
        clone.push({
          projeto_id: projId,
          colaborador_id: colabId,
          ano_mes: mes,
          percentual_alocado: val
        });
      }
      return clone;
    });
  };

  const parseNumber = (v: any) => {
    if (v === undefined || v === null) return 0;
    if (typeof v === 'number') return v;
    if (typeof v !== 'string') return 0;
    const parsed = parseFloat(v.replace(',', '.'));
    return isNaN(parsed) ? 0 : parsed;
  };

  const saveAlocacoes = async () => {
    if (!canEdit) return;
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
      fetchData();
    } catch (e: any) {
      alert(`Erro ao salvar: ${e.message}`);
    }
  };

  const exportRTBA = async () => {
    try {
      const query = new URLSearchParams({
        inicio: filtroInicio,
        fim: filtroFim,
        nome: filtroNome,
        tipo: filtroTipo,
        status: filtroStatus
      }).toString();

      const url = `${API_URL}/alocacoes/export-rtba?${query}`;
      window.open(url, '_blank');
    } catch (error) {
      console.error("Erro ao exportar", error);
      alert('Erro ao exportar RTBA');
    }
  };

  const exportAlocacoes = async () => {
    try {
      const query = new URLSearchParams({
        inicio: filtroInicio,
        fim: filtroFim,
        nome: filtroNome,
        tipo: filtroTipo,
        status: filtroStatus,
        vaga: filtroVaga,
        projetos: filtroProjetos.join(',')
      }).toString();

      const url = `${API_URL}/alocacoes/export?${query}`;
      window.open(url, '_blank');
    } catch (error) {
      console.error("Erro ao exportar alocações", error);
      alert('Erro ao exportar alocações');
    }
  };

  const addProjetoToColaborador = (colabId: string, projId: string) => {
    if (!canEdit) return;
    if (!projId || meses.length === 0) return;
    setAlocacoes([...alocacoes, {
      projeto_id: projId,
      colaborador_id: colabId,
      ano_mes: meses[0],
      percentual_alocado: 0
    }]);
  };

  const getTotals = (colabId: string, mes: string) => {
    const alocs = alocacoes.filter(a => a.colaborador_id === colabId && a.ano_mes === mes && a.projeto_id !== 'rtba-special-id');
    const total = alocs.reduce((sum, a) => sum + parseNumber(a.percentual_alocado), 0);
    const rtba = 100 - total;
    return { 
      total: Number(total.toFixed(2)), 
      rtba: rtba < 0 ? 0 : Number(rtba.toFixed(2)) 
    };
  };

  const getStatusColor = (total: number) => {
    if (total === 100) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (total === 0) return 'bg-rose-100 text-rose-800 border-rose-200';
    return 'bg-amber-100 text-amber-800 border-amber-200';
  };

  const filteredColabs = colaboradores.filter(c => {
    const matchNome = c.nome.toLowerCase().includes(filtroNome.toLowerCase()) || c.cargo.toLowerCase().includes(filtroNome.toLowerCase());
    const matchTipo = filtroTipo ? c.tipo === filtroTipo : true;
    const matchStatus = filtroStatus ? c.status === filtroStatus : true;
    const matchVaga = filtroVaga === 'todas' ? true : (filtroVaga === 'apenas_vagas' ? c.is_vaga : !c.is_vaga);
    
    const alocacoesDoColab = alocacoes.filter(a => a.colaborador_id === c.id);
    const activeProjects = projetos.filter(p => p.nome !== 'RTBA').map(p => p.id);
    const isDefaultSelection = filtroProjetos.length === activeProjects.length;
    const matchProjeto = isDefaultSelection || alocacoesDoColab.some(a => 
      filtroProjetos.includes(a.projeto_id)
    );

    return matchNome && matchTipo && matchStatus && matchVaga && matchProjeto;
  });

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Layers className="w-8 h-8 text-indigo-600 mr-4" />
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Alocação por Colaborador</h1>
            <p className="text-slate-500">Expanda os colaboradores para editar as alocações nos projetos.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={exportAlocacoes}
            className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors shadow-sm"
          >
            <Download className="w-5 h-5 mr-2" /> Exportar Alocações
          </button>
          <button 
            onClick={exportRTBA}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors shadow-sm"
          >
            <Download className="w-5 h-5 mr-2" /> Exportar RTBA
          </button>
          {canEdit && (
            <button 
              onClick={saveAlocacoes}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors shadow-sm"
            >
              <Save className="w-5 h-5 mr-2" /> Salvar Alterações Globais
            </button>
          )}
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 mb-6 flex flex-wrap gap-4 items-center">
        <span className="text-sm font-semibold text-slate-600">Filtros:</span>
        <div className="relative w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Nome ou Cargo" 
            value={filtroNome} 
            onChange={e => setFiltroNome(e.target.value)} 
            className="w-full pl-9 pr-2 py-2 border border-slate-200 rounded-lg text-sm" 
          />
        </div>
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} className="p-2 border border-slate-200 rounded-lg text-sm">
          <option value="">Todos os Tipos</option>
          <option value="RHD">RHD</option>
          <option value="RHI">RHI</option>
        </select>
        <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} className="p-2 border border-slate-200 rounded-lg text-sm">
          <option value="">Todos os Status</option>
          <option value="ativo">Ativo</option>
          <option value="inativo">Inativo</option>
        </select>
        <select value={filtroVaga} onChange={e => setFiltroVaga(e.target.value)} className="p-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-700">
          <option value="todas">Recursos + Vagas</option>
          <option value="apenas_contratados">Apenas Contratados</option>
          <option value="apenas_vagas">Apenas Vagas</option>
        </select>
        
        <div ref={dropdownRef} className="relative">
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="p-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-700 flex items-center justify-between gap-2 cursor-pointer hover:bg-slate-50 transition-colors duration-150 shadow-sm min-w-[160px] max-w-[240px] select-none"
          >
            <span className="truncate">
              {(() => {
                const activeProjsCount = projetos.filter(p => p.nome !== 'RTBA').length;
                if (filtroProjetos.length === activeProjsCount) {
                  return 'Todos os Projetos';
                }
                if (filtroProjetos.length === 0) {
                  return 'Nenhum Projeto';
                }
                return `${filtroProjetos.length} de ${activeProjsCount} Selecionados`;
              })()}
            </span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {dropdownOpen && (
            <div className="absolute left-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl p-3 z-50 flex flex-col gap-2 max-h-80 overflow-y-auto">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 mb-1">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Filtrar Projetos</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const allIds = projetos.filter(p => p.nome !== 'RTBA').map(p => p.id);
                      setFiltroProjetos(allIds);
                    }}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold hover:underline cursor-pointer"
                  >
                    Todos
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltroProjetos([])}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold hover:underline cursor-pointer"
                  >
                    Nenhum
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-1 overflow-y-auto pr-1">
                {projetos.filter(p => p.nome !== 'RTBA').map(p => {
                  const isSelected = filtroProjetos.includes(p.id);
                  return (
                    <label
                      key={p.id}
                      className="flex items-center gap-2.5 p-2 hover:bg-slate-50 rounded-lg cursor-pointer text-sm text-slate-700 select-none transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {
                          if (isSelected) {
                            setFiltroProjetos(filtroProjetos.filter(id => id !== p.id));
                          } else {
                            setFiltroProjetos([...filtroProjetos, p.id]);
                          }
                        }}
                        className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                      />
                      <span className="truncate font-medium">{p.nome}</span>
                    </label>
                  );
                })}
                {projetos.filter(p => p.nome !== 'RTBA').length === 0 && (
                  <div className="text-center text-xs text-slate-400 py-4">Nenhum projeto cadastrado</div>
                )}
              </div>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2 ml-auto border-l pl-4 border-slate-200">
          <span className="text-sm font-semibold text-slate-600">Período:</span>
          <input type="month" value={filtroInicio} onChange={e => setFiltroInicio(e.target.value)} className="p-2 border border-slate-200 rounded-lg text-sm" />
          <span className="text-sm text-slate-500">até</span>
          <input type="month" value={filtroFim} onChange={e => setFiltroFim(e.target.value)} className="p-2 border border-slate-200 rounded-lg text-sm" />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? <div className="p-8 text-center text-slate-500">Carregando dados globais...</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 border-collapse">
              <thead className="bg-slate-50 text-slate-700 font-semibold">
                <tr>
                  <th className="px-6 py-4 border-b border-r border-slate-200 min-w-[250px]">Colaborador / Projetos</th>
                  {meses.map(m => (
                    <th key={m} className="px-6 py-4 text-center border-b border-slate-200 min-w-[120px]">{m}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredColabs.map(c => {
                  const isExpanded = expandedCols.has(c.id);
                  const alocacoesDoColab = alocacoes.filter(a => a.colaborador_id === c.id);
                  
                  const projsIds = Array.from(new Set(alocacoesDoColab.map(a => a.projeto_id))).filter(id => id !== 'rtba-special-id');
                  const projsDoColab = projetos.filter(p => projsIds.includes(p.id) && filtroProjetos.includes(p.id));

                  return (
                    <Fragment key={c.id}>
                      {/* Linha Consolidada */}
                      <tr className={`border-b border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer ${isExpanded ? 'bg-slate-50' : ''}`} onClick={() => toggleExpand(c.id)}>
                        <td className="px-4 py-4 border-r border-slate-200">
                          <div className="flex items-center">
                            <button className="p-1 mr-2 text-slate-400 hover:bg-slate-200 rounded">
                              {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                            </button>
                            <div>
                              <p className="font-bold text-slate-800">
                                {c.nome} 
                                {c.is_vaga && <span className="ml-2 px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded uppercase">Vaga</span>}
                                <span className="text-xs ml-2 font-normal px-2 bg-slate-200 rounded-full">{c.tipo}</span>
                              </p>
                              <p className="text-xs text-slate-500">{c.cargo}</p>
                            </div>
                          </div>
                        </td>
                        {meses.map(m => {
                          const { total } = getTotals(c.id, m);
                          return (
                            <td key={m} className="p-2 align-middle border-slate-200 text-center">
                              <div className={`py-2 px-3 inline-block rounded-lg border ${getStatusColor(total)}`}>
                                <span className="font-black text-base">{total}%</span>
                                <span className="text-[10px] block font-semibold uppercase tracking-wider opacity-70">Total Alocado</span>
                              </div>
                            </td>
                          )
                        })}
                      </tr>

                      {/* Linhas Expandidas (Projetos) */}
                      {isExpanded && (
                        <>
                          {projsDoColab.map(p => (
                            <tr key={`${c.id}-${p.id}`} className="bg-slate-50/30 border-b border-slate-100">
                              <td className="px-6 py-3 border-r border-slate-200 pl-16">
                                <span className="text-sm font-semibold text-slate-700">{p.nome}</span>
                              </td>
                              {meses.map(m => {
                                const aloc = alocacoesDoColab.find(a => a.ano_mes === m && a.projeto_id === p.id);
                                const val = aloc ? aloc.percentual_alocado : '';
                                const isOutOfProjectBounds = m < p.data_inicio.slice(0, 7) || m > p.data_fim.slice(0, 7);

                                return (
                                  <td key={`${c.id}-${p.id}-${m}`} className={`p-2 text-center ${isOutOfProjectBounds ? 'bg-slate-100/50' : ''}`}>
                                    <div className="flex items-center justify-center">
                                      <input 
                                        type="text" inputMode="decimal"
                                        value={val}
                                        onChange={e => handleAlocacaoChange(c.id, p.id, m, e.target.value)}
                                        disabled={isOutOfProjectBounds || !canEdit}
                                        className={`w-16 text-center p-1 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm ${isOutOfProjectBounds || !canEdit ? 'opacity-50 cursor-not-allowed bg-slate-100' : ''}`}
                                      />
                                    </div>
                                  </td>
                                )
                              })}
                            </tr>
                          ))}
                          
                          {/* Linha RTBA */}
                          <tr className="bg-amber-50/30 border-b border-slate-200">
                            <td className="px-6 py-3 border-r border-slate-200 pl-16">
                              <span className="text-sm font-bold text-amber-700">RTBA</span>
                              <span className="text-xs text-amber-600 block opacity-80">Capacidade Disponível</span>
                            </td>
                            {meses.map(m => {
                              const { rtba } = getTotals(c.id, m);
                              return (
                                <td key={`rtba-${m}`} className="p-2 text-center text-amber-800 font-bold">
                                  {rtba}%
                                </td>
                              )
                            })}
                          </tr>

                          {/* Adicionar Novo Projeto */}
                          {canEdit && (
                            <tr className="bg-slate-50 border-b border-slate-300 shadow-inner">
                              <td className="px-6 py-3 border-r border-slate-200 pl-16" colSpan={meses.length + 1}>
                                <div className="flex items-center gap-2">
                                  <Plus className="w-4 h-4 text-indigo-500" />
                                  <span className="text-sm font-semibold text-slate-600">Alocar em novo projeto:</span>
                                  <select 
                                    className="p-1 border border-slate-300 rounded text-sm bg-white"
                                    onChange={e => {
                                      addProjetoToColaborador(c.id, e.target.value);
                                      e.target.value = '';
                                    }}
                                    defaultValue=""
                                  >
                                    <option value="" disabled>Selecionar...</option>
                                    {projetos.filter(p => p.nome !== 'RTBA' && !projsIds.includes(p.id) && p.status === 'ativo' && filtroProjetos.includes(p.id)).map(p => (
                                      <option key={p.id} value={p.id}>{p.nome}</option>
                                    ))}
                                  </select>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      )}
                    </Fragment>
                  )
                })}
                {filteredColabs.length === 0 && (
                  <tr>
                    <td colSpan={meses.length + 1} className="p-8 text-center text-slate-500">
                      Nenhum colaborador encontrado com esses filtros.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
