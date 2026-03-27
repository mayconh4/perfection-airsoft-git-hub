import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function AdminLayout() {
  const { user, signOut } = useAuth();
  const location = useLocation();

  const menuItems = [
    { path: '/admin', icon: 'dashboard', label: 'Dashboard' },
    { path: '/admin/produtos', icon: 'inventory_2', label: 'Arsenal' },
    { path: '/admin/pedidos', icon: 'assignment', label: 'Missões' },
    { path: '/admin/mensagens', icon: 'mail', label: 'Rádio' },
  ];

  const isAdmin = user?.email === 'maycontuliofs@gmail.com';

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-background-dark flex items-center justify-center p-4">
        <div className="bg-surface border border-border-tactical p-8 text-center max-w-sm w-full">
          <span className="material-symbols-outlined text-red-500 text-5xl mb-4 block">security</span>
          <h2 className="text-xl font-bold uppercase tracking-widest text-white mb-4">Acesso Negado</h2>
          <p className="text-slate-400 text-sm mb-6 uppercase tracking-wider">Apenas operadores autorizados podem acessar o QG.</p>
          <Link to="/login" className="bg-primary text-background-dark font-bold py-3 px-8 uppercase tracking-widest inline-block w-full">Fazer Login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-dark flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-surface border-r border-border-tactical flex flex-col">
        <div className="p-6 border-b border-border-tactical">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-sm flex items-center justify-center">
              <span className="material-symbols-outlined text-background-dark text-xl font-black">shield</span>
            </div>
            <div>
              <h1 className="text-white font-black text-sm uppercase tracking-tighter">Perfection Airsoft</h1>
              <span className="text-primary text-[10px] uppercase font-bold tracking-widest leading-none">Command Center</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map(item => (
            <Link key={item.path} to={item.path}
              className={`flex items-center gap-3 px-4 py-3 text-xs uppercase font-bold tracking-widest transition-all ${
                location.pathname === item.path 
                  ? 'bg-primary text-background-dark' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="material-symbols-outlined text-lg">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-border-tactical">
          <div className="flex items-center gap-3 px-4 py-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 overflow-hidden flex-shrink-0">
               <div className="w-full h-full flex items-center justify-center text-xs text-white">OP</div>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-white font-bold truncate uppercase">{user.email?.split('@')[0]}</p>
              <p className="text-[8px] text-slate-500 uppercase tracking-widest">Operador Logado</p>
            </div>
          </div>
          <button onClick={() => signOut()} 
                  className="w-full flex items-center gap-3 px-4 py-3 text-[10px] uppercase font-bold tracking-widest text-red-400 hover:bg-red-400/10 transition-all">
            <span className="material-symbols-outlined text-lg">logout</span> Encerrar Sessão
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-background-dark">
        <div className="p-4 md:p-8">
           <Outlet />
        </div>
      </main>
    </div>
  );
}
