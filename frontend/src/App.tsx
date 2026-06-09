import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { LayoutDashboard, Users, FolderKanban, PieChart, Layers } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Colaboradores from './pages/Colaboradores';
import Projetos from './pages/Projetos';
import AlocacaoProjeto from './pages/AlocacaoProjeto';
import AlocacaoColaborador from './pages/AlocacaoColaborador';

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-slate-50">
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col">
        <div className="h-16 flex items-center px-6 font-bold text-white text-xl border-b border-slate-800">
          RH Alocação
        </div>
        <nav className="flex-1 py-4">
          <ul className="space-y-1">
            <li>
              <Link to="/" className="flex items-center px-6 py-3 hover:bg-slate-800 hover:text-white transition-colors">
                <LayoutDashboard className="w-5 h-5 mr-3" /> Dashboard
              </Link>
            </li>
            <li>
              <Link to="/colaboradores" className="flex items-center px-6 py-3 hover:bg-slate-800 hover:text-white transition-colors">
                <Users className="w-5 h-5 mr-3" /> Colaboradores
              </Link>
            </li>
            <li>
              <Link to="/projetos" className="flex items-center px-6 py-3 hover:bg-slate-800 hover:text-white transition-colors">
                <FolderKanban className="w-5 h-5 mr-3" /> Projetos
              </Link>
            </li>
            <li>
              <Link to="/alocacao-projeto" className="flex items-center px-6 py-3 hover:bg-slate-800 hover:text-white transition-colors">
                <PieChart className="w-5 h-5 mr-3" /> Alocação / Projeto
              </Link>
            </li>
            <li>
              <Link to="/alocacao-colaborador" className="flex items-center px-6 py-3 hover:bg-slate-800 hover:text-white transition-colors">
                <Layers className="w-5 h-5 mr-3" /> Alocação / Colaborador
              </Link>
            </li>
          </ul>
        </nav>
      </aside>
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/colaboradores" element={<Colaboradores />} />
          <Route path="/projetos" element={<Projetos />} />
          <Route path="/alocacao-projeto" element={<AlocacaoProjeto />} />
          <Route path="/alocacao-colaborador" element={<AlocacaoColaborador />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
