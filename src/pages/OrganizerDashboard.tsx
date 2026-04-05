import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SEO } from '../components/SEO';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { OperatorKYCForm } from '../components/OperatorKYCForm';

interface EventStats {
  ticketsSold: number;
  revenue: number;
  netRevenue: number;
  pendingBalance: number;
  trustLevel: number;
  completedDrops: number;
}

export default function OrganizerDashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<any[]>([]);
  const [stats, setStats] = useState<EventStats>({ ticketsSold: 0, revenue: 0, netRevenue: 0, pendingBalance: 0, trustLevel: 0, completedDrops: 0 });
  const [activeTab, setActiveTab] = useState<'missions' | 'drops' | 'logistics' | 'reports'>('missions');
  const [winners, setWinners] = useState<any[]>([]);
  const [updatingLogisticsId, setUpdatingLogisticsId] = useState<string | null>(null);
  const [activeRaffle, setActiveRaffle] = useState<any>(null); // Contexto de edição/intel
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
      
      // Suporte a foco em evento específico via URL (?event=ID)
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
      // 1. Buscar Saldo Real da nova tabela user_balances
      const { data: balanceData } = await supabase
        .from('user_balances')
        .select('available_balance, pending_balance, total_earned')
        .eq('user_id', user?.id)
        .single();

      // 2. Buscar todos os eventos do organizador
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .eq('organizer_id', user?.id)
        .order('event_date', { ascending: false });

      if (eventsError) throw eventsError;

      // 2.2 Buscar todas as rifas/drops do organizador
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

      let totalSold = 0;
      if (allOps.length > 0) {
        totalSold = allOps.reduce((sum, e) => sum + (e.sold_count || 0), 0);
      }

      // 2.5 Buscar Dados de Confiança e Role do Perfil (PRIORIDADE ADMIN)
      const { data: profile } = await supabase
        .from('profiles')
        .select('trust_level, completed_drops, role, full_name, role_request')
        .eq('id', user?.id)
        .single();

      // Verificação de parâmetro de edição administrativa
      const urlParams = new URLSearchParams(window.location.search);
      const editId = urlParams.get('edit');

      let statsToSet = {
        ticketsSold: totalSold,
        revenue: balanceData?.total_earned ? Number(balanceData.total_earned) : 0,
        netRevenue: balanceData?.available_balance ? Number(balanceData.available_balance) : 0,
        pendingBalance: balanceData?.pending_balance ? Number(balanceData.pending_balance) : 0,
        trustLevel: profile?.trust_level || 0,
        completedDrops: profile?.completed_drops || 0
      };

      if (editId) {
        const { data: editRaffle } = await supabase
          .from('raffles')
          .select('*, profiles(full_name, phone)')
          .eq('id', editId)
          .single();

        if (editRaffle) {
          setActiveRaffle(editRaffle);
          statsToSet = {
            ...statsToSet,
            ticketsSold: editRaffle.sold_tickets,
            revenue: editRaffle.sold_tickets * editRaffle.ticket_price,
            netRevenue: editRaffle.sold_tickets * editRaffle.ticket_price * 0.93,
            pendingBalance: editRaffle.total_tickets - editRaffle.sold_tickets,
          };
        }
      }

      setStats(statsToSet);

      // 3. Buscar Ganhadores (Logística)
      const { data: winnersData } = await supabase
        .from('raffle_winners')
        .select('*, raffles(title, creator_id)')
        .order('created_at', { ascending: false });

      setWinners(winnersData || []);

    } catch (err: any) {
      console.error('Erro no Dashboard:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('dashboard-updates')
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
        .select('*, events(title)')
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

  const handleRequestPayout = async () => {
    if (stats.netRevenue <= 0) {
      alert('SALDO INSUFICIENTE PARA RESGATE.');
      return;
    }

    if (!confirm('DESEJA SOLICITAR O RESGATE TOTAL DO SEU SALDO PARA SUA CONTA BANCÁRIA CADASTRADA?')) {
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/asaas-request-payout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
        },
        body: JSON.stringify({ userId: user?.id })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Falha ao processar saque.');
      }

      alert(`MISSÃO CUMPRIDA! Resgate de R$ ${result.value.toFixed(2)} processado com sucesso.`);
      fetchDashboardData();
    } catch (err: any) {
      console.error('Erro no Saque:', err.message);
      alert(`ERRO NA OPERAÇÃO: ${err.message}`);
    } finally {
      // Payout process completed
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

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 mb-12">
            <div className="bg-surface/30 border border-white/5 p-8 group hover:bg-white/5 transition-colors">
              <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest block mb-1">Operações Totais</span>
              <span className="text-4xl font-black text-white">{events.length}</span>
            </div>
            <div className={`border p-8 border-l-4 transition-all duration-500 bg-primary/5 border-primary border-white/10`}>
              <span className={`text-[10px] font-black uppercase tracking-widest block mb-1 font-mono italic text-primary`}>
                {activeRaffle ? 'Telemetria: Receita Bruta' : 'Saldo Disponível'}
              </span>
              <div className="flex items-baseline gap-2">
                <span className={`text-4xl font-black text-primary`}>
                  R$ {activeRaffle 
                    ? (activeRaffle.sold_tickets * activeRaffle.ticket_price).toFixed(2) 
                    : stats.netRevenue.toFixed(2)}
                </span>
              </div>
              <p className="text-[7px] text-slate-600 uppercase mt-2 font-mono">Taxa: 7% + R$ 0,99 PIX</p>
            </div>
            <div className="bg-surface/30 border border-white/5 p-8">
              <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest block mb-1">
                {activeRaffle ? 'Telemetria: Tickets Ativos' : 'Saldo em Garantia'}
              </span>
              <span className="text-4xl font-black text-white/60">
                {activeRaffle ? activeRaffle.sold_tickets : `R$ ${stats.pendingBalance.toFixed(2)}`}
              </span>
            </div>
            <div className="bg-surface/30 border border-white/5 p-8">
              <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest block mb-1">
                {activeRaffle ? 'Telemetria: Tickets Restantes' : 'Total Movimentado'}
              </span>
              <span className="text-4xl font-black text-white">
                {activeRaffle ? (activeRaffle.total_tickets - activeRaffle.sold_tickets) : `R$ ${stats.revenue.toFixed(2)}`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-8 border-b border-white/5 mb-12">
            <button
              onClick={() => setActiveTab('missions')}
              className={`pb-4 text-[10px] uppercase font-black tracking-[0.3em] transition-all relative ${activeTab === 'missions' ? 'text-primary' : 'text-slate-500 hover:text-white'}`}
            >
              Operações Ativas
              {activeTab === 'missions' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary"></span>}
            </button>
            <button
              onClick={() => setActiveTab('drops')}
              className={`pb-4 text-[10px] uppercase font-black tracking-[0.3em] transition-all relative ${activeTab === 'drops' ? 'text-primary' : 'text-slate-500 hover:text-white'}`}
            >
              Drops / Rifas
              {activeTab === 'drops' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary"></span>}
            </button>
            <button
              onClick={() => setActiveTab('logistics')}
              className={`pb-4 text-[10px] uppercase font-black tracking-[0.3em] transition-all relative ${activeTab === 'logistics' ? 'text-primary' : 'text-slate-500 hover:text-white'}`}
            >
              Logística
              {activeTab === 'logistics' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary"></span>}
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`pb-4 text-[10px] uppercase font-black tracking-[0.3em] transition-all relative ${activeTab === 'reports' ? 'text-primary' : 'text-slate-500 hover:text-white'}`}
            >
              Relatórios
              {activeTab === 'reports' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary"></span>}
            </button>
          </div>

          <div className="min-h-[400px]">
            {activeTab === 'missions' && (
              <div className="space-y-6 max-w-4xl">
                {/* Quick Create Action */}
                <Link 
                  to="/eventos/criar"
                  className="w-full flex items-center justify-between p-6 border border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 transition-all group"
                >
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
                {events.filter(e => e.type === 'mission').length > 0 ? (
                  events.filter(e => e.type === 'mission').map(event => (
                    <div 
                      key={event.id} 
                      id={`event-${event.id}`}
                      className="bg-surface/20 border border-white/10 p-6 flex flex-col md:flex-row items-center justify-between gap-6 hover:border-primary/30 transition-all"
                    >
                      <div className="flex gap-6 items-center flex-1">
                        <div className="size-16 bg-white/5 flex items-center justify-center relative overflow-hidden">
                          {event.image_url ? (
                            <img src={event.image_url} alt={event.title} className="w-full h-full object-cover" />
                          ) : (
                            <span className="material-symbols-outlined text-white/10 text-3xl">military_tech</span>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-black text-white uppercase tracking-widest">{event.title}</h4>
                            <span className="text-[7px] font-black px-1.5 py-0.5 rounded bg-white/10 text-white/50">
                              MISSION
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">
                            {new Date(event.event_date).toLocaleDateString()} • {event.location || 'ONLINE'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-8 text-center md:text-right w-full md:w-auto">
                        <div>
                          <span className="text-[10px] text-slate-600 font-black uppercase tracking-widest block mb-1">Vendas</span>
                          <span className="text-sm font-black text-white">{event.sold_count} / {event.capacity}</span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => fetchParticipants(event.id)}
                            className="p-3 bg-white/5 border border-white/10 text-white/50 hover:text-primary transition-all"
                            title="Ver Operadores"
                          >
                            <span className="material-symbols-outlined text-sm">groups</span>
                          </button>
                          <Link
                            to={`/eventos/${event.id}`}
                            className="p-3 bg-white/5 border border-white/10 text-white/50 hover:text-primary transition-all"
                            title="Ver Página"
                          >
                            <span className="material-symbols-outlined text-sm">visibility</span>
                          </Link>
                          <Link
                            title="Editar Detalhes da Missão"
                            to={`/organizador/eventos/${event.id}`}
                            className="p-3 bg-white/5 border border-white/10 text-white/40 hover:text-primary transition-all"
                          >
                            <span className="material-symbols-outlined text-sm">edit_note</span>
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-20 border border-dashed border-white/5 bg-surface/10">
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Nenhuma missão em andamento.</p>
                  </div>
                )}
                </div>
              </div>
            )}

            {activeTab === 'drops' && (
              <div className="space-y-6 max-w-4xl">
                {/* Quick Create Action */}
                <Link 
                  to="/drop/criar"
                  className="w-full flex items-center justify-between p-6 border border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 transition-all group"
                >
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
                {events.filter(e => e.type === 'drop').length > 0 ? (
                  events.filter(e => e.type === 'drop').map(event => (
                    <div key={event.id} className="bg-surface/20 border border-white/10 p-6 flex flex-col md:flex-row items-center justify-between gap-6 hover:border-primary/30 transition-all">
                      <div className="flex gap-6 items-center flex-1">
                        <div className="size-16 bg-white/5 flex items-center justify-center relative overflow-hidden">
                          {event.image_url ? (
                            <img src={event.image_url} alt={event.title} className="w-full h-full object-cover" />
                          ) : (
                            <span className="material-symbols-outlined text-white/10 text-3xl">local_mall</span>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-black text-white uppercase tracking-widest">{event.title}</h4>
                            <span className="text-[7px] font-black px-1.5 py-0.5 rounded bg-primary text-black">
                              DROP
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">
                            Criado em: {new Date(event.event_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-8 text-center md:text-right w-full md:w-auto">
                        <div>
                          <span className="text-[10px] text-slate-600 font-black uppercase tracking-widest block mb-1">Tickets</span>
                          <span className="text-sm font-black text-white">{event.sold_count} / {event.capacity}</span>
                        </div>
                        <div className="flex gap-2">
                          <Link
                            to={`/drop/${event.slug || event.id}`}
                            className="p-3 bg-white/5 border border-white/10 text-white/50 hover:text-primary transition-all"
                            title="Ver Drop"
                          >
                            <span className="material-symbols-outlined text-sm">visibility</span>
                          </Link>
                          <Link
                            to={`/organizador?edit=${event.id}`}
                            className="p-3 bg-white/5 border border-white/10 text-white/50 hover:text-primary transition-all"
                            title="Editar Drop"
                          >
                            <span className="material-symbols-outlined text-sm">settings</span>
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-20 text-center border-2 border-dashed border-white/5 text-slate-600 uppercase font-black tracking-widest text-[10px]">
                    Nenhum drop ativo encontrado.
                  </div>
                )}
                </div>
              </div>
            )}

            {activeTab === 'logistics' && (
              <div className="max-w-4xl mx-auto space-y-12">
                {/* Gestão de Prêmios (Apenas para Rifas) */}
                <div className="bg-surface/20 border border-white/5 p-8">
                  <h3 className="text-xl font-black text-white uppercase italic tracking-tighter mb-6 flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary">local_shipping</span>
                    Logística de Entrega (Prêmios)
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
                                <input
                                  type="text"
                                  placeholder="CÓD. RASTREIO"
                                  className="flex-1 bg-white/5 border border-white/10 px-3 py-2 text-[10px] text-white focus:border-primary outline-none"
                                  id={`tracking-${winner.id}`}
                                />
                                <button
                                  onClick={() => {
                                    const code = (document.getElementById(`tracking-${winner.id}`) as HTMLInputElement)?.value;
                                    handleUpdateTracking(winner.id, code);
                                  }}
                                  disabled={updatingLogisticsId === winner.id}
                                  className="bg-primary text-black px-4 py-2 text-[9px] font-black uppercase hover:bg-white transition-all disabled:opacity-50"
                                >
                                  {updatingLogisticsId === winner.id ? '...' : 'ENVIAR'}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-12 text-center border border-dashed border-white/5">
                      <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest italic">Nenhuma entrega pendente centralizada neste QG.</p>
                    </div>
                  )}
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  <OperatorKYCForm />
                  <div className="bg-primary/5 border border-primary/20 p-8 flex flex-col justify-between">
                    <div>
                      <h3 className="text-sm font-black text-white uppercase tracking-widest mb-2 font-mono">Resgate de Operações</h3>
                      <p className="text-[9px] text-slate-500 uppercase tracking-widest mb-6 leading-relaxed">
                        O saldo disponível pode ser sacado via PIX instantâneo para a conta vinculada ao seu CPF/CNPJ.
                      </p>
                    </div>
                      <button
                        onClick={handleRequestPayout}
                        className="w-full bg-primary hover:bg-white text-background-dark font-black py-4 text-[9px] uppercase tracking-[.3em] transition-all"
                      >
                        SOLICITAR RESGATE PIX
                      </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'reports' && (
              <div className="max-w-2xl mx-auto border border-white/5 p-12 bg-surface/20 text-center">
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Módulo de Relatórios em Fase de Calibração</p>
              </div>
            )}
          </div>
        </div>
      )}

      {isParticipantsModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-12">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => setIsParticipantsModalOpen(false)}></div>
          <div className="relative w-full max-w-4xl bg-surface/90 border border-primary/30 p-8 pt-12 shadow-[0_0_50px_rgba(251,191,36,0.1)] overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>
            <button
              onClick={() => setIsParticipantsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            <div className="flex items-center justify-between gap-4 mb-8">
              <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">
                LISTA DE <span className="text-primary">OPERADORES</span> INSCRITOS
              </h3>
              <button 
                onClick={() => window.print()}
                className="bg-white/10 hover:bg-white text-white hover:text-black font-black px-6 py-2 text-[9px] uppercase tracking-widest transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">print</span>
                IMPRIMIR LISTA
              </button>
            </div>

            {loadingParticipants ? (
              <div className="py-20 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary" />
              </div>
            ) : selectedEventParticipants.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="pb-4 px-4 font-mono text-left">ID</th>
                      <th className="pb-4 px-4 text-left">Operador</th>
                      <th className="pb-4 px-4 text-left">Status</th>
                      <th className="pb-4 px-4 text-left">Check-in</th>
                      <th className="pb-4 px-4 print:hidden text-left">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {selectedEventParticipants.map((p, idx) => (
                      <tr key={p.id} className="text-[11px] hover:bg-white/5 transition-colors group">
                        <td className="py-4 px-4 font-mono text-slate-500">#{idx + 1}</td>
                        <td className="py-4 px-4">
                          <div className="font-black uppercase text-white">{p.buyer_name || 'Desconhecido'}</div>
                          <div className="text-[9px] text-slate-500 font-mono lowercase">{p.buyer_email}</div>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${p.status === 'confirmed' ? 'bg-primary/20 text-primary' : 'bg-green-500/20 text-green-500'}`}>
                            {p.status === 'confirmed' ? 'PAGO' : 'USADO'}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-slate-500 font-mono italic">
                          {p.checked_in_at ? new Date(p.checked_in_at).toLocaleTimeString() : 'PENDENTE'}
                        </td>
                        <td className="py-4 px-4 print:hidden">
                           <div className="flex items-center gap-2">
                             {p.buyer_phone && (
                                <button
                                  onClick={() => {
                                    const eventTitle = selectedEventParticipants[0]?.events?.title || 'Airsoft';
                                    const msg = encodeURIComponent(`Olá ${p.buyer_name}, confirmamos sua inscrição na missão ${eventTitle}. O seu ID de Operador é #${p.qr_uuid.slice(0, 8).toUpperCase()}. Nos vemos no LZ!`);
                                    window.open(`https://wa.me/${p.buyer_phone.replace(/\D/g, '')}?text=${msg}`, '_blank');
                                  }}
                                  className="size-8 bg-green-500/10 border border-green-500/20 text-green-500 hover:bg-green-500 hover:text-black transition-all flex items-center justify-center rounded-sm"
                                  title="Enviar Briefing via WhatsApp"
                                >
                                  <span className="material-symbols-outlined text-sm font-black">chat</span>
                                </button>
                             )}
                           </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-20 text-center border border-dashed border-white/5">
                <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest">Nenhuma inscrição confirmada.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
