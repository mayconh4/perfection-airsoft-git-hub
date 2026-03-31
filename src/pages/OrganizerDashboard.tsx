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
  const [activeTab, setActiveTab] = useState<'missions' | 'logistics' | 'reports'>('missions');
  const [isProcessingPayout, setIsProcessingPayout] = useState(false);
  const [winners, setWinners] = useState<any[]>([]);
  const [updatingLogisticsId, setUpdatingLogisticsId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
      return;
    }

    if (user) {
      fetchDashboardData();
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
      setEvents(eventsData || []);

      let totalSold = 0;
      if (eventsData && eventsData.length > 0) {
        totalSold = eventsData.reduce((sum, e) => sum + (e.sold_count || 0), 0);
      }

      // 2.5 Buscar Dados de Confiança e Role do Perfil
      const { data: profile } = await supabase
        .from('profiles')
        .select('trust_level, completed_drops, role')
        .eq('id', user?.id)
        .single();

      if (profile?.role === 'admin') {
        setIsAdmin(true);
      }

      setStats({
        ticketsSold: totalSold,
        revenue: balanceData?.total_earned ? Number(balanceData.total_earned) : 0,
        netRevenue: balanceData?.available_balance ? Number(balanceData.available_balance) : 0,
        pendingBalance: balanceData?.pending_balance ? Number(balanceData.pending_balance) : 0,
        trustLevel: profile?.trust_level || 0,
        completedDrops: profile?.completed_drops || 0
      });

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

  const handleRequestPayout = async () => {
    if (stats.netRevenue <= 0) {
      alert('SALDO INSUFICIENTE PARA RESGATE.');
      return;
    }

    if (!confirm('DESEJA SOLICITAR O RESGATE TOTAL DO SEU SALDO PARA SUA CONTA BANCÁRIA CADASTRADA?')) {
      return;
    }

    setIsProcessingPayout(true);
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
      fetchDashboardData(); // Atualiza saldo
    } catch (err: any) {
      console.error('Erro no Saque:', err.message);
      alert(`ERRO NA OPERAÇÃO: ${err.message}`);
    } finally {
      setIsProcessingPayout(false);
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
      
      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="h-px w-8 bg-primary"></span>
              <span className="text-primary font-black uppercase tracking-[0.3em] text-[10px]">Command Center</span>
              {isAdmin && (
                <Link 
                  to="/admin/moderacao" 
                  className="ml-4 bg-primary/20 text-primary border border-primary/30 px-3 py-1 text-[9px] font-black uppercase italic hover:bg-primary hover:text-black transition-all"
                >
                  MODERAÇÃO ADMIN
                </Link>
              )}
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

        {/* Tactical Trust HUD - MW2 Killstreak Style */}
        <div className={`border p-8 mb-8 relative overflow-hidden group transition-all duration-500 ${stats.trustLevel >= 3 ? 'bg-primary/10 border-primary/40 shadow-[0_0_30px_rgba(251,191,36,0.1)]' : 'bg-surface/40 border-white/5'}`}>
            {stats.trustLevel === 3 && (
                <div className="absolute inset-0 z-0 opacity-10 pointer-events-none">
                    <img 
                        src="file:///C:/Users/mayco/.gemini/antigravity/brain/bf46d8ac-bd4f-4680-b101-af9709111ce0/mw2_care_package_drop_ac130_1774925859413.png" 
                        alt="AC130 Drop" 
                        className="w-full h-full object-cover animate-pulse"
                    />
                </div>
            )}
            
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex items-center gap-6">
                    <div className={`size-24 bg-black/60 border-2 flex items-center justify-center relative group-hover:scale-110 transition-transform ${stats.trustLevel >= 3 ? 'border-primary shadow-[0_0_15px_rgba(251,191,36,0.3)]' : 'border-white/20'}`}>
                        <span className={`material-symbols-outlined text-5xl font-black ${stats.trustLevel >= 3 ? 'text-primary' : 'text-slate-600'}`}>
                            {stats.trustLevel === 0 && 'military_tech'}
                            {stats.trustLevel === 1 && 'radar'}
                            {stats.trustLevel === 2 && 'rocket_launch'}
                            {stats.trustLevel === 3 && 'deployed_code'}
                            {stats.trustLevel >= 4 && 'radioactive'}
                        </span>
                        <div className="absolute -bottom-2 -right-2 bg-primary text-black font-black text-[9px] px-2 py-0.5 rounded-sm">
                            RANK {stats.trustLevel}
                        </div>
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic">
                                {stats.trustLevel === 0 ? 'RECRUTA' : 
                                 stats.trustLevel === 1 ? 'UAV RECON' : 
                                 stats.trustLevel === 2 ? 'PREDATOR MISSILE' : 
                                 stats.trustLevel === 3 ? 'CARE PACKAGE' : 
                                 stats.trustLevel >= 4 ? 'TACTICAL NUKE' : 'VETERANO'}
                            </h3>
                            {stats.trustLevel >= 3 && (
                                <span className="bg-primary text-black text-[8px] font-black px-1.5 py-0.5 rounded-full animate-pulse">VERIFIED</span>
                            )}
                        </div>
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
                    <p className="text-[8px] text-slate-600 mt-2 uppercase italic text-right font-mono">
                        {stats.trustLevel === 3 ? 'AC-130 INBOUND // CARE PACKAGE DROPPED' : 'AUMENTE SUAS ENTREGAS PARA SUBIR DE RANK'}
                    </p>
                </div>
            </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 mb-12">
          <div className="bg-surface/30 border border-white/5 p-8 group hover:bg-white/5 transition-colors">
            <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest block mb-1">Missões Concluídas</span>
            <span className="text-4xl font-black text-white">{stats.completedDrops}</span>
          </div>
          <div className={`border p-8 border-l-4 transition-all duration-500 ${stats.trustLevel >= 3 ? 'bg-primary/5 border-primary border-white/10' : 'bg-surface/30 border-white/5 border-l-white/10'}`}>
            <span className={`text-[10px] font-black uppercase tracking-widest block mb-1 font-mono italic ${stats.trustLevel >= 3 ? 'text-primary' : 'text-slate-500'}`}>Saldo Disponível</span>
            <div className="flex items-baseline gap-2">
                <span className={`text-4xl font-black ${stats.trustLevel >= 3 ? 'text-primary' : 'text-white/40'}`}>R$ {stats.netRevenue.toFixed(2)}</span>
                {stats.trustLevel < 3 && <span className="text-[8px] text-red-500 font-black uppercase animate-pulse font-mono">BLOQUEADO</span>}
            </div>
          </div>
          <div className="bg-surface/30 border border-white/5 p-8">
            <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest block mb-1">Saldo em Garantia (Escrow)</span>
            <span className="text-2xl font-black text-white/60">R$ {stats.pendingBalance.toFixed(2)}</span>
          </div>
          <div className="bg-surface/30 border border-white/5 p-8">
            <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest block mb-1">Total Movimentado</span>
            <span className="text-4xl font-black text-white">R$ {stats.revenue.toFixed(2)}</span>
          </div>
        </div>

        {/* Tab Headers */}
        <div className="flex items-center gap-8 border-b border-white/5 mb-12">
          <button 
            onClick={() => setActiveTab('missions')}
            className={`pb-4 text-[10px] uppercase font-black tracking-[0.3em] transition-all relative ${activeTab === 'missions' ? 'text-primary' : 'text-slate-500 hover:text-white'}`}
          >
            Minhas Missões
            {activeTab === 'missions' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary"></span>}
          </button>
          <button 
            onClick={() => setActiveTab('logistics')}
            className={`pb-4 text-[10px] uppercase font-black tracking-[0.3em] transition-all relative ${activeTab === 'logistics' ? 'text-primary' : 'text-slate-500 hover:text-white'}`}
          >
            Logística de Recebimento
            {activeTab === 'logistics' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary"></span>}
          </button>
          <button 
            onClick={() => setActiveTab('reports')}
            className={`pb-4 text-[10px] uppercase font-black tracking-[0.3em] transition-all relative ${activeTab === 'reports' ? 'text-primary' : 'text-slate-500 hover:text-white'}`}
          >
            Relatórios e Auditoria
            {activeTab === 'reports' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary"></span>}
          </button>
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          {activeTab === 'missions' && (
            <div className="space-y-4 max-w-4xl">
              {events.length > 0 ? (
                events.map(event => (
                  <div key={event.id} className="bg-surface/20 border border-white/10 p-6 flex flex-col md:flex-row items-center justify-between gap-6 hover:border-primary/30 transition-all">
                    <div className="flex gap-6 items-center flex-1">
                      <div className="size-16 bg-white/5 flex items-center justify-center relative overflow-hidden">
                        {event.image_url ? (
                          <img src={event.image_url} alt={event.title} className="w-full h-full object-cover" />
                        ) : (
                          <span className="material-symbols-outlined text-white/10 text-3xl">military_tech</span>
                        )}
                        <div className="absolute top-0 right-0 bg-primary/20 text-primary text-[6px] font-black uppercase px-1">
                          {event.status}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-white uppercase tracking-widest mb-1">{event.title}</h4>
                        <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">
                          {new Date(event.event_date).toLocaleDateString()} • {event.location}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-8 text-center md:text-right w-full md:w-auto border-t md:border-t-0 border-white/5 pt-4 md:pt-0">
                      <div>
                        <span className="text-[10px] text-slate-600 font-black uppercase tracking-widest block mb-1">Vendas</span>
                        <span className="text-sm font-black text-white">{event.sold_count} / {event.capacity}</span>
                      </div>
                      <Link to={`/organizador/eventos/${event.id}`} className="p-3 bg-white/5 border border-white/10 text-white/50 hover:text-primary hover:border-primary/40 transition-all">
                        <span className="material-symbols-outlined text-sm">edit</span>
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-20 border border-dashed border-white/5 bg-surface/10">
                  <span className="material-symbols-outlined text-4xl text-white/5 mb-4 block">event_busy</span>
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Nenhuma missão em andamento.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'logistics' && (
            <div className="space-y-12">
              {/* Seção 1: KYC e Carteira (Existente) */}
              <div className="max-w-xl mx-auto space-y-8">
                <div className="text-center mb-8">
                  <h3 className="text-xl font-black text-white uppercase tracking-widest mb-2">Carteira do Organizador</h3>
                  <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">Gerencie seus recebimentos via Pix Split</p>
                </div>
                
                <OperatorKYCForm />

                <div className="bg-primary/5 border border-primary/20 p-8 mt-12">
                  <span className="material-symbols-outlined text-primary text-3xl mb-4">info</span>
                  <h3 className="text-sm font-black text-white uppercase tracking-widest mb-6">Regras de Saque</h3>
                  <p className="text-[11px] text-slate-500 font-mono leading-relaxed mb-8 uppercase">
                    Taxa operacional: 7% por ticket. <br/>
                    Liberação: Saldo disponível 24h após confirmação de entrega do produto ao ganhador.
                  </p>
                  <button 
                    onClick={handleRequestPayout}
                    disabled={isProcessingPayout}
                    className={`w-full font-black py-4 text-[9px] uppercase tracking-[.3em] transition-all flex items-center justify-center gap-2 ${
                      isProcessingPayout 
                        ? 'bg-white/10 text-white/30 cursor-not-allowed' 
                        : 'bg-primary hover:bg-white text-background-dark'
                    }`}
                  >
                    {isProcessingPayout ? (
                      <>
                        <div className="size-3 border-2 border-primary border-t-transparent animate-spin rounded-full"></div>
                        PROCESSANDO...
                      </>
                    ) : (
                      'SOLICITAR RESGATE PIX'
                    )}
                  </button>
                </div>
              </div>

              {/* Seção 2: Pendências Logísticas (Nova) */}
              <div className="max-w-4xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                  <span className="material-symbols-outlined text-primary">local_shipping</span>
                  <h3 className="text-xl font-black text-white uppercase tracking-widest">Pendências Logísticas</h3>
                </div>
                
                <div className="space-y-4">
                  {winners.length > 0 ? (
                    winners.map(winner => (
                      <div key={winner.id} className="bg-surface/20 border border-white/10 p-6 flex flex-col md:flex-row items-center justify-between gap-6 hover:border-primary/20 transition-all">
                        <div className="flex gap-6 items-center flex-1">
                          <div className="size-12 bg-white/5 flex items-center justify-center rounded relative">
                            <span className="material-symbols-outlined text-primary text-2xl">trophy</span>
                            {winner.payout_released && (
                                <div className="absolute -top-1 -right-1 bg-green-500 rounded-full size-4 border-2 border-black flex items-center justify-center">
                                    <span className="material-symbols-outlined text-[8px] text-black font-black">check</span>
                                </div>
                            )}
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-white uppercase tracking-widest mb-1">
                                {winner.raffles?.title || 'RIFA FINALIZADA'}
                            </h4>
                            <p className="text-[9px] text-slate-500 font-mono uppercase tracking-widest">
                                Status: <span className={winner.payout_released ? 'text-green-500' : 'text-primary'}>
                                    {winner.delivery_status === 'pending_shipment' ? 'Aguardando Postagem' : winner.delivery_status === 'shipped' ? 'Em Trânsito' : 'Entregue'}
                                </span> • {new Date(winner.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 w-full md:w-auto">
                          {!winner.tracking_code ? (
                              <div className="flex gap-2 w-full md:w-auto">
                                <input 
                                    id={`track-${winner.id}`}
                                    type="text" 
                                    placeholder="CÓDIGO DE RASTREIO"
                                    className="bg-black/40 border border-white/10 text-[10px] font-mono p-3 w-48 focus:border-primary outline-none transition-colors text-white"
                                />
                                <button 
                                    onClick={() => handleUpdateTracking(winner.id, (document.getElementById(`track-${winner.id}`) as HTMLInputElement)?.value)}
                                    disabled={updatingLogisticsId === winner.id}
                                    className="bg-primary hover:bg-white text-background-dark px-6 py-3 text-[9px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
                                >
                                    {updatingLogisticsId === winner.id ? '...' : 'ATUALIZAR'}
                                </button>
                              </div>
                          ) : (
                              <div className="bg-white/5 border border-white/10 px-4 py-2 rounded font-mono text-[10px] text-slate-400">
                                  RASTREIO: <span className="text-white ml-2">{winner.tracking_code}</span>
                              </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="bg-surface/10 border border-dashed border-white/5 p-12 text-center">
                      <span className="material-symbols-outlined text-white/10 text-4xl mb-4">package_2</span>
                      <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest">Nenhuma pendência logística ativa.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="max-w-2xl mx-auto border border-white/5 p-12 bg-surface/20">
               <div className="flex items-center gap-4 mb-8">
                 <span className="material-symbols-outlined text-3xl text-primary">analytics</span>
                 <h3 className="text-xl font-black text-white uppercase tracking-widest">Relatórios e Auditoria</h3>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <button className="flex flex-col items-start gap-2 p-6 bg-white/5 border border-white/10 text-white/50 hover:text-primary hover:border-primary/40 transition-all text-left">
                   <span className="text-[10px] font-black uppercase tracking-widest text-white">Lista de Operadores</span>
                   <span className="text-[9px] font-mono text-slate-500">Exportar dados em CSV</span>
                 </button>
                 <button className="flex flex-col items-start gap-2 p-6 bg-white/5 border border-white/10 text-white/50 hover:text-primary hover:border-primary/40 transition-all text-left">
                   <span className="text-[10px] font-black uppercase tracking-widest text-white">Extrato Financeiro</span>
                   <span className="text-[9px] font-mono text-slate-500">Consolidado mensal de vendas</span>
                 </button>
                 <button className="flex flex-col items-start gap-2 p-6 bg-white/5 border border-white/10 text-white/50 hover:text-primary hover:border-primary/40 transition-all text-left">
                   <span className="text-[10px] font-black uppercase tracking-widest text-white">Performance de Marketing</span>
                   <span className="text-[9px] font-mono text-slate-500">Taxas de clique e conversão</span>
                 </button>
                 <button className="flex flex-col items-start gap-2 p-6 bg-white/5 border border-white/10 text-white/50 hover:text-primary hover:border-primary/40 transition-all text-left">
                   <span className="text-[10px] font-black uppercase tracking-widest text-white">Histórico de Saques</span>
                   <span className="text-[9px] font-mono text-slate-500">Logs de transferências PIX</span>
                 </button>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
