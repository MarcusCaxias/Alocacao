import { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { LayoutDashboard, Users, FolderKanban, PieChart, Layers, Shield, LogOut } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Colaboradores from './pages/Colaboradores';
import Projetos from './pages/Projetos';
import AlocacaoProjeto from './pages/AlocacaoProjeto';
import AlocacaoColaborador from './pages/AlocacaoColaborador';
import Usuarios from './pages/Usuarios';
import Login from './pages/Login';
import { API_URL } from './config';

// Global Fetch Interceptor to inject JWT token and handle 401 auto-logout
const originalFetch = window.fetch;
window.fetch = async (input, init) => {
  const token = localStorage.getItem('token');
  if (token && typeof input === 'string' && input.startsWith(API_URL)) {
    init = init || {};
    init.headers = init.headers || {};
    if (init.headers instanceof Headers) {
      init.headers.set('Authorization', `Bearer ${token}`);
    } else if (Array.isArray(init.headers)) {
      init.headers.push(['Authorization', `Bearer ${token}`]);
    } else {
      (init.headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }
  }
  
  const response = await originalFetch(input, init);
  
  // Auto-logout if unauthorized (excluding login route)
  if (response.status === 401 && typeof input === 'string' && input.startsWith(API_URL) && !input.includes('/auth/login')) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.reload();
  }
  
  return response;
};

interface UserState {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'gestor' | 'viewer';
}

function Layout({ children, user, onLogout }: { children: React.ReactNode; user: UserState; onLogout: () => void }) {
  return (
    <div className="min-h-screen flex bg-slate-50">
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col justify-between shrink-0">
        <div>
          <div className="h-16 flex items-center px-6 font-bold text-white text-xl border-b border-slate-800 bg-slate-950">
            RH Alocação
          </div>
          <nav className="py-4">
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
              {user.role === 'admin' && (
                <li>
                  <Link to="/usuarios" className="flex items-center px-6 py-3 hover:bg-slate-800 hover:text-white transition-colors text-indigo-300">
                    <Shield className="w-5 h-5 mr-3" /> Usuários
                  </Link>
                </li>
              )}
            </ul>
          </nav>
        </div>

        {/* User Info Profile & Logout */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex flex-col gap-3">
          <div className="flex items-center gap-3 px-1">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm text-slate-100 font-semibold truncate leading-tight">{user.name}</p>
              <span className={`inline-block mt-0.5 text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                user.role === 'admin' 
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' 
                  : user.role === 'gestor'
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                  : 'bg-slate-500/20 text-slate-300 border border-slate-500/30'
              }`}>
                {user.role === 'viewer' ? 'Visualizador' : user.role}
              </span>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="flex items-center justify-center gap-2 w-full px-4 py-2 hover:bg-rose-600 hover:text-white text-rose-400 border border-rose-500/20 rounded-lg text-xs font-medium transition-all duration-150"
          >
            <LogOut className="w-3.5 h-3.5" /> Sair do Sistema
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<UserState | null>(() => {
    const u = localStorage.getItem('user');
    return u ? JSON.parse(u) : null;
  });

  const handleLoginSuccess = (newToken: string, newUser: UserState) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  if (!token || !user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <BrowserRouter>
      <Layout user={user} onLogout={handleLogout}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/colaboradores" element={<Colaboradores />} />
          <Route path="/projetos" element={<Projetos />} />
          <Route path="/alocacao-projeto" element={<AlocacaoProjeto />} />
          <Route path="/alocacao-colaborador" element={<AlocacaoColaborador />} />
          {user.role === 'admin' ? (
            <Route path="/usuarios" element={<Usuarios />} />
          ) : (
            <Route path="/usuarios" element={<Navigate to="/" replace />} />
          )}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
