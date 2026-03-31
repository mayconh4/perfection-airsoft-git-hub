import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { formatPrice } from '../../types/database';

export function AdminDashboard() {
  const [stats, setStats] = useState({ products: 0, orders: 0, revenue: 0, messages: 0, pendingOperators: 0 });
  const [pendingOps, setPendingOps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    async function loadStats() {
      const [p, o, m, ops] = await Promise.all([
        supabase.from('products').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('total'),
        supabase.from('contact_messages').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*').eq('kyc_status', 'waiting_approval')
      ]);

      const totalRevenue = o.data?.reduce((sum, order) => sum + (order.total || 0), 0) || 0;

      setStats({
        products: p.count || 0,
        orders: o.data?.length || 0,
        revenue: totalRevenue,
        messages: m.count || 0,
        pendingOperators: ops.data?.length || 0
      });
      setPendingOps(ops.data || []);
      setLoading(false);
    }
    loadStats();
  }, []);

  if (loading) return <div className="animate-pulse text-primary font-bold uppercase tracking-widest text-xs">Acessando Banco de Dados...</div>;

  const cards = [
    { label: 'Arsenal Ativo', value: stats.products, icon: 'inventory_2', color: 'text-blue-500' },
    { label: 'Missões Totais', value: stats.orders, icon: 'assignment', color: 'text-primary' },
    { label: 'Receita Operacional', value: formatPrice(stats.revenue), icon: 'payments', color: 'text-green-500' },
    { label: 'Operadores Pendentes', value: stats.pendingOperators, icon: 'badge', color: 'text-red-500' },
  ];

  const handleApproveOperator = async (id: string) => {
    setProcessing(id);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ kyc_status: 'approved', role: 'organizer' })
        .eq('id', id);
      
      if (error) throw error;
      
      setPendingOps(prev => prev.filter(op => op.id !== id));
      setStats(prev => ({ ...prev, pendingOperators: prev.pendingOperators - 1 }));
    } catch (err: any) {
      alert('Erro ao aprovar: ' + err.message);
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Visão Geral do QG</h2>
        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Status da Operação Perfection Airsoft</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <a href="/admin/produtos?action=new" className="bg-primary/10 border border-primary/30 p-8 flex items-center gap-6 hover:bg-primary/20 transition-all group">
             <span className="material-symbols-outlined text-4xl text-primary group-hover:scale-110 transition-transform">add_box</span>
             <div>
                <h3 className="text-sm font-black text-white uppercase tracking-widest">Adicionar Produto</h3>
                <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-1">Incorporar novo item ao arsenal</p>
             </div>
          </a>
          <a href="/drop/criar" className="bg-primary/10 border border-primary/30 p-8 flex items-center gap-6 hover:bg-primary/20 transition-all group">
             <span className="material-symbols-outlined text-4xl text-primary group-hover:scale-110 transition-transform">military_tech</span>
             <div>
                <h3 className="text-sm font-black text-white uppercase tracking-widest">Criar Novo Drop</h3>
                <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-1">Iniciar nova missão de sorteio</p>
             </div>
          </a>
          <a href="/admin/pedidos" className="bg-white/5 border border-white/10 p-8 flex items-center gap-6 hover:bg-white/10 transition-all group">
             <span className="material-symbols-outlined text-4xl text-slate-400 group-hover:scale-110 transition-transform">assignment</span>
             <div>
                <h3 className="text-sm font-black text-white uppercase tracking-widest">Ver Pedidos</h3>
                <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-1">Gerenciar vendas e entregas</p>
             </div>
          </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(card => (
          <div key={card.label} className="bg-surface border border-border-tactical p-6 relative overflow-hidden group">
            <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity ${card.color}`}>
              <span className="material-symbols-outlined text-6xl">{card.icon}</span>
            </div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{card.label}</p>
            <p className="text-2xl font-black text-white tracking-tight">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         <div className="bg-surface border border-border-tactical p-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6 border-b border-border-tactical pb-4 flex items-center gap-2">
               <span className="material-symbols-outlined text-primary">priority_high</span> Alertas do QG
            </h3>
            <div className="space-y-4">
               <div className="flex items-center gap-4 p-4 bg-background-dark/50 border-l-2 border-primary">
                  <span className="material-symbols-outlined text-primary">shopping_cart</span>
                  <div>
                    <p className="text-xs text-white font-bold uppercase">Verificar Pedidos</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wide">Existem pedidos aguardando alteração de status.</p>
                  </div>
               </div>
               <div className="flex items-center gap-4 p-4 bg-background-dark/50 border-l-2 border-slate-700 opacity-50">
                  <span className="material-symbols-outlined text-slate-400">inventory</span>
                  <div>
                    <p className="text-xs text-slate-400 font-bold uppercase">Estoque em Dia</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wide">Todos os rifles e pistolas estão em oferta.</p>
                  </div>
               </div>
            </div>
         </div>

         <div className="bg-surface border border-border-tactical p-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6 border-b border-border-tactical pb-4 flex items-center justify-between">
              <span>Operadores Pendentes</span>
              <span className="bg-red-500/20 text-red-500 px-2 py-1 rounded text-[8px] animate-pulse">REVISÃO NECESSÁRIA</span>
            </h3>
            
            {pendingOps.length > 0 ? (
              <div className="space-y-4">
                {pendingOps.map(op => (
                  <div key={op.id} className="flex items-center justify-between p-4 bg-background-dark/50 border border-white/5 hover:border-primary/20 transition-all">
                    <div>
                      <p className="text-[10px] text-white font-black uppercase">{op.full_name || 'Agente Sem Nome'}</p>
                      <p className="text-[8px] text-slate-500 uppercase tracking-widest font-mono mt-1">ID: {op.id.substring(0, 8)}... | CPF: {op.cpf_cnpj || 'N/A'}</p>
                    </div>
                    <button 
                      onClick={() => handleApproveOperator(op.id)}
                      disabled={processing === op.id}
                      className="bg-primary/10 hover:bg-primary text-primary hover:text-background-dark border border-primary/20 px-4 py-2 text-[8px] font-black uppercase tracking-widest transition-all"
                    >
                      {processing === op.id ? 'PROCESSANDO...' : 'APROVAR'}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <span className="material-symbols-outlined text-slate-700 text-4xl mb-2">check_circle</span>
                <p className="text-slate-500 text-[10px] uppercase tracking-widest italic">Nenhum operador aguardando no radar.</p>
              </div>
            )}
         </div>

         <div className="bg-surface border border-border-tactical p-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6 border-b border-border-tactical pb-4">Indicadores de Campo</h3>
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <span className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Capacidade do Servidor</span>
                <span className="text-[9px] text-green-500 font-mono font-bold">ESTÁVEL (99.9%)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Latência API</span>
                <span className="text-[9px] text-primary font-mono font-bold">24ms</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Protocolos Seguros</span>
                <span className="text-[9px] text-blue-500 font-mono font-bold">ATIVADOS</span>
              </div>
            </div>
         </div>
      </div>
    </div>
  );
}
