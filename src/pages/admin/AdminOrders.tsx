import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Order } from '../../types/database';
import { formatPrice } from '../../types/database';

export function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  async function fetchOrders() {
    const { data } = await supabase
      .from('orders')
      .select('*, items:order_items(*)')
      .order('created_at', { ascending: false });
    setOrders(data || []);
    setLoading(false);
  }

  const updateOrder = async (id: string, updates: Partial<Order>) => {
    setUpdating(id);
    await supabase.from('orders').update(updates).eq('id', id);
    await fetchOrders();
    setUpdating(null);
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'entregue': return 'text-green-500 border-green-500/20 bg-green-500/5';
      case 'cancelado': return 'text-red-500 border-red-500/20 bg-red-500/5';
      case 'em_transito': return 'text-blue-400 border-blue-400/20 bg-blue-400/5';
      default: return 'text-yellow-500 border-yellow-500/20 bg-yellow-500/5';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Missões em Curso</h2>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Central de Comando e Logística</p>
        </div>
        <button onClick={fetchOrders} className="text-[10px] font-black text-primary border border-primary/20 px-4 py-2 uppercase tracking-widest hover:bg-primary/5 transition-all">Sincronizar Satélite</button>
      </div>

      {loading ? (
        <div className="text-center py-20 animate-pulse text-primary font-bold uppercase tracking-widest">Rastreando Localizações...</div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <div key={order.id} className={`bg-surface border border-border-tactical p-6 transition-all ${updating === order.id ? 'opacity-50 animate-pulse' : ''}`}>
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* ID & Date */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="h-1 w-4 bg-primary"></span>
                    <p className="text-white font-mono text-sm uppercase tracking-tighter">#{order.id.slice(0,8)}</p>
                  </div>
                  <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">{new Date(order.created_at).toLocaleString('pt-BR')}</p>
                  <div className="mt-4 p-3 bg-black/40 border border-white/5 rounded">
                    <p className="text-[8px] text-slate-500 uppercase font-black mb-1">Status de Pagamento</p>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${
                      order.payment_status === 'pago' || order.payment_status === 'approved' ? 'text-green-500' : 'text-yellow-500'
                    }`}>
                      {order.payment_status === 'pago' || order.payment_status === 'approved' ? 'Aprovado' : 'Pendente'}
                    </span>
                  </div>
                </div>

                {/* Customer & Items */}
                <div className="lg:col-span-2">
                  <div className="mb-4">
                    <h4 className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Operador Responsável</h4>
                    <p className="text-white font-bold uppercase text-sm">{order.customer_data?.name}</p>
                    <p className="text-slate-400 text-xs">{order.customer_data?.email} | {order.customer_data?.phone || '(S/T)'}</p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Carga Útil (Itens)</h4>
                    {order.items?.map((item, i) => (
                      <div key={i} className="flex justify-between items-center text-[10px] bg-white/5 p-2 border border-white/5">
                        <span className="text-slate-300 uppercase font-bold">{item.product_name}</span>
                        <span className="text-primary font-black">X{item.quantity}</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-2 border-t border-white/10">
                      <span className="text-[10px] text-slate-500 font-black uppercase">Valor Total</span>
                      <span className="text-lg font-black text-white">{formatPrice(order.total)}</span>
                    </div>
                  </div>
                </div>

                {/* Actions & Status */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Status da Missão</label>
                    <select 
                      value={order.status} 
                      onChange={(e) => updateOrder(order.id, { status: e.target.value as Order['status'] })}
                      className={`w-full px-4 py-3 border text-[10px] font-black uppercase tracking-widest bg-background-dark focus:outline-none focus:ring-1 focus:ring-primary ${getStatusStyle(order.status)}`}
                    >
                      <option value="pendente">Pendente</option>
                      <option value="processando">Processando</option>
                      <option value="em_transito">Em Trânsito</option>
                      <option value="entregue">Entregue</option>
                      <option value="cancelado">Cancelado</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Código de Rastreio</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="N/A"
                        defaultValue={order.tracking_code || ''}
                        onBlur={(e) => updateOrder(order.id, { tracking_code: e.target.value })}
                        className="flex-1 bg-background-dark border border-border-tactical text-white px-3 py-2 text-[10px] font-mono tracking-tighter focus:ring-1 focus:ring-primary uppercase"
                      />
                      <button className="bg-primary/10 border border-primary/20 text-primary p-2 hover:bg-primary/20 transition-all">
                        <span className="material-symbols-outlined text-sm">save</span>
                      </button>
                    </div>
                  </div>
                  <div className="p-3 bg-white/5 border border-white/5">
                    <p className="text-[8px] text-slate-500 uppercase font-black mb-1">Destino Final</p>
                    <p className="text-[10px] text-slate-300 font-bold uppercase">{order.shipping_address?.city} - {order.shipping_address?.state}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {!orders.length && <div className="text-center py-20 text-slate-500 uppercase tracking-widest italic border-2 border-dashed border-white/5">Silêncio de rádio: Nenhuma missão detectada.</div>}
        </div>
      )}
    </div>
  );
}
