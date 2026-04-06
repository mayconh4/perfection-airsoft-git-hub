import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SEO } from '../components/SEO';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface EventStats {
  ticketsSold: number;
  revenue: number;
  netRevenue: number;
  pendingBalance: number;
  trustLevel: number;
  completedDrops: number;
  successfulShipments: number;
}

export default function OrganizerDashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<any[]>([]);
  const [stats, setStats] = useState<EventStats>({ ticketsSold: 0, revenue: 0, netRevenue: 0, pendingBalance: 0, trustLevel: 0, completedDrops: 0, successfulShipments: 0 });
  const [activeTab, setActiveTab] = useState<'missions' | 'drops' | 'logistics' | 'reports'>('missions');
  const [winners, setWinners] = useState<any[]>([]);
  const [updatingLogisticsId, setUpdatingLogisticsId] = useState<string | null>(null);
  const [selectedEventParticipants, setSelectedEventParticipants] = useState<any[]>([]);
  const [isParticipantsModalOpen, setIsParticipantsModalOpen] = useState(false);
  const [loadingParticipants, setLoadingParticipants] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
      return;
    }

    if (user) {
      fetchDashboardData();
      
      const urlParams = new URLSearchParams(window.location.search);
      const focusEventId = urlParams.get('event');
      if (focusEventId) {
        setActiveTab('missions');
        setTimeout(() => {
          const el = document.getElementById(`event-${focusEventId}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth' });
            el.classList.add('ring-2', 'ring-primary', 'ring-offset-4', 'ring-offset-background-dark');
          }
        }, 800);
      }
    }
  }, [user, authLoading]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Buscar todos os eventos do organizador
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .eq('organizer_id', user?.id)
        .order('event_date', { ascending: false });

      if (eventsError) throw eventsError;

      // 2. Buscar todas as rifas/drops do organizador
      const { data: rafflesData } = await supabase
        .from('raffles')
        .select('*')
        .eq('creator_id', user?.id)
        .order('created_at', { ascending: false });

      // Merge de operações para visualização e estatísticas
      const allOps = [
        ...(eventsData || []).map(e => ({ ...e, type: 'mission' })),
        ...(rafflesData || []).map(r => ({
          ...r,
          type: 'drop',
          title: r.title,
          event_date: r.created_at,
          sold_count: r.sold_tickets,
          capacity: r.total_tickets,
          image_url: r.image_url
        }))
      ];

      setEvents(allOps);

      // Calcular estatísticas operacionais
      const totalSold = allOps.reduce((sum, e) => sum + (e.sold_count || 0), 0);

      // 3. Buscar Dados de Confiança
      const { data: profile } = await supabase
        .from('profiles')
        .select('trust_level, completed_drops')
        .eq('id', user?.id)
        .single();

      const { data: winnersData } = await supabase
        .from('raffle_winners')
        .select('*, raffles(title, creator_id)')
        .order('created_at', { ascending: false });

      setWinners(winnersData || []);

      setStats({
        ticketsSold: totalSold,
        trustLevel: profile?.trust_level || 0,
        completedDrops: profile?.completed_drops || 0,
        successfulShipments: (winnersData || []).filter((w: any) => w.delivery_status === 'shipped').length,
        revenue: 0,
        netRevenue: 0,
        pendingBalance: 0
      });

    } catch (err: any) {
      console.error('Erro no Dashboard:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('dashboard-updates-v2')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'tickets'
      }, () => {
        fetchDashboardData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchParticipants = async (eventId: string) => {
    setLoadingParticipants(true);
    setIsParticipantsModalOpen(true);
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*, events(title, checkin_token)')
        .eq('event_id', eventId)
        .eq('status', 'confirmed');

      if (error) throw error;
      setSelectedEventParticipants(data || []);
    } catch (err: any) {
      console.error('Erro ao buscar participantes:', err.message);
    } finally {
      setLoadingParticipants(false);
    }
  };

  const handleUpdateTracking = async (winnerId: string, trackingCode: string) => {
    if (!trackingCode) return;
    setUpdatingLogisticsId(winnerId);
    try {
      const { error } = await supabase
        .from('raffle_winners')
        .update({
          tracking_code: trackingCode,
          delivery_status: 'shipped',
          shipped_at: new Date().toISOString()
        })
        .eq('id', winnerId);

      if (error) throw error;
      alert('Logística Atualizada! O prazo de liberação do saldo começará a contar.');
      fetchDashboardData();
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    } finally {
      setUpdatingLogisticsId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-dark">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-dark pb-20 pt-12 relative overflow-hidden crt-overlay">
      <div className="scanline"></div>
      <style>{`
        @keyframes scan {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes pulse-border {
          0%, 100% { border-color: rgba(251, 191, 36, 0.3); }
          50% { border-color: rgba(251, 191, 36, 0.8); }
        }
        @keyframes glitch-text {
          0% { opacity: 1; transform: translateX(0); }
          10% { opacity: 0.8; transform: translateX(-1px); }
          20% { opacity: 1; transform: translateX(1px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        .animate-scanner {
          animation: scan 3s linear infinite;
        }
        .animate-pulse-border {
          animation: pulse-border 2s ease-in-out infinite;
        }
        .animate-glitch {
          animation: glitch-text 4s linear infinite;
        }
        .card-hud {
          background: linear-gradient(135deg, rgba(30, 30, 30, 0.4) 0%, rgba(10, 10, 10, 0.6) 100%);
          border: 1px solid rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(10px);
        }
        .card-hud-active {
          border-color: rgba(251, 191, 36, 0.2);
          background: linear-gradient(135deg, rgba(251, 191, 36, 0.05) 0%, rgba(251, 191, 36, 0.02) 100%);
        }
        @keyframes windows-loading {
          0% { left: -40%; }
          100% { left: 100%; }
        }
        .windows-loader {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 2px;
          background: rgba(255, 255, 255, 0.05);
          overflow: hidden;
        }
        .windows-loader-bar {
          position: absolute;
          top: 0;
          left: -40%;
          width: 40%;
          height: 100%;
          background: #10b981; /* Verde Emerald 500 */
          box-shadow: 0 0 10px #10b981;
          animation: windows-loading 2s infinite cubic-bezier(0.4, 0, 0.2, 1);
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
      <SEO title="Painel do Organizador | Perfection Airsoft" />

      {user && (
        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="h-px w-8 bg-primary"></span>
                <span className="text-primary font-black uppercase tracking-[0.3em] text-[10px]">Command Center</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter leading-tight italic animate-glitch">
                PAINEL DE <span className="text-primary drop-shadow-[0_0_15px_rgba(251,191,36,0.3)]">COMANDO</span>
              </h1>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/organizador/financeiro"
                className="bg-primary/10 border border-primary/50 text-primary font-black py-3 px-6 text-[9px] uppercase tracking-[0.2em] hover:bg-primary hover:text-black transition-all text-center flex items-center gap-2 shadow-[0_0_20px_rgba(251,191,36,0.05)] rounded-sm group"
              >
                <span className="material-symbols-outlined text-sm group-hover:rotate-12 transition-transform">payments</span>
                Financeiro
              </Link>
              <Link
                to="/drop/criar"
                className="bg-primary text-background-dark font-black py-3 px-6 text-[9px] uppercase tracking-[0.2em] hover:brightness-110 transition-all text-center flex items-center gap-2 rounded-sm"
              >
                <span className="material-symbols-outlined text-sm">rocket</span>
                Novo Drop
              </Link>
              <Link
                to="/eventos/criar"
                className="bg-white/5 border border-white/10 text-white/70 font-black py-3 px-6 text-[9px] uppercase tracking-[0.2em] hover:bg-white hover:text-black transition-all text-center flex items-center gap-2 rounded-sm"
              >
                <span className="material-symbols-outlined text-sm">add_task</span>
                Nova Missão
              </Link>
            </div>
          </div>

          <div className={`p-10 mb-10 relative overflow-hidden group transition-all duration-700 rounded-sm card-hud ${stats.trustLevel >= 3 ? 'card-hud-active animate-pulse-border shadow-[0_0_50px_rgba(251,191,36,0.05)]' : ''}`}>
            {/* Grid Pattern Overlay */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #fbbf24 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
            
            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-10">
              <div className="flex items-center gap-8">
                <div className={`size-28 flex items-center justify-center relative transition-all duration-500 group-hover:scale-105`}>
                  <div className={`absolute inset-0 rounded-full border-2 border-dashed animate-[spin_20s_linear_infinite] ${stats.trustLevel >= 3 ? 'border-primary/40' : 'border-white/10'}`}></div>
                  <div className={`size-20 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(0,0,0,0.5)] ${stats.trustLevel >= 3 ? 'bg-primary text-black' : 'bg-slate-800 text-slate-500'}`}>
                    <span className="material-symbols-outlined text-4xl font-black">
                      {stats.trustLevel >= 3 ? 'military_tech' : 'verified_user'}
                    </span>
                  </div>
                  <div className="absolute -bottom-2 right-0 bg-primary text-black font-black text-[8px] px-2 py-0.5 rounded-sm shadow-lg skew-x-[-10deg]">
                    RANK {stats.trustLevel}
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic">
                    {stats.trustLevel >= 3 ? 'COMANDANTE DE ELITE' : 'OPERADOR VERIFICADO'}
                  </h3>
                  <p className={`text-[10px] font-mono uppercase tracking-[0.2em] ${stats.trustLevel >= 3 ? 'text-primary' : 'text-slate-500'}`}>
                    {stats.trustLevel >= 3 ? 'KILLSTREAK: SAQUE INSTANTÂNEO ATIVADO' : 'STATUS PADRÃO: SALDO EM GARANTIA'}
                  </p>
                </div>
              </div>
              <div className="flex-1 max-w-md w-full">
                <div className="flex justify-between text-[9px] font-black uppercase tracking-widest mb-2">
                  <span className="text-slate-500 font-mono">SUPPLY CHAIN INTEGRITY</span>
                  <span className="text-primary font-mono">{stats.completedDrops} / {stats.trustLevel < 3 ? '3' : '15'} ENTREGAS</span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 shadow-inner">
                  <div
                    className="h-full bg-primary transition-all duration-1000 shadow-[0_0_10px_rgba(251,191,36,0.5)]"
                    style={{ width: `${Math.min(100, (stats.completedDrops / (stats.trustLevel < 3 ? 3 : 15)) * 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:gap-6 mb-12">
            <div className="card-hud p-4 md:p-10 group hover:border-primary/20 transition-all relative overflow-hidden flex flex-col justify-center">
               {/* Decorative Background Icon */}
               <span className="material-symbols-outlined absolute -right-2 -bottom-2 md:-right-4 md:-bottom-4 text-5xl md:text-8xl text-white/[0.02] rotate-12 group-hover:text-primary/[0.05] transition-colors">monitoring</span>
              <span className="text-[7px] md:text-[9px] text-slate-500 font-black uppercase tracking-[0.2em] md:tracking-[0.3em] block mb-1 md:mb-2 font-mono">Operações Monitoradas</span>
              <div className="flex items-end gap-1 md:gap-2">
                <span className="text-2xl md:text-5xl font-black text-white leading-none tracking-tighter">{events.length}</span>
                <span className="text-primary font-black text-[8px] md:text-[10px] mb-0.5 md:mb-1.5 animate-pulse">ACTIVE</span>
              </div>
            </div>
            <div className="card-hud p-4 md:p-10 group hover:border-primary/20 transition-all relative overflow-hidden flex flex-col justify-center">
               <span className="material-symbols-outlined absolute -right-2 -bottom-2 md:-right-4 md:-bottom-4 text-5xl md:text-8xl text-white/[0.02] -rotate-12 group-hover:text-primary/[0.05] transition-colors">group</span>
              <span className="text-[7px] md:text-[9px] text-slate-500 font-black uppercase tracking-[0.2em] md:tracking-[0.3em] block mb-1 md:mb-2 font-mono">Engajamento Total</span>
              <div className="flex items-end gap-1 md:gap-2">
                <span className="text-2xl md:text-5xl font-black text-white leading-none tracking-tighter">{stats.ticketsSold}</span>
                <span className="text-slate-600 font-black text-[7px] md:text-[9px] mb-0.5 md:mb-1.5 uppercase tracking-tighter">Tickets</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-10 bg-surface/20 p-2 rounded-sm border border-white/5">
            {[
              { id: 'missions', label: 'Missões', icon: 'military_tech' },
              { id: 'drops', label: 'Drops', icon: 'rocket' },
              { id: 'logistics', label: 'Logística', icon: 'local_shipping' },
              { id: 'reports', label: 'Progressão', icon: 'analytics' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-4 px-2 md:px-6 text-center transition-all rounded-sm border ${activeTab === tab.id ? 'bg-primary/20 border-primary/50 text-white shadow-[0_4px_15px_rgba(251,191,36,0.1)]' : 'bg-transparent border-transparent text-slate-500 hover:text-white hover:bg-white/5'}`}
              >
                <span className={`material-symbols-outlined text-base md:text-lg ${activeTab === tab.id ? 'text-primary' : ''}`}>{tab.icon}</span>
                <span className="text-[7px] md:text-[9px] uppercase font-black tracking-widest leading-none truncate w-full">{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="min-h-[400px]">
            {activeTab === 'missions' && (
              <div className="space-y-6">
                <Link to="/eventos/criar" className="w-full flex items-center justify-between p-10 border border-dashed border-primary/40 bg-primary/10 hover:bg-primary/20 transition-all group relative overflow-hidden rounded-sm animate-pulse-border">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.05),transparent)] opacity-50"></div>
                  <div className="flex items-center gap-6 relative z-10">
                    <div className="size-16 bg-primary/20 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-black transition-all shadow-[0_0_20px_rgba(251,191,36,0.2)]">
                      <span className="material-symbols-outlined text-2xl">add_circle</span>
                    </div>
                    <div>
                      <h4 className="text-lg font-black text-white uppercase tracking-[0.2em] italic mb-1">Registrar Nova Missão</h4>
                      <p className="text-[10px] text-slate-400 font-mono uppercase tracking-widest">Configurar operação, LZ, tickets e briefing técnico.</p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-primary group-hover:translate-x-2 transition-transform text-3xl font-black">arrow_forward_ios</span>
                </Link>

                <div className="grid grid-cols-1 gap-4">
                  {events.filter(e => e.type === 'mission').map(event => (
                    <div key={event.id} className="card-hud p-6 flex flex-col md:flex-row items-center justify-between gap-6 hover:border-primary/40 transition-all border-l-4 border-l-primary group">
                      <div className="flex gap-6 items-center flex-1">
                        <div className="size-20 bg-black/60 border border-white/10 flex items-center justify-center relative overflow-hidden group-hover:border-primary/30">
                          {event.image_url ? (
                            <img src={event.image_url} alt={event.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                          ) : (
                            <span className="material-symbols-outlined text-white/10 text-4xl">military_tech</span>
                          )}
                          <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                             <span className="text-[8px] font-black px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-500 uppercase font-mono">Mission: {event.id.slice(0, 5)}</span>
                            <h4 className="text-base font-black text-white uppercase tracking-tighter italic">{event.title}</h4>
                          </div>
                          <div className="flex flex-wrap items-center gap-4 text-[9px] text-slate-500 font-mono uppercase tracking-[0.2em]">
                            <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[12px] text-primary">calendar_today</span> {new Date(event.event_date).toLocaleDateString()}</span>
                            <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[12px] text-primary">location_on</span> {event.location || 'COORDENADAS NÃO DEFINIDAS'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-10 w-full md:w-auto">
                        <div className="text-right flex-1 md:flex-none">
                          <span className="text-[8px] text-slate-600 font-black uppercase tracking-[0.3em] block mb-1 font-mono">Força Processada</span>
                          <div className="flex items-baseline justify-end gap-1">
                            <span className="text-lg font-black text-white">{event.sold_count}</span>
                            <span className="text-[9px] text-slate-600 font-mono">/ {event.capacity}</span>
                          </div>
                          <div className="h-1 w-24 bg-white/5 mt-1 rounded-full overflow-hidden">
                            <div className="h-full bg-primary" style={{ width: `${(event.sold_count / event.capacity) * 100}%` }}></div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => fetchParticipants(event.id)} className="p-3 bg-white/5 border border-white/5 text-slate-400 hover:text-primary hover:bg-primary/10 hover:border-primary/30 transition-all rounded-sm tooltip" title="Lista de Operadores"><span className="material-symbols-outlined text-base">groups</span></button>
                          <Link to={`/eventos/${event.id}`} className="p-3 bg-white/5 border border-white/5 text-slate-400 hover:text-primary hover:bg-primary/10 hover:border-primary/30 transition-all rounded-sm"><span className="material-symbols-outlined text-base">visibility</span></Link>
                          <Link to={`/organizador/eventos/${event.id}`} className="p-3 bg-white/5 border border-white/5 text-slate-400 hover:text-primary hover:bg-primary/10 hover:border-primary/30 transition-all rounded-sm"><span className="material-symbols-outlined text-base">settings</span></Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'drops' && (
              <div className="space-y-6">
                <Link to="/drop/criar" className="w-full flex items-center justify-between p-10 border border-dashed border-primary/40 bg-primary/10 hover:bg-primary/20 transition-all group relative overflow-hidden rounded-sm animate-pulse-border">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.05),transparent)] opacity-50"></div>
                  <div className="flex items-center gap-6 relative z-10">
                    <div className="size-16 bg-primary/20 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-black transition-all shadow-[0_0_20px_rgba(251,191,36,0.2)]">
                      <span className="material-symbols-outlined text-2xl">rocket</span>
                    </div>
                    <div>
                      <h4 className="text-lg font-black text-white uppercase tracking-[0.2em] italic mb-1">Lançar Novo Drop (Rifa)</h4>
                      <p className="text-[10px] text-slate-400 font-mono uppercase tracking-widest">Configurar prêmio militar, cotas, valores e regras de engajamento.</p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-primary group-hover:translate-x-2 transition-transform text-3xl font-black">arrow_forward_ios</span>
                </Link>

                <div className="grid grid-cols-1 gap-4">
                  {events.filter(e => e.type === 'drop').map(event => (
                    <div key={event.id} className="card-hud p-6 flex flex-col md:flex-row items-center justify-between gap-6 hover:border-primary/40 transition-all border-l-4 border-l-primary group">
                      <div className="flex gap-6 items-center flex-1">
                        <div className="size-20 bg-black/60 border border-white/10 flex items-center justify-center relative overflow-hidden group-hover:border-primary/30">
                          {event.image_url ? (
                            <img src={event.image_url} alt={event.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                          ) : (
                            <span className="material-symbols-outlined text-white/10 text-4xl">inventory_2</span>
                          )}
                          <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                             <span className="text-[8px] font-black px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-500 uppercase font-mono">ID-RAFFLE: {event.id.slice(0, 5)}</span>
                            <h4 className="text-base font-black text-white uppercase tracking-tighter italic">{event.title}</h4>
                          </div>
                          <div className="flex flex-wrap items-center gap-4 text-[9px] text-slate-500 font-mono uppercase tracking-[0.2em]">
                            <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[12px] text-primary">history</span> {new Date(event.event_date).toLocaleDateString()}</span>
                            <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[12px] text-primary">shopping_cart</span> {event.sold_count} VENDAS</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-10 w-full md:w-auto">
                        <div className="text-right flex-1 md:flex-none">
                          <span className="text-[8px] text-slate-600 font-black uppercase tracking-[0.3em] block mb-1 font-mono">Meta de Arrecadação</span>
                          <div className="flex items-baseline justify-end gap-1">
                            <span className="text-lg font-black text-white">{((event.sold_count / event.capacity) * 100).toFixed(0)}</span>
                            <span className="text-[9px] text-slate-600 font-mono">% COMPLETO</span>
                          </div>
                          <div className="h-1 w-24 bg-white/5 mt-1 rounded-full overflow-hidden">
                            <div className="h-full bg-primary" style={{ width: `${(event.sold_count / event.capacity) * 100}%` }}></div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Link to={`/drop/${event.slug || event.id}`} className="p-3 bg-white/5 border border-white/5 text-slate-400 hover:text-primary hover:bg-primary/10 hover:border-primary/30 transition-all rounded-sm"><span className="material-symbols-outlined text-base">visibility</span></Link>
                          <Link to={`/organizador/drop/${event.id}`} className="p-3 bg-white/5 border border-white/5 text-slate-400 hover:text-primary hover:bg-primary/10 hover:border-primary/30 transition-all rounded-sm"><span className="material-symbols-outlined text-base">settings</span></Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'logistics' && (
              <div className="space-y-8">
                <div className="card-hud p-10 relative overflow-hidden border-l-4 border-l-primary/40">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="size-12 bg-primary/10 flex items-center justify-center text-primary rounded-sm animate-pulse-border border border-primary/20">
                       <span className="material-symbols-outlined text-2xl">local_shipping</span>
                    </div>
                    <div>
                       <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">Fluxo de Logística</h3>
                       <p className="text-[9px] text-slate-500 font-mono uppercase tracking-widest">Monitoramento de envios e processamento de prêmios.</p>
                    </div>
                  </div>

                  {winners.length > 0 ? (
                    <div className="grid gap-4">
                      {winners.map((winner) => (
                        <div key={winner.id} className="bg-white/[0.03] border border-white/5 p-8 flex flex-col md:flex-row justify-between gap-6 hover:bg-white/[0.05] transition-all group">
                          <div className="flex-1">
                            <p className="text-[8px] text-primary font-black uppercase tracking-[0.2em] mb-2 font-mono flex items-center gap-2">
                              <span className="size-1.5 bg-primary rounded-full animate-pulse"></span>
                              {winner.raffles?.title}
                            </p>
                            <h4 className="text-base font-black text-white uppercase italic tracking-tight">{winner.winner_name}</h4>
                            <div className="flex items-center gap-4 mt-3">
                               <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono uppercase">
                                  <span className="material-symbols-outlined text-sm">calendar_month</span>
                                  {new Date(winner.created_at).toLocaleDateString()}
                               </div>
                            </div>
                          </div>
                          <div className="flex-1 max-w-sm">
                            {winner.delivery_status === 'shipped' ? (
                              <div className="bg-green-500/5 border border-green-500/20 p-4 flex items-center justify-between rounded-sm">
                                <div>
                                  <span className="text-[8px] text-green-500 font-black uppercase tracking-widest block mb-1">RASTREIO DISPONÍVEL</span>
                                  <span className="text-[11px] text-white font-mono font-bold tracking-widest">{winner.tracking_code}</span>
                                </div>
                                <div className="size-10 bg-green-500/20 flex items-center justify-center text-green-500 rounded-full">
                                  <span className="material-symbols-outlined text-xl">check_circle</span>
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col gap-2">
                                <span className="text-[8px] text-slate-600 font-black uppercase tracking-[0.1em] mb-1">AGUARDANDO ENVIO</span>
                                <div className="flex gap-2">
                                  <input 
                                    type="text" 
                                    placeholder="CÓD. RASTREIO" 
                                    className="flex-1 bg-black/40 border border-white/10 px-4 py-3 text-[10px] text-white focus:border-primary outline-none transition-all font-mono uppercase tracking-widest" 
                                    id={`tracking-${winner.id}`} 
                                  />
                                  <button 
                                    onClick={() => { const code = (document.getElementById(`tracking-${winner.id}`) as HTMLInputElement)?.value; handleUpdateTracking(winner.id, code); }} 
                                    disabled={updatingLogisticsId === winner.id} 
                                    className="bg-primary text-black px-6 py-3 text-[9px] font-black uppercase tracking-widest transition-all hover:brightness-110 disabled:opacity-50 shadow-[0_0_20px_rgba(251,191,36,0.1)]"
                                  >
                                    {updatingLogisticsId === winner.id ? '...' : 'DESPACHAR'}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-20 flex flex-col items-center justify-center border border-dashed border-white/10 bg-white/[0.01]">
                        <span className="material-symbols-outlined text-slate-800 text-6xl mb-4">inventory</span>
                        <p className="text-[10px] text-slate-700 font-black uppercase tracking-[0.3em]">Rede logística inativa. Nenhuma entrega pendente.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'reports' && (
              <div className="space-y-12 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* STATUS DE PATENTE - TACTICAL HUD */}
                <div className="card-hud p-10 relative overflow-hidden group border-l-4 border-l-primary/40">
                  <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden opacity-20">
                     <div className="absolute top-0 left-0 h-[1px] w-full bg-gradient-to-r from-transparent via-primary to-transparent animate-scanner"></div>
                  </div>
                  
                  <div className="flex flex-col lg:flex-row items-center gap-12 relative z-10">
                    <div className="size-32 rounded-full border-2 border-dashed border-primary/30 flex items-center justify-center relative p-2">
                       <div className="absolute inset-0 rounded-full animate-[spin_30s_linear_infinite] border border-primary/10"></div>
                       <div className={`size-24 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(251,191,36,0.15)] transition-all duration-700 ${stats.trustLevel >= 3 ? 'bg-primary text-black' : 'bg-slate-900 text-slate-700'}`}>
                          <span className="material-symbols-outlined text-4xl font-black">
                            {stats.trustLevel >= 3 ? 'military_tech' : 'lock'}
                          </span>
                       </div>
                       {stats.trustLevel >= 3 && <div className="absolute inset-0 rounded-full animate-ping bg-primary/10"></div>}
                    </div>
                    
                    <div className="flex-1 text-center lg:text-left">
                       <div className="flex flex-wrap items-center gap-3 justify-center lg:justify-start mb-4">
                          <span className={`text-[9px] font-black uppercase tracking-[0.4em] px-4 py-1.5 border-2 ${stats.trustLevel >= 5 ? 'border-yellow-500 text-yellow-500 bg-yellow-500/5' : stats.trustLevel >= 3 ? 'border-primary text-primary bg-primary/5' : 'border-slate-800 text-slate-700 bg-slate-900/50'}`}>
                             {stats.trustLevel >= 5 ? 'OPERADOR DE ELITE' : stats.trustLevel >= 3 ? 'OFICIAL TÁTICO' : 'RECRUTA EM AVALIAÇÃO'}
                          </span>
                          <div className="text-[10px] text-slate-600 font-mono tracking-widest uppercase bg-black/40 px-3 py-1 border border-white/5">SIG-INT: {user?.id.slice(0, 12)}</div>
                       </div>
                       
                       <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-6">
                          PROGRESSÃO DE <span className="text-primary">CONFIABILIDADE</span>
                       </h3>
                       
                       <div className="max-w-xl mx-auto lg:mx-0">
                          <div className="flex justify-between items-end mb-3">
                             <div className="flex flex-col">
                                <span className="text-[8px] text-slate-600 font-black uppercase tracking-[0.2em] mb-1">Status Atual</span>
                                <span className={`text-[10px] font-black uppercase ${stats.trustLevel < 3 ? 'text-white' : 'text-primary/60'}`}>Recruta (Nível {stats.trustLevel})</span>
                             </div>
                             <div className="text-right">
                                <span className="text-lg font-black text-primary font-mono">{stats.successfulShipments}</span>
                                <span className="text-[10px] text-slate-600 font-black uppercase ml-2">/ 3 Envios</span>
                             </div>
                          </div>
                          
                          <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden border border-white/5 p-[1px]">
                             <div 
                                className="h-full bg-gradient-to-r from-primary/40 to-primary transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(251,191,36,0.5)]"
                                style={{ width: `${Math.min((stats.successfulShipments / 3) * 100, 100)}%` }}
                             ></div>
                          </div>
                          
                          <div className="flex justify-between mt-3">
                             <span className="text-[8px] text-slate-600 font-mono italic">OPERADOR NÍVEL 1</span>
                             <span className="text-[8px] text-primary font-mono italic">PROMOÇÃO PARA OFICIAL</span>
                          </div>
                          
                          <div className="mt-8 p-4 bg-white/[0.02] border border-white/5 rounded-sm">
                             <p className="text-[10px] text-slate-500 font-medium leading-relaxed italic flex items-start gap-2">
                                <span className="material-symbols-outlined text-primary text-sm mt-0.5">info</span>
                                <span>Complete 3 envios com sucesso para desbloquear o <span className="text-white font-bold">Saque Imediato</span> e status de <span className="text-primary font-bold">Oficial Tático</span> na rede Perfection.</span>
                             </p>
                          </div>
                       </div>
                    </div>
                  </div>
                </div>

                {/* PIPELINES - GRID TÁTICO */}
                <div className="grid grid-cols-1 gap-12">
                   {/* DROP PIPELINE */}
                   <div>
                      <div className="flex items-center gap-3 mb-8 border-b border-primary/20 pb-4">
                         <span className="material-symbols-outlined text-primary text-xl">rocket_launch</span>
                         <h4 className="text-sm font-black text-white uppercase tracking-[0.4em] italic">Análise de Fluxo: Drops</h4>
                      </div>
                      
                      <div className="flex overflow-x-auto lg:grid lg:grid-cols-5 gap-4 pb-4 no-scrollbar -mx-6 px-6 lg:mx-0 lg:px-0">
                         {[
                           { label: 'Venda de Tickets', icon: 'confirmation_number', done: stats.ticketsSold > 0, desc: 'Tickets vendidos' },
                           { label: 'Sorteio do Prêmio', icon: 'casino', done: stats.completedDrops > 0, desc: 'Realização do sorteio' },
                           { label: 'Ganhador', icon: 'person_search', done: winners.length > 0, desc: 'Vencedor identificado' },
                           { label: 'Envio do Produto', icon: 'local_shipping', done: stats.successfulShipments > 0, desc: 'Logística de entrega' },
                           { label: 'Saque do Saldo', icon: 'payments', done: false, desc: 'Resgate de valores' }
                         ].map((step, idx) => (
                           <div key={idx} className={`flex-shrink-0 w-[160px] lg:w-full group p-6 lg:p-8 border transition-all relative overflow-hidden ${step.done ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-surface/10 border-white/10 border-dashed opacity-70'}`}>
                              {step.done && (
                                <div className="windows-loader">
                                   <div className="windows-loader-bar"></div>
                                </div>
                              )}
                              <div className="flex flex-col items-center text-center relative z-10">
                                 <span className={`material-symbols-outlined text-2xl lg:text-3xl mb-3 transition-transform group-hover:scale-110 ${step.done ? 'text-emerald-500 drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'text-slate-700'}`}>
                                   {step.icon}
                                 </span>
                                 <div className={`text-[9px] lg:text-[10px] font-black uppercase tracking-[0.2em] mb-2 ${step.done ? 'text-white' : 'text-slate-600'}`}>
                                   {step.label}
                                 </div>
                                 <div className="h-px w-6 bg-white/10 mb-3"></div>
                                 <p className="text-[8px] text-slate-500 font-mono uppercase italic tracking-tighter leading-tight tracking-[0.1em]">{step.desc}</p>
                              </div>
                           </div>
                         ))}
                      </div>
                   </div>

                   {/* EVENTS PIPELINE */}
                   <div>
                      <div className="flex items-center gap-3 mb-8 border-b border-white/10 pb-4">
                         <span className="material-symbols-outlined text-primary text-xl">map</span>
                         <h4 className="text-sm font-black text-white uppercase tracking-[0.4em] italic text-white/50">Fluxo Operacional: Missões</h4>
                      </div>
                      
                      <div className="flex overflow-x-auto lg:grid lg:grid-cols-5 gap-4 pb-4 no-scrollbar -mx-6 px-6 lg:mx-0 lg:px-0">
                         {[
                           { label: 'Cadastro de Campo', icon: 'domain', done: events.filter(e => e.type === 'mission').length > 0, desc: 'Área do jogo' },
                           { label: 'Cadastro de Missão', icon: 'description', done: events.filter(e => e.type === 'mission').length > 0, desc: 'Regras e briefings' },
                           { label: 'Venda de Tickets', icon: 'group_add', done: events.some(e => e.type === 'mission' && e.sold_count > 0), desc: 'Inscrições ativas' },
                           { label: 'Realização do Game', icon: 'sports_esports', done: events.some(e => e.type === 'mission' && new Date(e.event_date) < new Date()), desc: 'Missão em campo' },
                           { label: 'Saque do Saldo', icon: 'payments', done: false, desc: 'Resgate de valores' }
                         ].map((step, idx) => (
                           <div key={idx} className={`flex-shrink-0 w-[160px] lg:w-full group p-6 lg:p-8 border transition-all relative overflow-hidden ${step.done ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-surface/10 border-white/10 border-dashed opacity-60'}`}>
                              {step.done && (
                                <div className="windows-loader">
                                   <div className="windows-loader-bar"></div>
                                </div>
                              )}
                              <div className="flex flex-col items-center text-center relative z-10">
                                 <span className={`material-symbols-outlined text-2xl lg:text-3xl mb-3 transition-transform group-hover:scale-110 ${step.done ? 'text-emerald-500 drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'text-slate-700'}`}>
                                   {step.icon}
                                 </span>
                                 <div className={`text-[9px] lg:text-[10px] font-black uppercase tracking-[0.2em] mb-2 ${step.done ? 'text-white' : 'text-slate-600'}`}>
                                   {step.label}
                                 </div>
                                 <div className="h-px w-6 bg-white/10 mb-3"></div>
                                 <p className="text-[8px] text-slate-500 font-mono uppercase italic tracking-tighter leading-tight tracking-[0.1em]">{step.desc}</p>
                              </div>
                           </div>
                         ))}
                      </div>
                   </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Participants Modal (Simplified Copy) */}
      {isParticipantsModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-12">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-md" onClick={() => setIsParticipantsModalOpen(false)}></div>
          <div className="relative w-full max-w-4xl bg-[#0a0a0a] border border-primary/20 shadow-[0_0_60px_rgba(0,0,0,1)] overflow-hidden rounded-sm">
             {/* Scanner line relative to the modal */}
             <div className="absolute top-0 left-0 w-full h-[1px] bg-primary animate-scanner opacity-30"></div>
             
             <div className="bg-primary/10 border-b border-primary/20 p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                   <div className="size-10 bg-primary/20 flex items-center justify-center text-primary group">
                      <span className="material-symbols-outlined group-hover:rotate-180 transition-transform duration-700">groups</span>
                   </div>
                   <div>
                      <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">Manifesto de Operadores</h3>
                      <p className="text-[9px] text-slate-500 font-mono uppercase tracking-[0.2em]">Lista confirmada de tropas para a missão.</p>
                   </div>
                </div>
                <button onClick={() => setIsParticipantsModalOpen(false)} className="size-10 flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/5 transition-all"><span className="material-symbols-outlined">close</span></button>
             </div>
             
             <div className="p-8 max-h-[70vh] overflow-y-auto">
                {loadingParticipants ? (
                  <div className="py-24 flex flex-col items-center justify-center gap-4">
                     <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-primary" />
                     <span className="text-[10px] text-primary font-black uppercase tracking-widest animate-pulse">Consultando Satélite...</span>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-white/10 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] text-left">
                          <th className="pb-4 px-4 font-mono">Operador_Data</th>
                          <th className="pb-4 px-4 font-mono">Status_ID</th>
                          <th className="pb-4 px-4 font-mono">Comms</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 border-b border-white/5">
                        {selectedEventParticipants.length > 0 ? selectedEventParticipants.map(p => (
                          <tr key={p.id} className="text-[11px] hover:bg-primary/[0.02] transition-colors group">
                            <td className="py-5 px-4">
                              <div className="font-black uppercase text-white tracking-tight text-sm mb-1">{p.buyer_name}</div>
                              <div className="text-[9px] text-slate-500 font-mono uppercase tracking-widest">{p.buyer_email}</div>
                            </td>
                            <td className="py-5 px-4">
                               <div className="flex items-center gap-2">
                                  <span className="size-1.5 bg-primary rounded-full shadow-[0_0_8px_rgba(251,191,36,0.5)]"></span>
                                  <span className="text-[9px] font-black uppercase text-primary tracking-widest">ACTIVE_OPERATOR</span>
                               </div>
                            </td>
                            <td className="py-5 px-4">
                               {p.buyer_phone && (
                                 <button onClick={() => window.open(`https://wa.me/${p.buyer_phone.replace(/\D/g, '')}`, '_blank')} className="px-4 py-2 bg-green-500/10 text-green-500 flex items-center justify-center hover:bg-green-500 hover:text-black transition-all gap-2 rounded-sm border border-green-500/20 group">
                                   <span className="material-symbols-outlined text-sm font-black">chat</span>
                                   <span className="text-[9px] font-black uppercase tracking-widest">WhatsApp</span>
                                 </button>
                               )}
                            </td>
                          </tr>
                        )) : (
                          <tr>
                             <td colSpan={3} className="py-20 text-center">
                                <p className="text-[10px] text-slate-700 font-black uppercase tracking-[0.3em]">Nenhum operador mobilizado para esta missão.</p>
                             </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
             </div>
             
             <div className="bg-black/40 p-4 border-t border-white/5 flex justify-between items-center px-8">
                <span className="text-[8px] text-slate-700 font-mono italic uppercase">Total Troops: {selectedEventParticipants.length}</span>
                <span className="text-[8px] text-primary/40 font-mono uppercase tracking-[0.2em] font-black">End Encryption: Active</span>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
