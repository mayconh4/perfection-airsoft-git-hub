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
      navigate('/');
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
        navigate('/');
      }
      setLoading(false);
    };

    fetchOrder();
  }, [id, user, navigate]);

  if (loading) {
    return (
      <div className="px-4 py-20 text-center text-primary font-bold uppercase tracking-widest animate-pulse">
        Carregando dados da missão...
      </div>
    );
  }

  if (!order) return null;

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-12 max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <span className="material-symbols-outlined text-green-500 text-6xl mb-4 block">task_alt</span>
        <h1 className="text-4xl sm:text-5xl font-black text-white uppercase tracking-tighter mb-4">Missão Cumprida</h1>
        <p className="text-slate-400 uppercase tracking-widest">Pedido Confirmado com Sucesso</p>
      </div>

      <div className="bg-surface border border-green-500/30 p-8 relative overflow-hidden mb-8">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <span className="material-symbols-outlined text-9xl text-green-500">verified</span>
        </div>
        
        <div className="relative z-10">
          <h2 className="text-xs font-bold tracking-widest text-primary uppercase mb-6">Identificação Oficial</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">ID do Pedido</p>
              <p className="text-white font-mono text-sm">{order.id}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Data da Operação</p>
              <p className="text-white text-sm uppercase">{new Date(order.created_at).toLocaleString('pt-BR')}</p>
            </div>
          </div>

          <div className="border-t border-border-tactical/50 pt-8 mb-8">
            <h3 className="text-xs font-bold tracking-widest text-primary uppercase mb-4">Destino da Carga</h3>
            <p className="text-white text-sm uppercase font-bold">{order.customer_data?.name}</p>
            <p className="text-slate-400 text-xs uppercase mt-1">
              Rua {order.shipping_address?.street} <br/>
              {order.shipping_address?.city} - CEP {order.shipping_address?.cep}
            </p>
          </div>

          <div className="border-t border-border-tactical/50 pt-8 mb-8">
            <h3 className="text-xs font-bold tracking-widest text-primary uppercase mb-4">Suprimentos Aquisitados</h3>
            <div className="space-y-4">
              {order.items?.map(item => (
                <div key={item.id} className="flex justify-between items-center text-xs">
                  <div className="flex-1 mr-4">
                    <p className="text-white uppercase font-bold truncate">{item.product_name}</p>
                    <p className="text-slate-500">Qtd: {item.quantity}</p>
                  </div>
                  <p className="text-white font-mono">{formatPrice(item.product_price * item.quantity)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-border-tactical pt-8 flex justify-between items-center">
            <span className="text-sm font-bold tracking-widest text-slate-400 uppercase">Investimento Total</span>
            <span className="text-2xl font-black text-primary">{formatPrice(order.total)}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link to="/dashboard" className="bg-primary text-background-dark font-black py-4 px-8 uppercase tracking-widest text-center hover:brightness-110 active:scale-[0.98] transition-all">
          Ver Missões (Dashboard)
        </Link>
        <Link to="/" className="border border-primary text-primary font-black py-4 px-8 uppercase tracking-widest text-center hover:bg-primary/10 active:scale-[0.98] transition-all">
          Continuar no Arsenal
        </Link>
      </div>
    </div>
  );
}
