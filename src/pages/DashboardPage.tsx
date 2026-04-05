import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useOrders } from '../hooks/useOrders';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { useEffect } from 'react';
import { formatPrice, statusLabels, type Order } from '../types/database';

type DashboardTab = 'pedidos' | 'perfil' | 'enderecos';

export function DashboardPage() {
  const { orders, loading } = useOrders();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<DashboardTab>('pedidos');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  if (!user) return (
    <div className="px-4 sm:px-6 lg:px-8 py-20 text-center">
      <span className="material-symbols-outlined text-primary text-5xl mb-4 block">lock</span>
      <p className="text-xl font-bold uppercase tracking-widest mb-4">Acesso Restrito</p>
      <Link to="/login" className="bg-primary text-background-dark font-bold py-3 px-8 uppercase tracking-widest inline-block">Fazer Login</Link>
    </div>
  );

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-2 mb-8">
        <div className="h-1 w-12 bg-primary"></div>
        <span className="text-primary text-xs font-black tracking-widest uppercase">Comando Central</span>
      </div>
      
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Navigation */}
        <aside className="lg:w-64 shrink-0">
          <div className="bg-surface border border-border-tactical p-2 flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible no-scrollbar">
            {[
              { id: 'pedidos', label: 'Meus Pedidos', icon: 'receipt_long' },
              { id: 'perfil', label: 'Dados do Operador', icon: 'person' },
              { id: 'enderecos', label: 'Endereços', icon: 'location_on' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id as DashboardTab); setSelectedOrder(null); }}
                className={`flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-primary text-black' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
              >
                <span className="material-symbols-outlined text-lg">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </aside>

        {/* Content Area */}
        <div className="flex-1">
          {activeTab === 'pedidos' && (
            selectedOrder ? (
              <OrderDetails order={selectedOrder} onBack={() => setSelectedOrder(null)} />
            ) : (
              <OrdersList orders={orders} loading={loading} onSelect={setSelectedOrder} />
            )
          )}
          
          {activeTab === 'perfil' && <ProfileForm user={user} />}
          
          {activeTab === 'enderecos' && <AddressSection orders={orders} />}
        </div>
      </div>
    </div>
  );
}

// Sub-component: Orders List
function OrdersList({ orders, loading, onSelect }: { orders: Order[], loading: boolean, onSelect: (o: Order) => void }) {
  if (loading) return <div className="text-center py-20 text-primary animate-pulse uppercase tracking-widest">Sincronizando arsenal...</div>;
  if (orders.length === 0) return (
    <div className="bg-surface border border-border-tactical p-12 text-center">
      <span className="material-symbols-outlined text-slate-600 text-6xl mb-4 block">inventory</span>
      <p className="text-slate-500 uppercase tracking-widest mb-6 font-bold">Nenhuma missão iniciada</p>
      <Link to="/" className="bg-primary text-background-dark font-bold py-3 px-8 uppercase tracking-widest inline-block text-xs">Explorar Loja</Link>
    </div>
  );

  return (
    <div className="bg-surface border border-border-tactical overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-border-tactical bg-black/20">
            <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Pedido</th>
            <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest hidden sm:table-cell text-center">Data</th>
            <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Status</th>
            <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Ação</th>
          </tr>
        </thead>
        <tbody>
          {orders.map(o => {
            const st = statusLabels[o.status] || statusLabels.pendente;
            return (
              <tr key={o.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                <td className="p-4">
                  <span className="text-xs font-mono text-primary group-hover:underline">#{o.id.slice(0, 8).toUpperCase()}</span>
                  <p className="text-[10px] text-white/30 hidden sm:block">{formatPrice(o.total)}</p>
                </td>
                <td className="p-4 text-[10px] text-slate-400 hidden sm:table-cell text-center font-bold tracking-widest">
                  {new Date(o.created_at).toLocaleDateString('pt-BR')}
                </td>
                <td className="p-4 text-center">
                  <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-sm border ${st.color} ${st.color.replace('text-', 'bg-').replace('500', '100')}/10`}>
                    {st.label}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <button onClick={() => onSelect(o)} className="text-primary hover:text-white transition-colors">
                    <span className="material-symbols-outlined">visibility</span>
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Sub-component: Order Details
function OrderDetails({ order, onBack }: { order: Order, onBack: () => void }) {
  const st = statusLabels[order.status] || statusLabels.pendente;
  
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <button onClick={onBack} className="flex items-center gap-2 text-primary hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest mb-4">
        <span className="material-symbols-outlined text-sm">arrow_back</span>
        Voltar para Lista
      </button>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* Order Header */}
          <div className="bg-surface border border-border-tactical p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl font-black text-white tracking-tighter uppercase mb-2">Pedido #{order.id.slice(0, 8).toUpperCase()}</h2>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Realizado em {new Date(order.created_at).toLocaleString('pt-BR')}</p>
              </div>
              <span className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 border ${st.color}`}>{st.label}</span>
            </div>

            <div className="space-y-4">
              {order.items?.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between border-t border-white/5 pt-4">
                  <div className="flex gap-4">
                    <div className="size-10 bg-white/5 border border-white/10 flex items-center justify-center text-primary/40 text-[9px] font-black italic">KIT</div>
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-tight">{item.product_name}</h4>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest italic">{item.quantity}un x {formatPrice(item.product_price)}</p>
                    </div>
                  </div>
                  <p className="text-sm font-bold text-white">{formatPrice(item.product_price * item.quantity)}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-8 border-t border-white/10 flex flex-col gap-2 items-end">
               <div className="flex justify-between w-full max-w-xs text-[10px] text-slate-500 uppercase font-bold tracking-widest">
                 <span>Subtotal</span>
                 <span className="text-white">{formatPrice(order.total)}</span>
               </div>
               <div className="flex justify-between w-full max-w-xs text-[10px] text-slate-500 uppercase font-bold tracking-widest">
                 <span>Frete e Logística</span>
                 <span className="text-green-500">GRÁTIS</span>
               </div>
               <div className="flex justify-between w-full max-w-xs mt-4 pt-4 border-t border-white/10">
                 <span className="text-xs font-black uppercase tracking-widest text-primary">Total da Missão</span>
                 <span className="text-xl font-black text-white">{formatPrice(order.total)}</span>
               </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-surface border border-border-tactical p-6">
            <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-4">Ponto de Extração</h3>
            <div className="space-y-3">
              <p className="text-xs text-slate-200 font-bold uppercase tracking-tight">{order.shipping_address?.street}, {order.shipping_address?.number}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest">{order.shipping_address?.city} - {order.shipping_address?.state}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest">CEP: {order.shipping_address?.zipcode}</p>
            </div>
          </div>

          <div className="bg-surface border border-border-tactical p-6 border-l-4 border-l-primary">
            <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-4">Informação de Rastreio</h3>
            <p className="text-[10px] text-slate-400 leading-relaxed uppercase tracking-widest italic">
              Seu pedido está sendo processado em nosso armazém. O código de rastreamento será disponibilizado assim que a extração for concluída.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Sub-component: Profile Form
function ProfileForm({ user }: { user: any }) {
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(data);
    };
    fetchProfile();
  }, [user.id]);

  return (
    <div className="bg-surface border border-border-tactical p-8 max-w-2xl relative overflow-hidden">
      {/* Status Badges */}
      <div className="absolute top-0 right-0 flex">
        {profile?.kyc_status === 'approved' && (
          <div className="bg-green-500 text-black font-black text-[8px] px-3 py-1 uppercase tracking-widest flex items-center gap-1">
            <span className="material-symbols-outlined text-[10px]">verified</span>
            Operador Verificado
          </div>
        )}
        {(profile?.role === 'organizer' || profile?.role === 'admin') && (
          <div className="bg-primary text-black font-black text-[8px] px-3 py-1 uppercase tracking-widest flex items-center gap-1">
            <span className="material-symbols-outlined text-[10px]">military_tech</span>
            Organizador {profile?.role === 'admin' ? 'QG' : 'Elite'}
          </div>
        )}
      </div>

      <h3 className="text-xs font-black text-primary uppercase tracking-[0.3em] mb-8">Credenciais do Operador</h3>
      <form className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-2 tracking-widest uppercase">Nome de Registro</label>
            <input type="text" defaultValue={user.user_metadata?.full_name || ''} className="w-full bg-background-dark border border-border-tactical text-white px-4 py-3 text-xs tracking-tight focus:ring-1 focus:ring-primary"/>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-2 tracking-widest uppercase">E-mail Operacional</label>
            <input type="email" readOnly value={user.email} className="w-full bg-background-dark border border-border-tactical text-white/40 px-4 py-3 text-xs tracking-tight cursor-not-allowed"/>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-2 tracking-widest uppercase">CPF (Documentação)</label>
            <input type="text" placeholder="---.---.------" className="w-full bg-background-dark border border-border-tactical text-white px-4 py-3 text-xs tracking-tight focus:ring-1 focus:ring-primary"/>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-2 tracking-widest uppercase">Telefone / Rádio</label>
            <input type="text" placeholder="(DD) 99999-9999" className="w-full bg-background-dark border border-border-tactical text-white px-4 py-3 text-xs tracking-tight focus:ring-1 focus:ring-primary"/>
          </div>
        </div>
        <button disabled className="bg-primary text-background-dark font-black py-4 px-12 text-[10px] uppercase tracking-[0.3em] opacity-50 cursor-not-allowed">Atualizar Registro (Bloqueado)</button>
      </form>

      {/* WhatsApp Support Bridge */}
      <div className="mt-8 p-6 bg-[#25D366]/5 border border-[#25D366]/20 border-l-4 border-l-[#25D366] flex items-center justify-between gap-6">
        <div className="flex-1">
          <h4 className="text-[10px] font-black text-[#25D366] uppercase tracking-[0.3em] mb-2">Canal de Suporte Urgente</h4>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest leading-relaxed">
            Precisa de auxílio técnico ou alteração em uma missão? Fale diretamente com o Armeiro Chefe via canal criptografado.
          </p>
        </div>
        <a 
          href="https://wa.me/5511999999999?text=Olá! Sou um operador registrado e preciso de suporte tático."
          target="_blank"
          rel="noopener noreferrer"
          className="bg-[#25D366] text-white font-black py-3 px-6 text-[9px] uppercase tracking-widest hover:bg-white hover:text-[#25D366] transition-all flex items-center gap-2 shrink-0"
        >
          <span className="material-symbols-outlined text-sm">communication</span>
          Abrir Rádio
        </a>
      </div>
    </div>
  );
}

// Sub-component: Address Section
function AddressSection({ orders }: { orders: Order[] }) {
  const lastAddr = orders[0]?.shipping_address;
  return (
    <div className="bg-surface border border-border-tactical p-8 max-w-2xl">
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-xs font-black text-primary uppercase tracking-[0.3em]">Locais de Desembarque</h3>
        <button className="text-[8px] font-black text-white uppercase tracking-widest border border-white/20 px-3 py-1 hover:bg-white/5">+ Novo Endereço</button>
      </div>

      {lastAddr ? (
        <div className="bg-background-dark/50 border border-primary/10 p-6 flex justify-between items-start">
          <div className="space-y-2">
            <span className="text-[8px] font-black bg-primary text-black px-1.5 py-0.5 uppercase tracking-widest mb-2 inline-block">Padrão</span>
            <p className="text-xs text-white font-bold uppercase tracking-tight">{lastAddr.street}, {lastAddr.number}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest">{lastAddr.city} - {lastAddr.state}</p>
          </div>
          <span className="material-symbols-outlined text-white/20 text-lg">edit</span>
        </div>
      ) : (
        <p className="text-slate-500 text-[10px] uppercase tracking-widest italic py-8 border-2 border-dashed border-white/5 text-center">Nenhum endereço tático registrado.</p>
      )}
    </div>
  );
}
