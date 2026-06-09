import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search } from 'lucide-react';
import { API_URL } from '../config';

interface Colaborador {
  id: string;
  nome: string;
  tipo: 'RHD' | 'RHI';
  cargo: string;
  status: 'ativo' | 'inativo';
  is_vaga?: boolean;
  custo_mensal?: number;
}

export default function Colaboradores() {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filtroVaga, setFiltroVaga] = useState('todas');

  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const canEdit = user && (user.role === 'admin' || user.role === 'gestor');
  const canSeeCost = user && (user.role === 'admin' || user.role === 'gestor');
  
  const [formData, setFormData] = useState({
    nome: '',
    tipo: 'RHD',
    cargo: '',
    status: 'ativo',
    is_vaga: false,
    custo_mensal: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch(`${API_URL}/colaboradores`);
      const data = await res.json();
      setColaboradores(data);
    } catch (error) {
      console.error(error);
    }
  };

  const filtered = colaboradores.filter(c => {
    const matchBusca = c.nome.toLowerCase().includes(search.toLowerCase()) || c.cargo.toLowerCase().includes(search.toLowerCase());
    const matchVaga = filtroVaga === 'todas' ? true : (filtroVaga === 'apenas_vagas' ? c.is_vaga : !c.is_vaga);
    return matchBusca && matchVaga;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;

    const method = editingId ? 'PUT' : 'POST';
    const url = editingId 
      ? `${API_URL}/colaboradores/${editingId}`
      : `${API_URL}/colaboradores`;

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setIsModalOpen(false);
        fetchData();
      } else {
        const err = await res.json();
        alert(`Erro ao salvar: ${err.error}`);
      }
    } catch (error) {
      console.error(error);
      alert('Erro ao salvar colaborador.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!canEdit) return;
    if (!confirm('Tem certeza que deseja excluir?')) return;
    try {
      const res = await fetch(`${API_URL}/colaboradores/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
      } else {
        alert('Erro ao excluir colaborador.');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const openModal = (colab?: Colaborador) => {
    if (!canEdit) return;
    if (colab) {
      setEditingId(colab.id);
      setFormData({ 
        nome: colab.nome, 
        tipo: colab.tipo, 
        cargo: colab.cargo, 
        status: colab.status, 
        is_vaga: colab.is_vaga || false,
        custo_mensal: colab.custo_mensal || 0
      });
    } else {
      setEditingId(null);
      setFormData({ nome: '', tipo: 'RHD', cargo: '', status: 'ativo', is_vaga: false, custo_mensal: 0 });
    }
    setIsModalOpen(true);
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-slate-800">Recursos Humanos</h1>
        {canEdit && (
          <button 
            onClick={() => openModal()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" />
            Novo Colaborador
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-wrap gap-4 bg-slate-50 items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Buscar por nome ou cargo..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select 
            className="p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-slate-700"
            value={filtroVaga}
            onChange={e => setFiltroVaga(e.target.value)}
          >
            <option value="todas">Todos (Recursos + Vagas)</option>
            <option value="apenas_contratados">Apenas Contratados</option>
            <option value="apenas_vagas">Apenas Vagas Planejadas</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Nome</th>
                <th className="px-6 py-4">Tipo</th>
                <th className="px-6 py-4">Cargo</th>
                <th className="px-6 py-4">Status</th>
                {canEdit && <th className="px-6 py-4 text-right">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-800">
                    {c.nome}
                    {c.is_vaga && <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 uppercase">Vaga</span>}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${c.tipo === 'RHD' ? 'bg-indigo-100 text-indigo-700' : 'bg-fuchsia-100 text-fuchsia-700'}`}>
                      {c.tipo}
                    </span>
                  </td>
                  <td className="px-6 py-4">{c.cargo}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${c.status === 'ativo' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      {c.status.toUpperCase()}
                    </span>
                  </td>
                  {canEdit && (
                    <td className="px-6 py-4 flex justify-end gap-2">
                      <button onClick={() => openModal(c)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(c.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={canEdit ? 5 : 4} className="px-6 py-8 text-center text-slate-500">
                    Nenhum colaborador encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && canEdit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-6 text-slate-800">
              {editingId ? 'Editar Colaborador' : 'Novo Colaborador'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome</label>
                <input required type="text" className="w-full p-2 border rounded-lg" value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cargo</label>
                <input required type="text" className="w-full p-2 border rounded-lg" value={formData.cargo} onChange={e => setFormData({...formData, cargo: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
                  <select className="w-full p-2 border rounded-lg" value={formData.tipo} onChange={e => setFormData({...formData, tipo: e.target.value as any})}>
                    <option value="RHD">RHD</option>
                    <option value="RHI">RHI</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                  <select className="w-full p-2 border rounded-lg" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})}>
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </div>
              </div>
              {canSeeCost && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Custo Mensal (R$)</label>
                  <input 
                    required 
                    type="number" 
                    step="0.01" 
                    min="0"
                    className="w-full p-2 border rounded-lg" 
                    value={formData.custo_mensal} 
                    onChange={e => setFormData({...formData, custo_mensal: parseFloat(e.target.value) || 0})} 
                  />
                </div>
              )}
              <div className="flex items-center mt-2">
                <input 
                  type="checkbox" 
                  id="is_vaga" 
                  checked={formData.is_vaga} 
                  onChange={e => setFormData({...formData, is_vaga: e.target.checked})}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <label htmlFor="is_vaga" className="ml-2 text-sm font-medium text-slate-700">
                  É uma Vaga Planejada? (Ainda não preenchida)
                </label>
              </div>
              <div className="flex justify-end gap-3 mt-8">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
