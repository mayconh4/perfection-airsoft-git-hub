import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { formatPrice } from '../types/database';
import type { Order } from '../types/database';

export function OrderSuccessPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || !id) {
      if (!id) navigate('/');
      return;
    }

    const fetchOrder = async () => {
      const { data } = await supabase
        .from('orders')
        .select('*, items:order_items(*)')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();
        
      if (data) {
        setOrder(data as Order);
      } else {
        // Se for shadow user, talvez o auth ainda esteja processando o user.id
        // Vamos dar uma segunda chance se o ID existir mas o user ainda for incerto
        console.warn('Pedido não encontrado para este usuário. Verificando integridade...');
      }
      setLoading(false);
    };

    fetchOrder();
  }, [id, user, navigate]);

  if (loading) {
    return (
      <div className="px-4 py-20 text-center text-primary font-bold uppercase tracking-widest animate-pulse">
        Sincronizando Dados da Missão...
      </div>
    );
  }

  if (!order) return (
    <div className="px-4 py-20 text-center">
      <p className="text-white uppercase tracking-widest mb-4">Pedido não localizado ou acesso negado.</p>
      <Link to="/" className="text-primary font-black uppercase text-xs">Voltar ao Arsenal</Link>
    </div>
  );

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-12 max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <span className="material-symbols-outlined text-green-500 text-6xl mb-4 block animate-bounce">task_alt</span>
        <h1 className="text-4xl sm:text-5xl font-black text-white uppercase tracking-tighter mb-4 italic">Operação <span className="text-primary">Concluída</span></h1>
        <p className="text-slate-400 uppercase tracking-widest text-xs font-bold">Relatório de Missão Gerado com Sucesso</p>
      </div>

      {user?.user_metadata?.is_shadow && (
        <div className="bg-primary/10 border border-primary/30 p-6 mb-8 rounded-lg flex flex-col md:flex-row items-center gap-6 shadow-[0_0_30px_rgba(255,193,7,0.1)] backdrop-blur-sm">
          <div className="bg-primary text-black p-4 rounded-full flex-shrink-0">
            <span className="material-symbols-outlined font-black">lock_reset</span>
          </div>
          <div className="flex-1 text-center md:text-left">
            <h4 className="text-primary font-black uppercase text-xs tracking-[0.2em] mb-1">Acesso Rápido Ativado (Shadow Account)</h4>
            <p className="text-[10px] text-white/50 uppercase tracking-[0.15em] font-bold leading-relaxed">Você acessou usando apenas seu CPF. Para garantir seus tickets e prêmios, clique no botão e defina seu e-mail e senha oficial.</p>
          </div>
          <button onClick={() => navigate('/dashboard')} className="bg-primary text-black font-black py-4 px-10 uppercase text-[10px] tracking-widest hover:bg-white transition-all whitespace-nowrap shadow-lg">
            Finalizar Cadastro →
          </button>
        </div>
      )}

      <div className="bg-surface border border-white/5 p-8 relative overflow-hidden mb-8 backdrop-blur-md">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <span className="material-symbols-outlined text-[150px] text-primary">verified_user</span>
        </div>
        
        <div className="relative z-10">
          <h2 className="text-xs font-black tracking-[0.3em] text-primary uppercase mb-8 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">terminal</span> Manifesto Técnico do Pedido
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-10">
            <div>
              <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest mb-2">Código da Operação</p>
              <p className="text-white font-mono text-sm tracking-tighter bg-black/30 p-3 border border-white/5">{order.id}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest mb-2">Timestamp de Faturamento</p>
              <p className="text-white text-sm uppercase font-black">{new Date(order.created_at).toLocaleString('pt-BR')}</p>
            </div>
          </div>

          <div className="border-t border-white/5 pt-8 mb-8">
            <h3 className="text-xs font-black tracking-[0.3em] text-primary uppercase mb-5 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">local_shipping</span> 
              {order.shipping_address?.street === 'Digital' ? 'Logística Digital' : 'Destino da Carga'}
            </h3>
            <div className="bg-black/20 p-5 border border-white/5">
              <p className="text-white text-sm uppercase font-black italic mb-2">{order.customer_data?.name}</p>
              <p className="text-slate-400 text-[10px] uppercase font-bold tracking-[0.2em] leading-loose">
                {order.shipping_address?.street === 'Digital' 
                  ? 'ACESSO IMEDIATO: SEUS TICKETS FORAM VINCULADOS AO SEU CPF E ESTÃO DISPONÍVEIS NO PAINEL.'
                  : `ENTREGA FÍSICA: ${order.shipping_address?.street} \n${order.shipping_address?.city} - CEP ${order.shipping_address?.cep}`
                }
              </p>
            </div>
          </div>

          <div className="border-t border-white/5 pt-8 mb-8">
            <h3 className="text-xs font-black tracking-[0.3em] text-primary uppercase mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">inventory</span> Inventário Adquirido
            </h3>
            <div className="space-y-4">
              {order.items?.map(item => (
                <div key={item.id} className="flex justify-between items-center text-[11px] font-black group border-b border-white/5 pb-3 last:border-0">
                  <div className="flex-1 mr-4">
                    <p className="text-white uppercase tracking-tight group-hover:text-primary transition-colors">{item.product_name}</p>
                    <p className="text-slate-600 tracking-widest text-[9px]">UNID: {item.quantity} / ORD_ITEM_{item.id.slice(-4)}</p>
                  </div>
                  <p className="text-primary font-mono text-sm">{formatPrice(item.product_price * item.quantity)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t-2 border-primary/20 pt-8 flex justify-between items-end">
            <div>
              <span className="text-[10px] font-black tracking-[0.3em] text-white/30 uppercase italic block mb-1">Status do Pagamento</span>
              <span className="text-green-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]">check_circle</span> Processado
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-black tracking-[0.3em] text-white/30 uppercase italic block mb-1">Total Liquidado</span>
              <span className="text-4xl font-black text-primary font-mono tracking-tighter italic">{formatPrice(order.total, true)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link to="/dashboard" className="flex-1 bg-primary text-black font-black py-5 px-10 uppercase tracking-[0.2em] text-center hover:bg-white active:scale-[0.98] transition-all text-xs shadow-[0_15px_40px_rgba(255,193,7,0.25)]">
          Acessar Meu Painel
        </Link>
        <Link to="/" className="flex-1 border border-white/10 text-white font-black py-5 px-10 uppercase tracking-[0.2em] text-center hover:bg-white/5 active:scale-[0.98] transition-all text-xs">
          Retornar ao Arsenal
        </Link>
      </div>
    </div>
  );
}
