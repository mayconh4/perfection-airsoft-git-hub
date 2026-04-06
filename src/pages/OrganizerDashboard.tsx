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
        .animate-scanner {
          animation: scan 3s linear infinite;
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
              <h1 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter leading-none italic">
                PAINEL DE <span className="text-primary">ELITE</span>
              </h1>
            </div>
            <div className="flex flex-wrap gap-4">
              <Link
                to="/organizador/financeiro"
                className="bg-primary/20 border border-primary text-primary font-black py-4 px-8 text-[10px] uppercase tracking-[0.3em] hover:bg-primary hover:text-black transition-all text-center flex items-center gap-2 shadow-[0_0_15px_rgba(251,191,36,0.1)] group"
              >
                <span className="material-symbols-outlined text-sm group-hover:rotate-12 transition-transform">payments</span>
                Central Financeira
              </Link>
              <Link
                to="/drop/criar"
                className="bg-primary text-background-dark font-black py-4 px-8 text-[10px] uppercase tracking-[0.3em] hover:bg-white transition-all text-center flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">inventory_2</span>
                Novo Drop (Rifa)
              </Link>
              <Link
                to="/eventos/criar"
                className="bg-white/5 border border-white/10 text-white font-black py-4 px-8 text-[10px] uppercase tracking-[0.3em] hover:bg-white hover:text-black transition-all text-center flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">military_tech</span>
                Nova Missão (Evento)
              </Link>
            </div>
          </div>

          <div className={`border p-8 mb-8 relative overflow-hidden group transition-all duration-500 ${stats.trustLevel >= 3 ? 'bg-primary/10 border-primary/40 shadow-[0_0_30px_rgba(251,191,36,0.1)]' : 'bg-surface/40 border-white/5'}`}>
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="flex items-center gap-6">
                <div className={`size-24 bg-black/60 border-2 flex items-center justify-center relative group-hover:scale-110 transition-transform ${stats.trustLevel >= 3 ? 'border-primary shadow-[0_0_15px_rgba(251,191,36,0.3)]' : 'border-white/20'}`}>
                  <span className="material-symbols-outlined text-5xl font-black text-slate-600">
                    {stats.trustLevel >= 3 ? 'military_tech' : 'verified_user'}
                  </span>
                  <div className="absolute -bottom-2 -right-2 bg-primary text-black font-black text-[9px] px-2 py-0.5 rounded-sm">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12">
            <div className="bg-surface/30 border border-white/5 p-8 group hover:bg-white/5 transition-colors">
              <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest block mb-1">Operações Monitoradas</span>
              <span className="text-4xl font-black text-white">{events.length}</span>
            </div>
            <div className="bg-surface/30 border border-white/5 p-8 group hover:bg-white/5 transition-colors">
              <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest block mb-1">Engajamento Total</span>
              <span className="text-4xl font-black text-white">{stats.ticketsSold}</span>
              <p className="text-[8px] text-slate-600 font-mono uppercase mt-2">Tickets / Inscrições Processadas</p>
            </div>
          </div>

          <div className="flex items-center gap-8 border-b border-white/5 mb-12">
            {['missions', 'drops', 'logistics', 'reports'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`pb-4 text-[10px] uppercase font-black tracking-[0.3em] transition-all relative ${activeTab === tab ? 'text-primary' : 'text-slate-500 hover:text-white'}`}
              >
                {tab === 'missions' ? 'Operações Ativas' : tab === 'drops' ? 'Drops / Rifas' : tab === 'logistics' ? 'Logística' : 'Relatórios'}
                {activeTab === tab && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary"></span>}
              </button>
            ))}
          </div>

          <div className="min-h-[400px]">
            {activeTab === 'missions' && (
              <div className="space-y-6">
                <Link to="/eventos/criar" className="w-full flex items-center justify-between p-6 border border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="size-12 bg-primary/20 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-black transition-all">
                      <span className="material-symbols-outlined">add_circle</span>
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-white uppercase tracking-widest">Registrar Nova Missão</h4>
                      <p className="text-[10px] text-slate-500 font-mono uppercase">Configurar operação, LZ, tickets e briefing.</p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-primary group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </Link>

                <div className="space-y-4">
                  {events.filter(e => e.type === 'mission').map(event => (
                    <div key={event.id} className="bg-surface/20 border border-white/10 p-6 flex flex-col md:flex-row items-center justify-between gap-6 hover:border-primary/30 transition-all">
                      <div className="flex gap-6 items-center flex-1">
                        <div className="size-16 bg-white/5 flex items-center justify-center relative overflow-hidden">
                          {event.image_url ? <img src={event.image_url} alt={event.title} className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-white/10 text-3xl">military_tech</span>}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-black text-white uppercase tracking-widest">{event.title}</h4>
                            <span className="text-[7px] font-black px-1.5 py-0.5 rounded bg-white/10 text-white/50">MISSION</span>
                          </div>
                          <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">{new Date(event.event_date).toLocaleDateString()} • {event.location || 'ONLINE'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-8 text-center md:text-right w-full md:w-auto">
                        <div>
                          <span className="text-[10px] text-slate-600 font-black uppercase tracking-widest block mb-1">Vendas</span>
                          <span className="text-sm font-black text-white">{event.sold_count} / {event.capacity}</span>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => fetchParticipants(event.id)} className="p-3 bg-white/5 border border-white/10 text-white/50 hover:text-primary transition-all"><span className="material-symbols-outlined text-sm">groups</span></button>
                          <Link to={`/eventos/${event.id}`} className="p-3 bg-white/5 border border-white/10 text-white/50 hover:text-primary transition-all"><span className="material-symbols-outlined text-sm">visibility</span></Link>
                          <Link to={`/organizador/eventos/${event.id}`} className="p-3 bg-white/5 border border-white/10 text-white/40 hover:text-primary transition-all"><span className="material-symbols-outlined text-sm">edit_note</span></Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'drops' && (
              <div className="space-y-6">
                <Link to="/drop/criar" className="w-full flex items-center justify-between p-6 border border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="size-12 bg-primary/20 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-black transition-all">
                      <span className="material-symbols-outlined">rocket</span>
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-white uppercase tracking-widest">Lançar Novo Drop (Rifa)</h4>
                      <p className="text-[10px] text-slate-500 font-mono uppercase">Configurar prêmio, cotas, valores e regras.</p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-primary group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </Link>
                <div className="space-y-4">
                  {events.filter(e => e.type === 'drop').map(event => (
                    <div key={event.id} className="bg-surface/20 border border-white/10 p-6 flex flex-col md:flex-row items-center justify-between gap-6 hover:border-primary/30 transition-all">
                      <div className="flex gap-6 items-center flex-1">
                        <div className="size-16 bg-white/5 flex items-center justify-center relative overflow-hidden">
                          {event.image_url ? <img src={event.image_url} alt={event.title} className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-white/10 text-3xl">local_mall</span>}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-black text-white uppercase tracking-widest">{event.title}</h4>
                            <span className="text-[7px] font-black px-1.5 py-0.5 rounded bg-primary text-black">DROP</span>
                          </div>
                          <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">Criado em: {new Date(event.event_date).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-8 text-center md:text-right w-full md:w-auto">
                        <div>
                          <span className="text-[10px] text-slate-600 font-black uppercase tracking-widest block mb-1">Tickets</span>
                          <span className="text-sm font-black text-white">{event.sold_count} / {event.capacity}</span>
                        </div>
                        <div className="flex gap-2">
                          <Link to={`/drop/${event.slug || event.id}`} className="p-3 bg-white/5 border border-white/10 text-white/50 hover:text-primary transition-all"><span className="material-symbols-outlined text-sm">visibility</span></Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'logistics' && (
              <div className="space-y-8">
                <div className="bg-surface/20 border border-white/5 p-8">
                  <h3 className="text-xl font-black text-white uppercase italic tracking-tighter mb-6 flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary">local_shipping</span>
                    Logística
                  </h3>
                  {winners.length > 0 ? (
                    <div className="grid gap-4">
                      {winners.map((winner) => (
                        <div key={winner.id} className="bg-black/40 border border-white/5 p-6 flex flex-col md:flex-row justify-between gap-6">
                          <div className="flex-1">
                            <p className="text-[10px] text-primary font-black uppercase tracking-widest mb-1">{winner.raffles?.title}</p>
                            <h4 className="text-sm font-bold text-white uppercase">{winner.winner_name}</h4>
                            <p className="text-[10px] text-slate-500 font-mono mt-1">GANHADOR EM: {new Date(winner.created_at).toLocaleDateString()}</p>
                          </div>
                          <div className="flex-1 max-w-xs">
                            {winner.delivery_status === 'shipped' ? (
                              <div className="bg-green-500/10 border border-green-500/20 p-3 flex items-center justify-between">
                                <span className="text-[9px] text-green-500 font-black uppercase">Enviado: {winner.tracking_code}</span>
                                <span className="material-symbols-outlined text-green-500 text-sm">check_circle</span>
                              </div>
                            ) : (
                              <div className="flex gap-2">
                                <input type="text" placeholder="CÓD. RASTREIO" className="flex-1 bg-white/5 border border-white/10 px-3 py-2 text-[10px] text-white focus:border-primary outline-none" id={`tracking-${winner.id}`} />
                                <button onClick={() => { const code = (document.getElementById(`tracking-${winner.id}`) as HTMLInputElement)?.value; handleUpdateTracking(winner.id, code); }} disabled={updatingLogisticsId === winner.id} className="bg-primary text-black px-4 py-2 text-[9px] font-black uppercase transition-all disabled:opacity-50">{updatingLogisticsId === winner.id ? '...' : 'ENVIAR'}</button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-[10px] text-slate-600 font-black text-center py-12 border border-dashed border-white/5 uppercase">Nenhuma entrega pendente.</p>}
                </div>
              </div>
            )}

            {activeTab === 'reports' && (
              <div className="space-y-12 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* STATUS DE PATENTE */}
                <div className="bg-surface/30 border border-white/10 p-10 relative overflow-hidden">
                  <div className="flex flex-col md:flex-row items-center gap-10 relative z-10">
                    <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
                      <div className="absolute top-0 left-0 h-[2px] w-full bg-gradient-to-r from-transparent via-primary/30 to-transparent animate-scanner" />
                    </div>
                    
                    <div className="size-24 rounded-full border-4 border-primary/20 flex items-center justify-center relative">
                      <div className={`size-16 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(251,191,36,0.3)] ${stats.trustLevel >= 3 ? 'bg-primary text-black' : 'bg-slate-800 text-slate-500'}`}>
                        <span className="material-symbols-outlined text-3xl font-black">
                          {stats.trustLevel >= 3 ? 'military_tech' : 'person'}
                        </span>
                      </div>
                      {/* Aura de Patente */}
                      {stats.trustLevel >= 3 && <div className="absolute inset-0 rounded-full animate-ping bg-primary/20" />}
                    </div>
                    
                    <div className="flex-1 text-center md:text-left">
                      <div className="flex items-center gap-3 justify-center md:justify-start mb-2">
                        <span className={`text-[10px] font-black uppercase tracking-[0.4em] px-3 py-1 border ${stats.trustLevel >= 5 ? 'border-yellow-500 text-yellow-500' : stats.trustLevel >= 3 ? 'border-primary text-primary' : 'border-slate-500 text-slate-500'}`}>
                          {stats.trustLevel >= 5 ? 'OPERADOR ELITE' : stats.trustLevel >= 3 ? 'OFICIAL 1' : 'RECRUTA'}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">ID: {user?.id.slice(0, 8)}</span>
                      </div>
                      <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-4">
                        PROXIMA META: <span className="text-primary">{stats.trustLevel >= 3 ? 'SAQUE IMEDIATO' : 'CONFIABILIDADE OPERACIONAL'}</span>
                      </h3>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between items-end text-[9px] font-black text-slate-500 uppercase mb-1">
                          <div className="flex flex-col items-start gap-1">
                            <span className="text-[7px] text-slate-600 tracking-widest">NÍVEL ATUAL</span>
                            <span className={stats.trustLevel < 3 ? 'text-white' : ''}>RECRUTA</span>
                          </div>
                          <div className="text-center pb-1">
                            <span className="text-[10px] text-primary">{stats.successfulShipments} / 3</span>
                            <div className="text-[7px] tracking-tighter opacity-50">ENVIOS</div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-[7px] text-slate-600 tracking-widest">PRÓX. PATENTE</span>
                            <span className={stats.trustLevel >= 3 ? 'text-primary' : ''}>OFICIAL 1</span>
                          </div>
                        </div>
                        <div className="h-2 w-full bg-white/5 overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all duration-1000 ease-out"
                            style={{ width: `${Math.min((stats.successfulShipments / 3) * 100, 100)}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-slate-600 font-medium leading-relaxed italic mt-2">
                          * 3 envios confirmados garantem a promoção para OFICIAL 1 e agilizam seus resgates.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* PIPELINE TÁTICO DE DROPS */}
                <div>
                  <div className="flex items-center gap-3 mb-8">
                    <span className="material-symbols-outlined text-primary">analytics</span>
                    <h4 className="text-sm font-black text-white uppercase tracking-[0.3em]">Fluxo Operacional (Drops)</h4>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {[
                      { label: 'Venda de Ticket', icon: 'confirmation_number', done: stats.ticketsSold > 0, desc: 'Engajamento da base' },
                      { label: 'Sorteio', icon: 'casino', done: stats.completedDrops > 0, desc: 'Randomização tática' },
                      { label: 'Ganhador Escolhido', icon: 'military_tech', done: winners.length > 0, desc: 'Seleção do operador' },
                      { label: 'Envio Equipamento', icon: 'local_shipping', done: stats.successfulShipments > 0, desc: 'Entrega confirmada' },
                      { label: 'Saque', icon: 'payments', done: false, desc: 'Resgate de provisões' }
                    ].map((step, idx) => (
                      <div key={idx} className={`p-6 border transition-all ${step.done ? 'bg-primary/5 border-primary/30 shadow-[0_0_20px_rgba(251,191,36,0.05)]' : 'bg-surface/10 border-white/5 opacity-40'}`}>
                        <div className="flex flex-col items-center text-center">
                          <span className={`material-symbols-outlined text-2xl mb-4 ${step.done ? 'text-primary' : 'text-slate-700'}`}>
                            {step.icon}
                          </span>
                          <div className={`text-[9px] font-black uppercase tracking-widest mb-1 ${step.done ? 'text-white' : 'text-slate-600'}`}>
                            {step.label}
                          </div>
                          <p className="text-[8px] text-slate-500 font-mono uppercase italic">{step.desc}</p>
                          {step.done && (
                            <div className="mt-4 flex items-center gap-1 text-[8px] font-black text-primary animate-pulse">
                              <span className="material-symbols-outlined text-[12px]">check</span>
                              CONCLUÍDO
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-3 mb-8 text-white/40">
                    <span className="material-symbols-outlined text-primary">event_available</span>
                    <h4 className="text-sm font-black text-white uppercase tracking-[0.3em]">Fluxo de Eventos Presenciais</h4>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {[
                      { label: 'Cadastro do Campo', icon: 'domain', done: events.filter(e => e.type === 'mission').length > 0, desc: 'Reconhecimento de área' },
                      { label: 'Cadastro da Missão', icon: 'assignment', done: events.filter(e => e.type === 'mission').length > 0, desc: 'Briefing estratégico' },
                      { label: 'Venda de Ticket', icon: 'confirmation_number', done: events.some(e => e.type === 'mission' && e.sold_count > 0), desc: 'Mobilização de tropas' },
                      { label: 'Realização do Game', icon: 'sports_esports', done: events.some(e => e.type === 'mission' && new Date(e.event_date) < new Date()), desc: 'Operação em campo' },
                      { label: 'Saque', icon: 'payments', done: false, desc: 'Extração de recursos' }
                    ].map((step, idx) => (
                      <div key={idx} className={`p-6 border transition-all ${step.done ? 'bg-primary/5 border-primary/30 shadow-[0_0_20px_rgba(251,191,36,0.05)]' : 'bg-surface/10 border-white/5 opacity-40'}`}>
                        <div className="flex flex-col items-center text-center">
                          <span className={`material-symbols-outlined text-2xl mb-4 ${step.done ? 'text-primary' : 'text-slate-700'}`}>
                            {step.icon}
                          </span>
                          <div className={`text-[9px] font-black uppercase tracking-widest mb-1 ${step.done ? 'text-white' : 'text-slate-600'}`}>
                            {step.label}
                          </div>
                          <p className="text-[8px] text-slate-500 font-mono uppercase italic">{step.desc}</p>
                          {step.done && (
                            <div className="mt-4 flex items-center gap-1 text-[8px] font-black text-primary animate-pulse">
                              <span className="material-symbols-outlined text-[12px]">check</span>
                              CONCLUÍDO
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
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
          <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => setIsParticipantsModalOpen(false)}></div>
          <div className="relative w-full max-w-4xl bg-surface/90 border border-primary/30 p-8 pt-12 shadow-[0_0_50px_rgba(251,191,36,0.1)] overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>
             <button onClick={() => setIsParticipantsModalOpen(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"><span className="material-symbols-outlined">close</span></button>
             <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-8 shadow-sm">LISTA DE <span className="text-primary">OPERADORES</span></h3>
             
             {loadingParticipants ? (
               <div className="py-20 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary" /></div>
             ) : (
               <div className="overflow-x-auto">
                 <table className="w-full border-collapse">
                   <thead>
                     <tr className="border-b border-white/5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-left">
                       <th className="pb-4 px-4">Operador</th>
                       <th className="pb-4 px-4">Status</th>
                       <th className="pb-4 px-4">Ações</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-white/5">
                     {selectedEventParticipants.map(p => (
                       <tr key={p.id} className="text-[11px] hover:bg-white/5 transition-colors group">
                         <td className="py-4 px-4">
                           <div className="font-black uppercase text-white">{p.buyer_name}</div>
                           <div className="text-[9px] text-slate-500 font-mono">{p.buyer_email}</div>
                         </td>
                         <td className="py-4 px-4">
                            <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase bg-primary/20 text-primary">CONFIRMADO</span>
                         </td>
                         <td className="py-4 px-4">
                            {p.buyer_phone && (
                              <button onClick={() => window.open(`https://wa.me/${p.buyer_phone.replace(/\D/g, '')}`, '_blank')} className="size-8 bg-green-500/10 text-green-500 flex items-center justify-center hover:bg-green-500 hover:text-black transition-all">
                                <span className="material-symbols-outlined text-sm">chat</span>
                              </button>
                            )}
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
             )}
          </div>
        </div>
      )}
    </div>
  );
}
