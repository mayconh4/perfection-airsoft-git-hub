import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { SEO } from '../components/SEO';

interface EventStats {
  ticketsSold: number;
  revenue: number;
  netRevenue: number;
}

export default function OrganizerDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats] = useState<EventStats>({ ticketsSold: 42, revenue: 1932, netRevenue: 1680 }); // R$46 * 42 = 1932, (46-6)*42 = 1680

  useEffect(() => {
    window.scrollTo(0, 0);
    // Simular carregamento
    setTimeout(() => setLoading(false), 1000);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-dark">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-dark pb-20 pt-12">
      <SEO title="Painel do Organizador | Perfection Airsoft" />
      
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="h-px w-8 bg-primary"></span>
              <span className="text-primary font-black uppercase tracking-[0.3em] text-[10px]">Command Center</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter leading-none">
              Painel do <span className="text-primary">Organizador</span>
            </h1>
          </div>
          <Link 
            to="/eventos/criar" 
            className="bg-primary text-background-dark font-black py-4 px-8 text-[10px] uppercase tracking-[0.3em] hover:bg-white transition-all text-center"
          >
            Nova Missão
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
          <div className="bg-surface/30 border border-white/5 p-8">
            <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest block mb-1">Tickets Vendidos</span>
            <span className="text-4xl font-black text-white">{stats.ticketsSold}</span>
          </div>
          <div className="bg-surface/30 border border-white/5 p-8">
            <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest block mb-1">Receita Bruta</span>
            <span className="text-4xl font-black text-white">R$ {stats.revenue.toFixed(2)}</span>
          </div>
          <div className="bg-surface/30 border border-white/5 p-8 border-l-primary/40 border-l-4">
            <span className="text-[10px] text-primary/60 font-black uppercase tracking-widest block mb-1 font-mono italic">Seu Saldo Líquido</span>
            <span className="text-4xl font-black text-primary">R$ {stats.netRevenue.toFixed(2)}</span>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-12">
          {/* Active Missions */}
          <div className="lg:col-span-2">
            <h2 className="text-lg font-black text-white uppercase tracking-widest mb-6 flex items-center gap-4">
              Minhas Missões
              <span className="h-px flex-1 bg-white/5"></span>
            </h2>

            <div className="space-y-4">
              {[
                { id: '1', title: 'Operation: Dark Veil', status: 'published', date: '12/04/2026', sales: 28, cap: 40, location: 'Campo Batalha SP' },
                { id: '3', title: 'Operação Floresta Negra', status: 'published', date: '03/05/2026', sales: 14, cap: 80, location: 'Campo BR Airsoft' }
              ].map(event => (
                <div key={event.id} className="bg-surface/20 border border-white/10 p-6 flex flex-col md:flex-row items-center justify-between gap-6 hover:border-primary/30 transition-all">
                  <div className="flex gap-6 items-center flex-1">
                    <div className="size-16 bg-white/5 flex items-center justify-center">
                      <span className="material-symbols-outlined text-white/10 text-3xl">military_tech</span>
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-white uppercase tracking-widest mb-1">{event.title}</h4>
                      <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">{event.date} • {event.location || 'Campo Batalha SP'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-8 text-center md:text-right w-full md:w-auto border-t md:border-t-0 border-white/5 pt-4 md:pt-0">
                    <div>
                      <span className="text-[10px] text-slate-600 font-black uppercase tracking-widest block mb-1">Vendas</span>
                      <span className="text-sm font-black text-white">{event.sales} / {event.cap}</span>
                    </div>
                    <Link to={`/organizador/eventos/${event.id}`} className="p-3 bg-white/5 border border-white/10 text-white/50 hover:text-primary hover:border-primary/40 transition-all">
                      <span className="material-symbols-outlined text-sm">edit</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="lg:col-span-1">
            <h2 className="text-lg font-black text-white uppercase tracking-widest mb-6">Suporte ao QG</h2>
            <div className="bg-primary/5 border border-primary/20 p-8">
              <span className="material-symbols-outlined text-primary text-3xl mb-4">account_balance_wallet</span>
              <h3 className="text-sm font-black text-white uppercase tracking-widest mb-6">Configuração de Saques</h3>
              <p className="text-[11px] text-slate-500 font-mono leading-relaxed mb-8 uppercase">
                O site retém automaticamente R$ 6,00 de taxa fixa por ticket. Seu saldo líquido fica disponível para saque após 48h da realização do evento.
              </p>
              <button disabled className="w-full bg-white/5 text-slate-500 font-black py-4 text-[9px] uppercase tracking-[.3em] cursor-not-allowed border border-white/10">
                Vincular Conta Bancária
              </button>
            </div>

            <div className="mt-8 border border-white/5 p-8">
               <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-4">Relatórios</h4>
               <ul className="space-y-3">
                 <li><button className="text-[10px] text-white/50 hover:text-primary transition-all font-mono uppercase">Lista de Operadores (CSV)</button></li>
                 <li><button className="text-[10px] text-white/50 hover:text-primary transition-all font-mono uppercase">Extrato Financeiro Mensal</button></li>
                 <li><button className="text-[10px] text-white/50 hover:text-primary transition-all font-mono uppercase">Performance de Marketing</button></li>
               </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
