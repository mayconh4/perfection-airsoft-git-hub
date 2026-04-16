import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { 
  Users, 
  Ticket, 
  Timer, 
  CheckCircle, 
  TrendingUp, 
  AlertCircle,
  Search,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { formatPrice } from '../types/database';

interface RaffleStats {
  id: string;
  title: string;
  total_tickets: number;
  available: number;
  reserved: number;
  sold: number;
  revenue: number;
  status: string;
}

export default function DashboardRifas() {
  const { user } = useAuth();
  const [raffles, setRaffles] = useState<RaffleStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user) {
      fetchRaffles();
      
      // Realtime subscription for ALL creator's raffles
      const channel = supabase
        .channel('dashboard-raffle-intel')
        .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'rifa_numeros' 
        }, () => {
            fetchRaffles(); // Simplificado: recarrega stats em qualquer mudança nos números
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchRaffles = async () => {
    try {
      // 1. Buscar todas as rifas do criador
      const { data: rafflesData, error: rafflesError } = await supabase
        .from('raffles')
        .select('*')
        .eq('creator_id', user?.id)
        .order('created_at', { ascending: false });

      if (rafflesError) throw rafflesError;

      // 2. Para cada rifa, buscar estatísticas de números
      const statsList: RaffleStats[] = await Promise.all((rafflesData || []).map(async (r) => {
        const { data: nums } = await supabase
          .from('rifa_numeros')
          .select('status')
          .eq('rifa_id', r.id);

        const counts = {
          available: nums?.filter(n => n.status === 'available').length || 0,
          reserved: nums?.filter(n => n.status === 'reserved').length || 0,
          sold: nums?.filter(n => n.status === 'sold').length || 0,
        };

        // Fallback: Se não houver dados em rifa_numeros (rifa antiga), usar dados da tabela raffles
        if (!nums || nums.length === 0) {
            counts.sold = r.sold_tickets || 0;
            counts.available = r.total_tickets - counts.sold;
        }

        return {
          id: r.id,
          title: r.title,
          total_tickets: r.total_tickets,
          ...counts,
          revenue: counts.sold * r.ticket_price,
          status: r.status || 'active'
        };
      }));

      setRaffles(statsList);
    } catch (err) {
      console.error('Erro ao carregar intel de rifas:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredRaffles = raffles.filter(r => 
    r.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-10 space-y-4 animate-pulse">
        <div className="h-10 bg-white/5 w-1/4 rounded"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1,2,3].map(i => <div key={i} className="h-32 bg-white/5 rounded"></div>)}
        </div>
      </div>
    );
  }

  const globalStats = raffles.reduce((acc, r) => ({
    totalSold: acc.totalSold + r.sold,
    totalReserved: acc.totalReserved + r.reserved,
    totalRevenue: acc.totalRevenue + r.revenue
  }), { totalSold: 0, totalReserved: 0, totalRevenue: 0 });

  return (
    <div className="min-h-screen bg-background-dark p-6 lg:p-12 space-y-12 crt-overlay">
      <div className="scanline"></div>
      
      {/* Header Tático */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="h-px w-6 bg-primary"></span>
            <span className="text-primary font-black uppercase tracking-[0.4em] text-[8px]">Intel de Operações</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-black text-white uppercase italic tracking-tighter">
            CENTRAL DE <span className="text-primary italic">RIFAS</span>
          </h1>
        </div>

        <div className="flex bg-black/40 border border-white/10 p-1 rounded-sm w-full md:w-auto">
          <div className="flex items-center px-4 text-slate-500">
            <Search size={16} />
          </div>
          <input 
            type="text" 
            placeholder="BUSCAR OPERAÇÃO..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest text-white py-3 px-2 focus:ring-0 w-full"
          />
        </div>
      </div>

      {/* Global Stats HUD */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface/30 border border-white/5 p-6 rounded-sm group hover:border-primary/20 transition-all">
          <div className="flex justify-between items-start mb-4">
            <TrendingUp size={16} className="text-emerald-500" />
            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Receita Total</span>
          </div>
          <div className="text-3xl font-black text-white italic font-mono tracking-tighter">
            {formatPrice(globalStats.totalRevenue, true)}
          </div>
        </div>

        <div className="bg-surface/30 border border-white/5 p-6 rounded-sm group hover:border-primary/20 transition-all">
          <div className="flex justify-between items-start mb-4">
            <CheckCircle size={16} className="text-primary" />
            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Tickets Vendidos</span>
          </div>
          <div className="text-3xl font-black text-white italic font-mono tracking-tighter">
            {globalStats.totalSold}
          </div>
        </div>

        <div className="bg-surface/30 border border-white/5 p-6 rounded-sm group hover:border-primary/20 transition-all">
          <div className="flex justify-between items-start mb-4">
            <Timer size={16} className="text-amber-500" />
            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Reservas Ativas</span>
          </div>
          <div className="text-3xl font-black text-white italic font-mono tracking-tighter">
            {globalStats.totalReserved}
          </div>
        </div>
      </div>

      {/* Active Raffles Grid */}
      <div className="grid grid-cols-1 gap-6">
        <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.5em] mb-2 flex items-center gap-3">
          <AlertCircle size={14} className="text-primary" />
          Protocolos Ativos
        </h3>

        {filteredRaffles.map(raffle => (
          <div key={raffle.id} className="bg-black/60 border border-white/5 hover:border-primary/40 transition-all rounded-sm group overflow-hidden">
            <div className="p-6 lg:p-8 flex flex-col lg:flex-row items-center justify-between gap-8">
              
              {/* Info da Rifa */}
              <div className="flex items-center gap-6 flex-1 min-w-0">
                <div className="size-16 bg-white/5 border border-white/10 flex items-center justify-center text-slate-700 group-hover:text-primary transition-colors">
                  <Ticket size={32} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-[8px] font-mono bg-white/5 px-2 py-0.5 border border-white/10 text-slate-500">ID: {raffle.id.slice(0, 8)}</span>
                    <h4 className="text-lg font-black text-white uppercase italic tracking-tighter truncate">{raffle.title}</h4>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <div className="size-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">SISTEMA ATÔMICO ATIVO</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Section */}
              <div className="flex flex-wrap items-center gap-10 w-full lg:w-auto">
                <div className="space-y-2 flex-1 lg:flex-initial">
                  <div className="flex justify-between text-[8px] font-black uppercase tracking-widest mb-1.5">
                    <span className="text-slate-500">Progresso de Venda</span>
                    <span className="text-primary">{((raffle.sold / raffle.total_tickets) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="h-1.5 w-full lg:w-48 bg-white/5 rounded-full flex overflow-hidden">
                    <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${(raffle.sold / raffle.total_tickets) * 100}%` }}></div>
                    <div className="h-full bg-amber-500/40 transition-all duration-1000" style={{ width: `${(raffle.reserved / raffle.total_tickets) * 100}%` }}></div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-8">
                  <div className="text-center">
                    <span className="text-[8px] text-slate-600 font-black uppercase tracking-widest block mb-1">Livres</span>
                    <span className="text-lg font-bold text-white/40">{raffle.available}</span>
                  </div>
                  <div className="text-center">
                    <span className="text-[8px] text-amber-500 font-black uppercase tracking-widest block mb-1">Holds</span>
                    <span className="text-lg font-bold text-amber-500">{raffle.reserved}</span>
                  </div>
                  <div className="text-center">
                    <span className="text-[8px] text-emerald-500 font-black uppercase tracking-widest block mb-1">Pagas</span>
                    <span className="text-lg font-bold text-emerald-500">{raffle.sold}</span>
                  </div>
                </div>

                <button className="p-4 bg-white/5 border border-white/5 text-slate-500 hover:text-primary hover:bg-primary/10 hover:border-primary/20 transition-all rounded-sm">
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>

            {/* Micro-feed de alertas */}
            {raffle.reserved > 0 && (
              <div className="px-6 py-2 bg-amber-500/5 border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={10} className="text-amber-500" />
                  <span className="text-[8px] font-black text-amber-500/80 uppercase tracking-widest">Existem reservas ativas sendo monitoradas pelo SAMA Protocol.</span>
                </div>
                <span className="text-[8px] font-mono text-slate-600">AUTO-CLEANUP ATIVO (10M)</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
