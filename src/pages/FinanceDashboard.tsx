import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SEO } from '../components/SEO';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { OperatorKYCForm } from '../components/OperatorKYCForm';

interface FinanceStats {
  available: number;
  pending: number;
  totalEarned: number;
  trustLevel: number;
  completedDrops: number;
}

export default function FinanceDashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<FinanceStats>({ 
    available: 0, 
    pending: 0, 
    totalEarned: 0, 
    trustLevel: 0, 
    completedDrops: 0 
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [isKYCModalOpen, setIsKYCModalOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
      return;
    }

    if (user) {
      fetchFinanceData();
    }
  }, [user, authLoading]);

  const fetchFinanceData = async () => {
    setLoading(true);
    try {
      const { data: balanceData } = await supabase
        .from('user_balances')
        .select('available_balance, pending_balance, total_earned')
        .eq('user_id', user?.id)
        .single();

      const { data: profile } = await supabase
        .from('profiles')
        .select('trust_level, completed_drops')
        .eq('id', user?.id)
        .single();

      setStats({
        available: balanceData?.available_balance ? Number(balanceData.available_balance) : 0,
        pending: balanceData?.pending_balance ? Number(balanceData.pending_balance) : 0,
        totalEarned: balanceData?.total_earned ? Number(balanceData.total_earned) : 0,
        trustLevel: profile?.trust_level || 0,
        completedDrops: profile?.completed_drops || 0
      });

      const { data: orders } = await supabase
        .from('orders')
        .select('*, tickets(event_id, events(title))')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(10);

      setRecentOrders(orders || []);

    } catch (err: any) {
      console.error('Erro ao carregar dados financeiros:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPayout = async () => {
    if (stats.available <= 0) {
      alert('SALDO INSUFICIENTE PARA RESGATE.');
      return;
    }

    // EXIGIR PROTOCOLO DE VERIFICAÇÃO SE NÃO ESTIVER VERIFICADO (Trust Level <= 0)
    if (stats.trustLevel <= 0) {
      setIsKYCModalOpen(true);
      return;
    }

    if (!confirm('DESEJA SOLICITAR O RESGATE TOTAL PARA SUA CONTA BANCÁRIA?')) {
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
      if (!response.ok) throw new Error(result.error || 'Falha ao processar saque.');

      alert(`SUCESSO! Resgate de R$ ${result.value.toFixed(2)} processado.`);
      fetchFinanceData();
    } catch (err: any) {
      alert(`ERRO: ${err.message}`);
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
      <SEO title="Central Financeira | Perfection Airsoft" />

      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <div className="flex items-center justify-between gap-4 mb-12">
          <div>
            <Link to="/organizador" className="flex items-center gap-2 text-slate-500 hover:text-primary mb-4 transition-colors">
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              <span className="text-[10px] font-black uppercase tracking-widest">Voltar para Operações</span>
            </Link>
            <h1 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter leading-none italic">
              CENTRAL <span className="text-primary">FINANCEIRA</span>
            </h1>
          </div>
          <div className="text-right">
             <div className="text-primary font-black uppercase tracking-[0.3em] text-[10px] mb-1">Status da Conta</div>
             <div className="text-white font-mono text-[12px]">{stats.trustLevel >= 3 ? 'RANK ELITE • SAQUE INSTANTÂNEO' : `RANK ${stats.trustLevel} • CRÉDITO EM GARANTIA`}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-primary/10 border-2 border-primary p-10 relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 opacity-5 group-hover:rotate-12 transition-transform">
              <span className="material-symbols-outlined text-[120px]">payments</span>
            </div>
            <div className="relative z-10">
              <span className="text-[10px] font-black uppercase tracking-widest block mb-2 text-primary/70">Saldo Disponível</span>
              <div className="flex items-baseline gap-2 mb-6">
                <span className="text-5xl font-black text-primary italic">R$ {stats.available.toFixed(2)}</span>
              </div>
              <button 
                onClick={handleRequestPayout}
                className="w-full bg-primary text-black font-black py-4 px-6 text-[11px] uppercase tracking-[0.2em] hover:bg-white transition-all shadow-[0_10px_20px_rgba(251,191,36,0.2)] active:scale-95"
              >
                Solicitar Resgate Agora
              </button>
            </div>
          </div>

          <div className="bg-surface/30 border border-white/10 p-10 hover:border-white/20 transition-colors">
             <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest block mb-2">Saldo em Garantia</span>
             <span className="text-4xl font-black text-white/60 block mb-1">R$ {stats.pending.toFixed(2)}</span>
             <p className="text-[9px] text-slate-600 font-mono leading-relaxed mt-4 uppercase">
               Valores retidos por segurança conforme seu Rank operacional.
             </p>
          </div>

          <div className="bg-surface/30 border border-white/10 p-10 hover:border-white/20 transition-colors">
             <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest block mb-2">Total Movimentado</span>
             <span className="text-4xl font-black text-white block">R$ {stats.totalEarned.toFixed(2)}</span>
             <div className="mt-8 flex items-center justify-between text-[9px] font-black uppercase opacity-40">
                <span>Total de Transações</span>
                <span>{recentOrders.length}+</span>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-12 items-start max-w-4xl mx-auto">
          <div className="bg-surface/10 border border-white/5 p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">history</span>
                <h3 className="text-lg font-black text-white uppercase tracking-widest">Extrato Recente</h3>
              </div>
            </div>

            <div className="space-y-4">
              {recentOrders.length > 0 ? (
                recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-4 bg-black/40 border-l-2 border-primary/30 hover:border-primary transition-all">
                    <div className="flex items-center gap-6">
                      <div className="size-10 bg-white/5 flex items-center justify-center">
                        <span className="material-symbols-outlined text-slate-500">point_of_sale</span>
                      </div>
                      <div>
                        <div className="text-[11px] font-black text-white uppercase leading-none mb-1">Venda: {order.id.slice(0, 8)}</div>
                        <div className="text-[9px] text-slate-500 font-mono uppercase italic">
                           {new Date(order.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[14px] font-black text-primary">+ R$ {order.total_amount.toFixed(2)}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center border border-dashed border-white/5">
                  <p className="text-xs text-slate-500 uppercase font-black">Sem transações.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL TÁTICO: PROTOCOLO DE VERIFICAÇÃO */}
      {isKYCModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-md" onClick={() => setIsKYCModalOpen(false)}></div>
          <div className="relative w-full max-w-3xl bg-background-dark border border-primary/30 shadow-[0_0_50px_rgba(251,191,36,0.1)] overflow-y-auto max-h-[90vh]">
            <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>
            <button 
              onClick={() => setIsKYCModalOpen(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors z-50"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            <div className="p-2">
              <OperatorKYCForm onComplete={() => {
                setIsKYCModalOpen(false);
                fetchFinanceData();
                alert('PROTOCOLO CONCLUÍDO! AGORA VOCÊ PODE SOLICITAR SEU RESGATE.');
              }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
