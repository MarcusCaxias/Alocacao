import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, Lock } from 'lucide-react';
import { API_URL } from '../config';

interface Projeto {
  id: string;
  nome: string;
  descricao: string;
  data_inicio: string;
  data_fim: string;
  status: 'ativo' | 'inativo';
}

export default function Projetos() {
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const canEdit = user && (user.role === 'admin' || user.role === 'gestor');
  
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    data_inicio: '',
    data_fim: '',
    status: 'ativo'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch(`${API_URL}/projetos`);
      const data = await res.json();
      setProjetos(data);
    } catch (error) {
      console.error(error);
    }
  };

  const filtered = projetos.filter(p => 
    p.nome.toLowerCase().includes(search.toLowerCase()) || 
    p.descricao.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    
    if (new Date(formData.data_fim) < new Date(formData.data_inicio)) {
      alert('Data fim não pode ser anterior à data início.');
      return;
    }

    const method = editingId ? 'PUT' : 'POST';
    const url = editingId 
      ? `${API_URL}/projetos/${editingId}`
      : `${API_URL}/projetos`;

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro desconhecido');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      console.error(error);
      alert(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!canEdit) return;
    if (!confirm('Tem certeza que deseja excluir este projeto?')) return;
    try {
      const res = await fetch(`${API_URL}/projetos/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      fetchData();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const openModal = (proj?: Projeto) => {
    if (!canEdit) return;
    if (proj) {
      setEditingId(proj.id);
      setFormData({ 
        nome: proj.nome, 
        descricao: proj.descricao, 
        data_inicio: proj.data_inicio,
        data_fim: proj.data_fim,
        status: proj.status 
      });
    } else {
      setEditingId(null);
      setFormData({ nome: '', descricao: '', data_inicio: '', data_fim: '', status: 'ativo' });
    }
    setIsModalOpen(true);
  };

  const isRTBA = (nome: string) => nome === 'RTBA';

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-slate-800">Projetos de PD&I</h1>
        {canEdit && (
          <button 
            onClick={() => openModal()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" />
            Novo Projeto
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex gap-4 bg-slate-50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Buscar por nome ou descrição..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Nome</th>
                <th className="px-6 py-4">Descrição</th>
                <th className="px-6 py-4">Período</th>
                <th className="px-6 py-4">Status</th>
                {canEdit && <th className="px-6 py-4 text-right">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${isRTBA(p.nome) ? 'bg-slate-50/50' : ''}`}>
                  <td className="px-6 py-4 font-medium text-slate-800 flex items-center">
                    {p.nome}
                    {isRTBA(p.nome) && <Lock className="w-4 h-4 ml-2 text-amber-500" />}
                  </td>
                  <td className="px-6 py-4 truncate max-w-xs">{p.descricao}</td>
                  <td className="px-6 py-4">{p.data_inicio} até {p.data_fim}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${p.status === 'ativo' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      {p.status.toUpperCase()}
                    </span>
                  </td>
                  {canEdit && (
                    <td className="px-6 py-4 flex justify-end gap-2">
                      <button 
                        onClick={() => openModal(p)} 
                        disabled={isRTBA(p.nome)}
                        className={`p-2 rounded-lg transition-colors ${isRTBA(p.nome) ? 'text-slate-300 cursor-not-allowed' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(p.id)} 
                        disabled={isRTBA(p.nome)}
                        className={`p-2 rounded-lg transition-colors ${isRTBA(p.nome) ? 'text-slate-300 cursor-not-allowed' : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={canEdit ? 5 : 4} className="px-6 py-8 text-center text-slate-500">
                    Nenhum projeto encontrado.
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
              {editingId ? 'Editar Projeto' : 'Novo Projeto'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Projeto</label>
                <input required type="text" className="w-full p-2 border rounded-lg" value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
                <textarea required className="w-full p-2 border rounded-lg" rows={3} value={formData.descricao} onChange={e => setFormData({...formData, descricao: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Data Início</label>
                  <input required type="date" className="w-full p-2 border rounded-lg" value={formData.data_inicio} onChange={e => setFormData({...formData, data_inicio: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Data Fim</label>
                  <input required type="date" className="w-full p-2 border rounded-lg" value={formData.data_fim} onChange={e => setFormData({...formData, data_fim: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                <select className="w-full p-2 border rounded-lg" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})}>
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 mt-8">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
