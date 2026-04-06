import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { formatPrice } from '../types/database';
import { getTacticalCode, formatTacticalTimestamp } from '../lib/utils';
import type { Order } from '../types/database';

export function OrderSuccessPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [registrationMode, setRegistrationMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [regSuccess, setRegSuccess] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) {
      navigate('/');
      return;
    }

    const fetchOrder = async () => {
      setLoading(true);
      
      // 1. Buscar usuário atual para decidir se mostra o banner de registro
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      // 2. Buscar dados do pedido
      const { data, error } = await supabase
        .from('orders')
        .select('*, items:order_items(*)')
        .eq('id', id)
        .single();
        
      if (data) {
        setOrder(data as Order);
      } else {
        console.error('Erro ao buscar pedido:', error);
      }
      setLoading(false);
    };

    fetchOrder();

    // Listener Realtime para atualizar status se o usuário ficar na página aguardando
    const channel = supabase
      .channel(`order_status_success_${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${id}`
        },
        (payload) => {
          console.log('[REALTIME-SUCCESS] Alteração detectada:', payload.new.status);
          setOrder(prev => prev ? { ...prev, status: payload.new.status } : null);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, navigate]);

  const handleFinalizeRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || password.length < 6) return;
    setRegLoading(true);

    try {
      // 1. Criar a conta oficial
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: order?.customer_data?.name,
            phone: order?.customer_data?.phone,
            cpf: order?.customer_data?.cpf
          }
        }
      });

      if (signUpError) throw signUpError;

      // 2. Vincular o pedido ao novo usuário (Requer que o RLS ou uma Edge Function permita isso)
      // Como estamos no frontend, tentamos diretamente. Se falhar, o usuário pelo menos já tem a conta.
      if (signUpData.user) {
        await supabase
          .from('orders')
          .update({ user_id: signUpData.user.id })
          .eq('id', id);
      }

      setRegSuccess(true);
    } catch (err: any) {
      alert('Erro ao finalizar cadastro: ' + err.message);
    } finally {
      setRegLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="px-4 py-20 text-center text-primary font-bold uppercase tracking-widest animate-pulse">
        Sincronizando Dados da Missão...
      </div>
    );
  }

  if (!order) return (
    <div className="px-4 py-20 text-center">
      <p className="text-white uppercase tracking-widest mb-4">Pedido não localizado ou acesso expirado.</p>
      <Link to="/" className="text-primary font-black uppercase text-xs">Voltar ao Arsenal</Link>
    </div>
  );

  const isGuestOrder = !order.user_id;

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-4xl mx-auto">
      <div className="text-center mb-6">
        <span className="material-symbols-outlined text-green-500 text-5xl mb-2 block animate-bounce">task_alt</span>
        <h1 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tighter mb-2 italic">Operação <span className="text-primary">Iniciada</span></h1>
        <p className="text-slate-400 uppercase tracking-widest text-[10px] font-bold">Relatório tático gerado com sucesso</p>
      </div>

      {isGuestOrder && !currentUser && !regSuccess && (
        <div className="bg-primary/10 border border-primary/30 p-6 mb-6 rounded-lg shadow-[0_0_30px_rgba(255,193,7,0.1)] backdrop-blur-md">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-primary text-black p-2 rounded-full">
              <span className="material-symbols-outlined font-black text-sm">person_add</span>
            </div>
            <div>
              <h4 className="text-primary font-black uppercase text-xs tracking-widest">Finalizar Meu Acesso</h4>
              <p className="text-[9px] text-white/50 uppercase font-bold">Salve seus tickets e prêmios agora.</p>
            </div>
          </div>

          {!registrationMode ? (
            <button 
              onClick={() => setRegistrationMode(true)}
              className="w-full bg-primary text-black font-black py-4 uppercase text-xs tracking-[0.2em] hover:bg-white transition-all shadow-lg"
            >
              Ativar Minha Conta Agora →
            </button>
          ) : (
            <form onSubmit={handleFinalizeRegistration} className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input 
                  type="email" 
                  placeholder="SEU MELHOR E-MAIL" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-black/40 border border-white/10 p-4 text-white text-xs font-bold uppercase tracking-widest focus:border-primary outline-none"
                />
                <input 
                  type="password" 
                  placeholder="DEFINIR SENHA (6+ DÍGITOS)" 
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-black/40 border border-white/10 p-4 text-white text-xs font-bold uppercase tracking-widest focus:border-primary outline-none"
                />
              </div>
              <button 
                type="submit" 
                disabled={regLoading}
                className="w-full bg-white text-black font-black py-4 uppercase text-xs tracking-[0.2em] hover:bg-primary transition-all disabled:opacity-50"
              >
                {regLoading ? 'PROCESSANDO...' : 'CONFIRMAR E SALVAR ACESSO'}
              </button>
            </form>
          )}
        </div>
      )}

      {regSuccess && (
        <div className="bg-green-500/10 border border-green-500/30 p-6 mb-8 rounded-lg text-center animate-in zoom-in-95 duration-500">
          <p className="text-green-500 font-black uppercase text-xs tracking-widest mb-2">Conta Ativada com Sucesso!</p>
          <p className="text-white/50 text-[10px] uppercase font-bold">Agora você pode acessar seu painel e conferir seus tickets.</p>
        </div>
      )}

      <div className="bg-surface border border-white/5 p-5 relative overflow-hidden mb-6 backdrop-blur-md">
        <div className="absolute top-0 right-0 p-5 opacity-5">
          <span className="material-symbols-outlined text-[120px] text-primary">verified_user</span>
        </div>
        
        <div className="relative z-10">
          <h2 className="text-[10px] font-black tracking-[0.3em] text-primary uppercase mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">terminal</span> Manifesto Técnico do Pedido
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-[9px] text-slate-500 font-extrabold uppercase tracking-widest mb-1">Código da Operação</p>
              <p className="text-white font-mono text-xs tracking-widest bg-black/30 p-2 border border-white/5 uppercase font-bold">{getTacticalCode(order.id)}</p>
            </div>
            <div>
              <p className="text-[9px] text-slate-500 font-extrabold uppercase tracking-widest mb-1">Timestamp do Pedido</p>
              <p className="text-white text-xs uppercase font-black">{formatTacticalTimestamp(order.created_at)}</p>
            </div>
          </div>

          <div className="border-t border-white/5 pt-4 mb-4">
            <h3 className="text-[10px] font-black tracking-[0.3em] text-primary uppercase mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">local_shipping</span> 
              {order.shipping_address?.street === 'Digital' ? 'Logística Digital' : 'Destino da Carga'}
            </h3>
            <div className="bg-black/20 p-4 border border-white/5">
              <p className="text-white text-xs uppercase font-black italic mb-1">{order.customer_data?.name}</p>
              <p className="text-slate-400 text-[9px] uppercase font-bold tracking-[0.2em] leading-relaxed">
                {order.shipping_address?.street === 'Digital' 
                  ? (order.status === 'pago' 
                      ? 'SUA OPERAÇÃO FOI CONFIRMADA! OS TICKETS JÁ ESTÃO DISPONÍVEIS NO SEU PAINEL.' 
                      : 'SEUS TICKETS SERÃO LIBERADOS NO PAINEL ASSIM QUE O PIX FOR CONFIRMADO.')
                  : `ENTREGA FÍSICA: ${order.shipping_address?.street} \n${order.shipping_address?.city} - CEP ${order.shipping_address?.cep}`
                }
              </p>
            </div>
          </div>

          <div className="border-t border-white/5 pt-4 mb-4">
            <h3 className="text-[10px] font-black tracking-[0.3em] text-primary uppercase mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">inventory</span> Inventário Adquirido
            </h3>
            <div className="space-y-4">
              {order.items?.map(item => (
                <div key={item.id} className="flex justify-between items-center text-[11px] font-black group border-b border-white/5 pb-3 last:border-0">
                  <div className="flex-1 mr-4">
                    <p className="text-white uppercase tracking-tight group-hover:text-primary transition-colors">{item.product_name}</p>
                    <p className="text-slate-600 tracking-widest text-[9px]">UNID: {item.quantity}</p>
                  </div>
                  <p className="text-primary font-mono text-sm">{formatPrice(item.product_price * item.quantity)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t-2 border-primary/20 pt-6 flex justify-between items-end">
            <div>
              <span className="text-[9px] font-black tracking-[0.3em] text-white/30 uppercase italic block mb-1">Status da Transação</span>
              {order.status === 'pago' ? (
                <span className="text-green-500 text-[9px] font-black uppercase tracking-widest flex items-center gap-1 bg-green-500/10 px-2 py-1 border border-green-500/20">
                  <span className="material-symbols-outlined text-[12px]">verified</span> PAGAMENTO APROVADO
                </span>
              ) : (
                <span className="text-yellow-500 text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                  <span className="material-symbols-outlined text-[10px]">schedule</span> Aguardando Confirmação
                </span>
              )}
            </div>
            <div className="text-right">
              <span className="text-[9px] font-black tracking-[0.3em] text-white/30 uppercase italic block mb-1">Total a Investir</span>
              <span className="text-3xl font-black text-primary font-mono tracking-tighter italic">{formatPrice(order.total, true)}</span>
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
