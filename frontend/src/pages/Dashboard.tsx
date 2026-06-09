import { useState, useEffect, useMemo } from 'react';
import { Filter, Calendar } from 'lucide-react';
import { API_URL } from '../config';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';

interface Projeto { id: string; nome: string; status: string; }
interface Colaborador { id: string; nome: string; tipo: string; cargo: string; status: string; is_vaga?: boolean; }
interface Alocacao { id?: string; projeto_id: string; colaborador_id: string; ano_mes: string; percentual_alocado: number; }

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const parseNumber = (v: any) => {
  if (v === undefined || v === null) return 0;
  if (typeof v === 'number') return v;
  if (typeof v !== 'string') return 0;
  const parsed = parseFloat(v.replace(',', '.'));
  return isNaN(parsed) ? 0 : parsed;
};

export default function Dashboard() {
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [alocacoes, setAlocacoes] = useState<Alocacao[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros Globais (Aplicam a tudo)
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroStatusProj, setFiltroStatusProj] = useState('');
  const [filtroProj, setFiltroProj] = useState('');

  // Filtro de Mês Específico (Cards, Pizza, Top 5)
  const [filtroMesEspecifico, setFiltroMesEspecifico] = useState('');

  // Filtros de Período (Apenas Gráficos de Evolução)
  const [filtroInicio, setFiltroInicio] = useState('');
  const [filtroFim, setFiltroFim] = useState('');

  useEffect(() => {
    const d = new Date();
    const current = d.toISOString().slice(0, 7);
    const future = new Date(d.getFullYear(), d.getMonth() + 5, 1).toISOString().slice(0, 7);
    
    setFiltroMesEspecifico(current);
    setFiltroInicio(current);
    setFiltroFim(future);

    Promise.all([
      fetch(`${API_URL}/projetos`).then(r => r.json()),
      fetch(`${API_URL}/colaboradores`).then(r => r.json()),
      fetch(`${API_URL}/alocacoes`).then(r => r.json())
    ]).then(([p, c, a]) => {
      setProjetos(p);
      setColaboradores(c);
      setAlocacoes(a);
      setLoading(false);
    }).catch(console.error);
  }, []);

  const mesesEvolucao = useMemo(() => {
    if (!filtroInicio || !filtroFim) return [];
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
    return arr;
  }, [filtroInicio, filtroFim]);

  const dashboardData = useMemo(() => {
    if (loading || !filtroMesEspecifico) return null;

    // Aplicar Filtros Globais
    const filteredColabs = colaboradores.filter(c => (filtroTipo ? c.tipo === filtroTipo : true));
    const filteredProjs = projetos.filter(p => p.nome !== 'RTBA' && (filtroStatusProj ? p.status === filtroStatusProj : true));
    const filteredProjsIds = filteredProjs.map(p => p.id);
    
    const alocsReaisGlobais = alocacoes.filter(a => 
      a.projeto_id !== 'rtba-special-id' &&
      filteredProjsIds.includes(a.projeto_id) &&
      (filtroProj ? a.projeto_id === filtroProj : true)
    );

    // Contratados (pessoas reais)
    const ativosColab = filteredColabs.filter(c => c.status === 'ativo' && !c.is_vaga);
    // Vagas
    const vagasAbertas = filteredColabs.filter(c => c.status === 'ativo' && c.is_vaga).length;

    // ====================================================================
    // CÁLCULOS DO MÊS ESPECÍFICO (Cards, Pizza, Top 5)
    // ====================================================================
    let sumOcupacaoMes = 0;
    let count100Rtba = 0;
    let countParcial = 0;
    let count100Ocupado = 0;

    const colabMesStats = ativosColab.map(c => {
      const alocsMes = alocsReaisGlobais.filter(a => a.colaborador_id === c.id && a.ano_mes === filtroMesEspecifico);
      const totalMes = alocsMes.reduce((acc, a) => acc + parseNumber(a.percentual_alocado), 0);
      
      sumOcupacaoMes += totalMes;

      if (totalMes === 0) count100Rtba++;
      else if (totalMes >= 100) count100Ocupado++;
      else countParcial++;

      return { id: c.id, nome: c.nome, tipo: c.tipo, ocupacao: totalMes, rtba: 100 - totalMes };
    });

    const ocupacaoMediaEquipe = ativosColab.length > 0 ? sumOcupacaoMes / ativosColab.length : 0;

    // Projetos sem equipe no mês específico
    const projIdsComAlocacaoNoMes = new Set(alocsReaisGlobais.filter(a => a.ano_mes === filtroMesEspecifico && parseNumber(a.percentual_alocado) > 0).map(a => a.projeto_id));
    const projetosSemEquipe = filteredProjs.filter(p => !projIdsComAlocacaoNoMes.has(p.id)).length;

    const cardsData = {
      ativos: ativosColab.length,
      vagasAbertas,
      projetosAtivos: filteredProjs.filter(p => p.status === 'ativo').length,
      ocupacaoMedia: ocupacaoMediaEquipe.toFixed(1),
      count100Rtba,
      countParcial,
      count100Ocupado,
      projetosSemEquipe
    };

    const topDesalocadosData = [...colabMesStats]
      .sort((a, b) => b.rtba - a.rtba)
      .slice(0, 5)
      .map(c => ({ name: c.nome, 'Disponibilidade (RTBA) %': c.rtba }));

    const chartTipoData = [
      { name: 'RHD', value: ativosColab.filter(c => c.tipo === 'RHD').length },
      { name: 'RHI', value: ativosColab.filter(c => c.tipo === 'RHI').length }
    ].filter(d => d.value > 0);

    // ====================================================================
    // CÁLCULOS DO PERÍODO (Gráficos de Evolução)
    // ====================================================================
    const chartOcupacaoData = mesesEvolucao.map(m => {
      let sumMes = 0;
      ativosColab.forEach(c => {
        const alocs = alocsReaisGlobais.filter(a => a.colaborador_id === c.id && a.ano_mes === m);
        sumMes += alocs.reduce((acc, a) => acc + parseNumber(a.percentual_alocado), 0);
      });
      const media = ativosColab.length > 0 ? sumMes / ativosColab.length : 0;
      return { name: m, 'Ocupação Média %': parseFloat(media.toFixed(1)) };
    });

    const chartEvolucaoData = mesesEvolucao.map(m => {
      let sumRtba = 0;
      ativosColab.forEach(c => {
        const alocs = alocsReaisGlobais.filter(a => a.colaborador_id === c.id && a.ano_mes === m);
        const total = alocs.reduce((acc, a) => acc + parseNumber(a.percentual_alocado), 0);
        sumRtba += (100 - total);
      });
      // Convertendo para percentual médio (0 a 100%) em vez de soma bruta (ex: 500%)
      const mediaRtba = ativosColab.length > 0 ? sumRtba / ativosColab.length : 0;
      return { name: m, 'RTBA Global (%)': parseFloat(mediaRtba.toFixed(1)) };
    });

    return { 
      cards: cardsData, 
      chartTipo: chartTipoData,
      topDesalocados: topDesalocadosData,
      chartOcupacao: chartOcupacaoData, 
      chartEvolucao: chartEvolucaoData, 
    };

  }, [loading, colaboradores, projetos, alocacoes, filtroMesEspecifico, filtroInicio, filtroFim, filtroTipo, filtroStatusProj, filtroProj, mesesEvolucao]);

  if (loading || !dashboardData) return <div className="p-8 text-slate-500">Carregando Dashboard...</div>;

  const { cards, chartTipo, topDesalocados, chartOcupacao, chartEvolucao } = dashboardData;

  return (
    <div className="p-8 bg-slate-50 min-h-full">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Dashboard Gerencial</h1>
          <p className="text-slate-500">Acompanhamento de capacidade e ocupação da equipe de PD&I.</p>
        </div>
      </div>

      {/* FILTROS GLOBAIS */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-4 flex flex-wrap gap-4 items-center">
        <Filter className="w-5 h-5 text-indigo-500" />
        <span className="text-sm font-semibold text-slate-700">Filtros Globais:</span>
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} className="p-2 border border-slate-200 rounded-lg text-sm bg-slate-50">
          <option value="">Todos os Recursos (RHD/RHI)</option>
          <option value="RHD">Apenas RHD</option>
          <option value="RHI">Apenas RHI</option>
        </select>
        <select value={filtroStatusProj} onChange={e => setFiltroStatusProj(e.target.value)} className="p-2 border border-slate-200 rounded-lg text-sm bg-slate-50">
          <option value="">Status Projeto (Todos)</option>
          <option value="ativo">Projetos Ativos</option>
          <option value="inativo">Projetos Inativos</option>
        </select>
        <select value={filtroProj} onChange={e => setFiltroProj(e.target.value)} className="p-2 border border-slate-200 rounded-lg text-sm bg-slate-50 max-w-[200px] truncate">
          <option value="">Todos os Projetos</option>
          {projetos.filter(p => p.nome !== 'RTBA').map(p => (
            <option key={p.id} value={p.id}>{p.nome}</option>
          ))}
        </select>
      </div>

      {/* FILTRO DE MÊS ESPECÍFICO */}
      <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl shadow-sm mb-6 flex items-center gap-4">
        <Calendar className="w-5 h-5 text-indigo-500" />
        <span className="text-sm font-bold text-indigo-800">Mês Específico:</span>
        <input 
          type="month" 
          value={filtroMesEspecifico} 
          onChange={e => setFiltroMesEspecifico(e.target.value)} 
          className="p-2 border border-indigo-200 rounded-lg text-sm bg-white text-indigo-900 font-semibold shadow-sm focus:ring-2 focus:ring-indigo-500" 
        />
        <span className="text-xs text-indigo-600">(Aplica-se aos Cards e Gráficos de Resumo Abaixo)</span>
      </div>

      {/* 1. INDICADORES (CARDS) */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <p className="text-xs font-medium text-slate-500 mb-1">Colab. Ativos</p>
          <p className="text-2xl font-bold text-slate-800">{cards.ativos}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-amber-200 p-4 bg-amber-50">
          <p className="text-xs font-bold text-amber-700 mb-1">Vagas Abertas</p>
          <p className="text-2xl font-bold text-amber-800">{cards.vagasAbertas}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <p className="text-xs font-medium text-slate-500 mb-1">Projetos Ativos</p>
          <p className="text-2xl font-bold text-slate-800">{cards.projetosAtivos}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-indigo-200 p-4 bg-indigo-50/50">
          <p className="text-xs font-bold text-indigo-600 mb-1">Ocupação Média</p>
          <p className="text-2xl font-black text-indigo-700">{cards.ocupacaoMedia}%</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-rose-200 p-4 bg-rose-50/50">
          <p className="text-xs font-bold text-rose-600 mb-1">100% em RTBA</p>
          <p className="text-2xl font-black text-rose-700">{cards.count100Rtba}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-amber-200 p-4 bg-amber-50/50">
          <p className="text-xs font-bold text-amber-600 mb-1">Ocup. Parcial</p>
          <p className="text-2xl font-black text-amber-700">{cards.countParcial}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-emerald-200 p-4 bg-emerald-50/50">
          <p className="text-xs font-bold text-emerald-600 mb-1">100% Ocupados</p>
          <p className="text-2xl font-black text-emerald-700">{cards.count100Ocupado}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <p className="text-xs font-medium text-slate-500 mb-1">Proj. sem Equipe</p>
          <p className="text-2xl font-bold text-slate-800">{cards.projetosSemEquipe}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Grafico 4: Tipo de Colaborador */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col">
          <h2 className="text-sm font-bold text-slate-700 mb-4">Distribuição por Tipo de Recurso</h2>
          <div className="h-[250px] w-full flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartTipo} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" label>
                  {chartTipo.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tabela/Grafico 3: Top Desalocados */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-sm font-bold text-slate-700 mb-4">Top 5 Colaboradores Mais Disponíveis (RTBA)</h2>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topDesalocados} layout="vertical" margin={{ top: 0, right: 10, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" domain={[0, 100]} axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#475569'}} width={100} />
                <Tooltip cursor={{fill: 'transparent'}} />
                <Bar dataKey="Disponibilidade (RTBA) %" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <hr className="my-8 border-slate-200" />

      {/* FILTRO DE PERÍODO (Para Evolução) */}
      <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl shadow-sm mb-6 flex items-center gap-4">
        <Calendar className="w-5 h-5 text-emerald-500" />
        <span className="text-sm font-bold text-emerald-800">Período de Evolução:</span>
        <div className="flex items-center gap-2">
          <input type="month" value={filtroInicio} onChange={e => setFiltroInicio(e.target.value)} className="p-2 border border-emerald-200 rounded-lg text-sm bg-white text-emerald-900 font-semibold shadow-sm focus:ring-2 focus:ring-emerald-500" />
          <span className="text-emerald-600 font-semibold">até</span>
          <input type="month" value={filtroFim} onChange={e => setFiltroFim(e.target.value)} className="p-2 border border-emerald-200 rounded-lg text-sm bg-white text-emerald-900 font-semibold shadow-sm focus:ring-2 focus:ring-emerald-500" />
        </div>
        <span className="text-xs text-emerald-600">(Aplica-se apenas aos Gráficos de Tendência Abaixo)</span>
      </div>

      {/* 2. GRÁFICOS DE EVOLUÇÃO */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        
        {/* Grafico 1: Ocupação média por mês */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-sm font-bold text-slate-700 mb-4">Ocupação Média da Equipe (%)</h2>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartOcupacao} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} domain={[0, 100]} tick={{fontSize: 12}} />
                <Tooltip cursor={{fill: 'transparent'}} />
                <Bar dataKey="Ocupação Média %" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Grafico 2: Evolução RTBA */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-sm font-bold text-slate-700 mb-4">Evolução da Capacidade (RTBA Global)</h2>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartEvolucao} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} domain={[0, 100]} tick={{fontSize: 12}} />
                <Tooltip />
                <Line type="monotone" dataKey="RTBA Global (%)" stroke="#f59e0b" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

    </div>
  );
}
