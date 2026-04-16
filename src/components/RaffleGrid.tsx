import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Timer, Lock, CheckCircle, Info } from 'lucide-react';

interface RaffleNumber {
  numero: number;
  status: 'available' | 'reserved' | 'sold';
  expires_at?: string;
  reserved_by?: string;
}

interface RaffleGridProps {
  raffleId: string;
  totalTickets: number;
  ticketPrice: number;
  onSelectionChange: (selected: number[]) => void;
  currentUserId?: string;
}

export const RaffleGrid: React.FC<RaffleGridProps> = ({ 
  raffleId, 
  totalTickets, 
  onSelectionChange,
  currentUserId 
}) => {
  const [numbers, setNumbers] = useState<Record<number, RaffleNumber>>({});
  const [selected, setSelected] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNumbers();
    
    // Inscrição em Tempo Real para mudanças de status
    const channel = supabase
      .channel(`public:rifa_numeros:raffle_id=eq.${raffleId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'rifa_numeros',
        filter: `rifa_id=eq.${raffleId}`
      }, (payload) => {
        console.log('[REALTIME] Mudança detectada:', payload);
        const newNum = payload.new as RaffleNumber;
        setNumbers(prev => ({
          ...prev,
          [newNum.numero]: newNum
        }));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [raffleId]);

  const loadNumbers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('rifa_numeros')
        .select('numero, status, expires_at, reserved_by')
        .eq('rifa_id', raffleId);

      if (error) throw error;

      const numbersMap: Record<number, RaffleNumber> = {};
      data?.forEach(n => {
        numbersMap[n.numero] = n;
      });
      setNumbers(numbersMap);
    } catch (err) {
      console.error('Erro ao carregar números:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleNumber = (num: number) => {
    const status = numbers[num]?.status || 'available';
    if (status !== 'available') return;

    let newSelected: number[];
    if (selected.includes(num)) {
      newSelected = selected.filter(n => n !== num);
    } else {
      newSelected = [...selected, num];
    }
    
    setSelected(newSelected);
    onSelectionChange(newSelected);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-5 md:grid-cols-10 gap-2 animate-pulse">
        {Array.from({ length: 40 }).map((_, i) => (
          <div key={i} className="aspect-square bg-white/5 border border-white/10" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Legenda Operacional */}
      <div className="flex flex-wrap gap-4 p-4 bg-black/40 border border-white/5 rounded-sm">
        <div className="flex items-center gap-2">
          <div className="size-3 bg-white/5 border border-white/20" />
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Disponível</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="size-3 bg-amber-500/20 border border-amber-500/40" />
          <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest">Reservado</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="size-3 bg-red-500/20 border border-red-500/40" />
          <span className="text-[9px] font-black text-red-500 uppercase tracking-widest">Vendido</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="size-3 bg-primary border border-primary" />
          <span className="text-[9px] font-black text-background-dark uppercase tracking-widest">Sua Seleção</span>
        </div>
      </div>

      {/* Grid de Números */}
      <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-1.5 max-h-[400px] overflow-y-auto p-2 bg-black/60 border border-white/5 scrollbar-thin scrollbar-thumb-primary/20">
        {Array.from({ length: totalTickets }).map((_, i) => {
          const num = i + 1;
          const data = numbers[num];
          const status = data?.status || 'available';
          const isSelected = selected.includes(num);
          const isUserReserved = status === 'reserved' && data?.reserved_by === currentUserId;

          let className = "aspect-square text-[10px] font-bold border transition-all flex flex-col items-center justify-center relative ";
          
          if (isSelected) {
            className += "bg-primary text-black border-primary z-10 scale-105 shadow-[0_0_15px_rgba(251,191,36,0.3)]";
          } else if (status === 'sold') {
            className += "bg-red-500/10 text-red-500/30 border-red-500/10 cursor-not-allowed";
          } else if (status === 'reserved') {
            className += isUserReserved 
              ? "bg-amber-500/40 text-background-dark border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.2)]" 
              : "bg-amber-500/10 text-amber-500/40 border-amber-500/10 cursor-not-allowed";
          } else {
            className += "bg-white/5 text-slate-500 border-white/10 hover:border-primary/50 hover:text-white";
          }

          return (
            <button
              key={num}
              onClick={() => toggleNumber(num)}
              disabled={status !== 'available'}
              className={className}
              title={status === 'reserved' ? 'Reservado Temporariamente' : status === 'sold' ? 'Vendido' : 'Disponível'}
            >
              {num}
              {status === 'reserved' && (
                <div className="absolute top-0.5 right-0.5">
                  <Timer size={6} className={isUserReserved ? "text-background-dark" : "text-amber-500/40"} />
                </div>
              )}
              {status === 'sold' && (
                <CheckCircle size={8} className="absolute inset-0 m-auto text-red-500/20" />
              )}
            </button>
          );
        })}
      </div>

      {selected.length > 0 && (
        <div className="animate-in slide-in-from-bottom-2 flex items-center gap-3 p-4 bg-primary/10 border-l-4 border-primary">
          <Info size={16} className="text-primary" />
          <p className="text-[10px] font-black text-white uppercase tracking-widest">
            {selected.length} NÚMEROS SELECIONADOS. ELES SERÃO RESERVADOS POR 10 MINUTOS APÓS INICIAR O CHECKOUT.
          </p>
        </div>
      )}
    </div>
  );
};
