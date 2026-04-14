import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { formatPrice } from '../../types/database';
import { UATScannerTester } from '../../components/UATScannerTester';

interface MonthlyRevenue {
  month: string;   // "Jan", "Fev", etc.
  revenue: number;
  orders: number;
}

interface TopProduct {
  name: string;
  qty: number;
  revenue: number;
}

interface LowStockItem {
  id: string;
  name: string;
  stock: number;
  brand: string;
}

export function AdminDashboard() {
  const [stats, setStats] = useState({ products: 0, orders: 0, revenue: 0, pendingOrders: 0, pendingOperators: 0 });
  const [monthly, setMonthly]   = useState<MonthlyRevenue[]>([]);
  const [byStatus, setByStatus] = useState<Record<string, number>>({});
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const [pendingOps, setPendingOps] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    const [prodRes, ordersRes, opsRes, evRes, lowStockRes, orderItemsRes] = await Promise.all([
      supabase.from('products').select('*', { count: 'exact', head: true }),
      supabase.from('orders').select('id, total, status, created_at, payment_status'),
      supabase.from('profiles').select('id, full_name, cpf_cnpj').eq('kyc_status', 'waiting_approval'),
      supabase.from('events').select('id, title').eq('status', 'published').order('created_at', { ascending: false }).limit(10),
      supabase.from('products').select('id, name, brand, stock').lt('stock', 4).order('stock', { ascending: true }).limit(10),
      supabase.from('order_items').select('product_name, quantity, product_price, order_id'),
    ]);

    const orders = ordersRes.data || [];
    const totalRevenue = orders.reduce((s, o) => s + (o.total || 0), 0);
    const pendingOrders = orders.filter(o => o.status === 'pendente' || o.status === 'processando').length;

    // --- Revenue por mês (últimos 6 meses) ---
    const now = new Date();
    const MONTHS_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    const monthMap: Record<string, MonthlyRevenue> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthMap[key] = { month: MONTHS_PT[d.getMonth()], revenue: 0, orders: 0 };
    }
    orders.forEach(o => {
      const key = o.created_at?.slice(0, 7);
      if (key && monthMap[key]) {
        monthMap[key].revenue += o.total || 0;
        monthMap[key].orders  += 1;
      }
    });
    const monthlyData = Object.values(monthMap);

    // --- Breakdown por status ---
    const statusCount: Record<string, number> = {};
    orders.forEach(o => { statusCount[o.status] = (statusCount[o.status] || 0) + 1; });

    // --- Top produtos ---
    const prodMap: Record<string, TopProduct> = {};
    (orderItemsRes.data || []).forEach((item: any) => {
      if (!prodMap[item.product_name]) prodMap[item.product_name] = { name: item.product_name, qty: 0, revenue: 0 };
      prodMap[item.product_name].qty      += item.quantity || 0;
      prodMap[item.product_name].revenue  += (item.product_price || 0) * (item.quantity || 0);
    });
    const topProds = Object.values(prodMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    setStats({ products: prodRes.count || 0, orders: orders.length, revenue: totalRevenue, pendingOrders, pendingOperators: opsRes.data?.length || 0 });
    setMonthly(monthlyData);
    setByStatus(statusCount);
    setTopProducts(topProds);
    setLowStock(lowStockRes.data || []);
    setPendingOps(opsRes.data || []);
    const evList = evRes.data || [];
    setEvents(evList);
    if (evList.length) setSelectedEventId(evList[0].id);
    setLoading(false);
  }

  const handleApproveOperator = async (id: string) => {
    setProcessing(id);
    await supabase.from('profiles').update({ kyc_status: 'approved', role: 'organizer' }).eq('id', id);
    setPendingOps(prev => prev.filter(op => op.id !== id));
    setStats(prev => ({ ...prev, pendingOperators: prev.pendingOperators - 1 }));
    setProcessing(null);
  };

  if (loading) return <div className="animate-pulse text-primary font-bold uppercase tracking-widest text-xs py-20 text-center">Acessando Banco de Dados...</div>;

  const maxRevenue = Math.max(...monthly.map(m => m.revenue), 1);

  const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    pendente:    { label: 'Pendente',    color: 'bg-yellow-500' },
    processando: { label: 'Processando', color: 'bg-blue-500'   },
    em_transito: { label: 'Em Trânsito', color: 'bg-indigo-500' },
    pago:        { label: 'Pago',        color: 'bg-green-500'  },
    entregue:    { label: 'Entregue',    color: 'bg-emerald-500'},
    cancelado:   { label: 'Cancelado',   color: 'bg-red-500'    },
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Visão Geral do QG</h2>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Status da Operação Perfection Airsoft</p>
        </div>
        <button onClick={loadAll} className="text-[10px] font-black text-primary border border-primary/20 px-4 py-2 uppercase tracking-widest hover:bg-primary/5 transition-all flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">refresh</span> Atualizar
        </button>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <a href="/admin/produtos?action=new" className="bg-primary/10 border border-primary/30 p-6 flex items-center gap-4 hover:bg-primary/20 transition-all group">
          <span className="material-symbols-outlined text-3xl text-primary group-hover:scale-110 transition-transform">add_box</span>
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-widest">Adicionar Produto</h3>
            <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-0.5">Incorporar novo item ao arsenal</p>
          </div>
        </a>
        <a href="/drop/criar" className="bg-white/5 border border-white/10 p-6 flex items-center gap-4 hover:bg-white/10 transition-all group">
          <span className="material-symbols-outlined text-3xl text-slate-400 group-hover:scale-110 transition-transform">military_tech</span>
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-widest">Criar Drop</h3>
            <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-0.5">Iniciar nova missão de sorteio</p>
          </div>
        </a>
        <a href="/admin/pedidos" className="bg-white/5 border border-white/10 p-6 flex items-center gap-4 hover:bg-white/10 transition-all group relative">
          <span className="material-symbols-outlined text-3xl text-slate-400 group-hover:scale-110 transition-transform">assignment</span>
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-widest">Ver Pedidos</h3>
            <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-0.5">Gerenciar vendas e entregas</p>
          </div>
          {stats.pendingOrders > 0 && (
            <span className="absolute top-3 right-3 bg-red-500 text-white text-[8px] font-black w-5 h-5 rounded-full flex items-center justify-center">{stats.pendingOrders}</span>
          )}
        </a>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Arsenal Ativo',       value: stats.products,          icon: 'inventory_2', color: 'text-blue-500' },
          { label: 'Total de Pedidos',     value: stats.orders,            icon: 'assignment',  color: 'text-primary'  },
          { label: 'Receita Total',        value: formatPrice(stats.revenue), icon: 'payments',    color: 'text-green-500' },
          { label: 'Operadores Pendentes', value: stats.pendingOperators,  icon: 'badge',       color: 'text-red-500'  },
        ].map(card => (
          <div key={card.label} className="bg-surface border border-border-tactical p-5 relative overflow-hidden group">
            <div className={`absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity ${card.color}`}>
              <span className="material-symbols-outlined text-5xl">{card.icon}</span>
            </div>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">{card.label}</p>
            <p className="text-2xl font-black text-white tracking-tight">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Revenue Chart */}
      <div className="bg-surface border border-border-tactical p-6">
        <h3 className="text-sm font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-lg">bar_chart</span>
          Receita — Últimos 6 Meses
        </h3>
        <div className="flex items-end gap-3 h-40">
          {monthly.map(m => (
            <div key={m.month} className="flex-1 flex flex-col items-center gap-2">
              <span className="text-[8px] text-primary font-mono font-black">{m.revenue > 0 ? formatPrice(m.revenue).replace('R$ ', '') : '—'}</span>
              <div className="w-full bg-white/5 relative flex items-end" style={{ height: '80px' }}>
                <div
                  className="w-full bg-primary/80 hover:bg-primary transition-all"
                  style={{ height: `${Math.round((m.revenue / maxRevenue) * 100)}%`, minHeight: m.revenue > 0 ? '4px' : '0' }}
                />
              </div>
              <span className="text-[9px] text-slate-500 font-black uppercase">{m.month}</span>
              <span className="text-[8px] text-slate-600 font-mono">{m.orders} ped.</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Orders by Status */}
        <div className="bg-surface border border-border-tactical p-6">
          <h3 className="text-sm font-black text-white uppercase tracking-widest mb-5 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-lg">donut_small</span>
            Pedidos por Status
          </h3>
          <div className="space-y-3">
            {Object.entries(byStatus).length === 0 ? (
              <p className="text-slate-500 text-[10px] uppercase tracking-widest italic">Nenhum pedido ainda.</p>
            ) : (
              Object.entries(byStatus).sort((a, b) => b[1] - a[1]).map(([status, count]) => {
                const cfg = STATUS_LABELS[status] || { label: status, color: 'bg-slate-500' };
                const pct = Math.round((count / stats.orders) * 100);
                return (
                  <div key={status}>
                    <div className="flex justify-between text-[9px] font-black uppercase tracking-wider mb-1">
                      <span className="text-slate-300">{cfg.label}</span>
                      <span className="text-slate-500">{count} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 bg-white/5 w-full">
                      <div className={`h-full ${cfg.color} transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-surface border border-border-tactical p-6">
          <h3 className="text-sm font-black text-white uppercase tracking-widest mb-5 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-lg">emoji_events</span>
            Top 5 Produtos
          </h3>
          {topProducts.length === 0 ? (
            <p className="text-slate-500 text-[10px] uppercase tracking-widest italic">Ainda sem vendas registradas.</p>
          ) : (
            <div className="space-y-3">
              {topProducts.map((p, i) => (
                <div key={p.name} className="flex items-center gap-3">
                  <span className="text-[10px] font-black text-primary w-4">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black text-white uppercase truncate">{p.name}</p>
                    <p className="text-[8px] text-slate-500 font-mono">{p.qty} unid. · {formatPrice(p.revenue)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Low Stock Alert */}
        <div className="bg-surface border border-border-tactical p-6">
          <h3 className="text-sm font-black text-white uppercase tracking-widest mb-5 flex items-center gap-2">
            <span className="material-symbols-outlined text-red-500 text-lg">warning</span>
            Estoque Crítico
            {lowStock.length > 0 && <span className="bg-red-500/20 text-red-400 px-2 py-0.5 text-[8px] font-black rounded animate-pulse">{lowStock.length} itens</span>}
          </h3>
          {lowStock.length === 0 ? (
            <p className="text-slate-500 text-[10px] uppercase tracking-widest italic flex items-center gap-2">
              <span className="material-symbols-outlined text-green-500 text-sm">check_circle</span>
              Estoque em dia.
            </p>
          ) : (
            <div className="space-y-2">
              {lowStock.map(item => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-red-500/5 border border-red-500/10 hover:border-red-500/30 transition-all">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black text-white uppercase truncate">{item.name}</p>
                    <p className="text-[8px] text-slate-500 uppercase tracking-widest">{item.brand}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`text-sm font-black font-mono ${item.stock === 0 ? 'text-red-500' : 'text-yellow-500'}`}>{item.stock}</span>
                    <Link to={`/admin/produtos`} className="text-[8px] font-black text-primary/60 hover:text-primary uppercase tracking-widest border border-primary/20 px-2 py-1 transition-all">
                      Editar
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending Operators */}
        <div className="bg-surface border border-border-tactical p-6">
          <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-5 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-lg">badge</span>
              Operadores Pendentes
            </span>
            {stats.pendingOperators > 0 && (
              <span className="bg-red-500/20 text-red-500 px-2 py-1 text-[8px] animate-pulse font-black">REVISÃO</span>
            )}
          </h3>
          {pendingOps.length > 0 ? (
            <div className="space-y-3">
              {pendingOps.map(op => (
                <div key={op.id} className="flex items-center justify-between p-3 bg-background-dark/50 border border-white/5 hover:border-primary/20 transition-all">
                  <div>
                    <p className="text-[10px] text-white font-black uppercase">{op.full_name || 'Agente Sem Nome'}</p>
                    <p className="text-[8px] text-slate-500 font-mono mt-0.5">ID: {op.id.substring(0, 8)}…</p>
                  </div>
                  <button
                    onClick={() => handleApproveOperator(op.id)}
                    disabled={processing === op.id}
                    aria-label={`Aprovar operador ${op.full_name}`}
                    className="bg-primary/10 hover:bg-primary text-primary hover:text-background-dark border border-primary/20 px-4 py-2 text-[8px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
                  >
                    {processing === op.id ? '...' : 'Aprovar'}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <span className="material-symbols-outlined text-slate-700 text-4xl mb-2 block">check_circle</span>
              <p className="text-slate-500 text-[10px] uppercase tracking-widest italic">Nenhum operador aguardando.</p>
            </div>
          )}
        </div>
      </div>

      {/* UAT Tester */}
      {events.length > 0 && (
        <div className="bg-surface border border-primary/20 p-6">
          <h3 className="text-sm font-bold text-primary uppercase tracking-widest mb-4 border-b border-primary/20 pb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">terminal</span> Simulador de Compra (UAT)
          </h3>
          <select value={selectedEventId} onChange={e => setSelectedEventId(e.target.value)}
            className="w-full bg-background-dark border border-white/10 text-white text-[11px] px-3 py-2 mb-4 font-mono uppercase tracking-wide focus:outline-none focus:border-primary">
            {events.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
          </select>
          {selectedEventId && (
            <UATScannerTester eventId={selectedEventId} eventTitle={events.find(e => e.id === selectedEventId)?.title || ''} />
          )}
        </div>
      )}
    </div>
  );
}
