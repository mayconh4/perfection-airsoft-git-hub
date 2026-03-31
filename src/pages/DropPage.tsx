import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { SEO } from '../components/SEO';
import { supabase } from '../lib/supabase';

interface Raffle {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  ticket_price: number;
  total_tickets: number;
  sold_tickets: number;
  status: 'ativo' | 'finalizado' | 'cancelado';
  draw_date: string;
}

const MOCK_RAFFLES: Raffle[] = [
  {
    id: '1',
    title: 'Rifle M4A1 CQBR GBB',
    description: 'Rifle de alta performance com sistema Gas Blowback. Kit completo com 3 magazines extras.',
    image_url: null,
    ticket_price: 25,
    total_tickets: 500,
    sold_tickets: 342,
    status: 'ativo',
    draw_date: '2026-04-15T20:00:00',
  }
];

function RaffleCard({ raffle }: { raffle: Raffle }) {
  const percentSold = (raffle.sold_tickets / raffle.total_tickets) * 100;
  return (
    <div className="group relative bg-surface/20 border border-white/5 overflow-hidden transition-all duration-300 hover:border-primary/40 flex flex-col">
      <div className="h-1 w-full bg-primary/20 group-hover:bg-primary" />
      <div className="relative h-52 bg-gradient-to-br from-surface to-black flex items-center justify-center overflow-hidden">
        {raffle.image_url ? (
          <img src={raffle.image_url} alt={raffle.title} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
        ) : (
          <div className="opacity-20 group-hover:opacity-40 transition-opacity flex flex-col items-center gap-2">
            <span className="material-symbols-outlined text-5xl">inventory_2</span>
            <span className="text-[10px] font-black uppercase tracking-widest">Visual Intel Out</span>
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background-dark/90 to-transparent">
          <h3 className="text-lg font-black text-white uppercase tracking-tighter group-hover:text-primary transition-colors">
            {raffle.title}
          </h3>
          <div className="flex justify-between items-center mt-2">
            <span className="text-[10px] text-slate-500 font-mono">POOL: {raffle.total_tickets}</span>
            <span className="text-sm font-black text-primary">R$ {raffle.ticket_price.toFixed(2)}</span>
          </div>
        </div>
      </div>
      <div className="p-6">
        <div className="h-1 bg-white/5 mb-6">
            <div className="h-full bg-primary" style={{ width: `${percentSold}%` }} />
        </div>
        <Link 
          to={`/drop/${raffle.id}`}
          className="w-full bg-primary text-background-dark font-black py-4 text-[10px] uppercase tracking-[0.3em] hover:bg-white transition-all text-center block"
        >
          SELECIONAR TICKETS
        </Link>
      </div>
    </div>
  );
}

function TacticalDrafter() {
  const [maxNumber, setMaxNumber] = useState<number>(100);
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [tempNumber, setTempNumber] = useState<number>(0);

  const startDraw = () => {
    if (maxNumber < 1) return;
    setIsSpinning(true);
    let duration = 2000;
    let startTime = Date.now();
    const spin = () => {
      if (Date.now() - startTime < duration) {
        setTempNumber(Math.floor(Math.random() * maxNumber) + 1);
        requestAnimationFrame(spin);
      } else {
        setResult(Math.floor(Math.random() * maxNumber) + 1);
        setIsSpinning(false);
      }
    };
    spin();
  };

  return (
    <div className="bg-surface/10 border border-white/5 p-12 text-center max-w-2xl mx-auto">
      <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-8">SORTEADOR TÁTICO</h2>
      <div className="mb-12">
        <span className="text-8xl font-black font-mono text-primary animate-in zoom-in-95">
          {(isSpinning ? tempNumber : result || 0).toString().padStart(3, '0')}
        </span>
      </div>
      <div className="flex flex-col items-center gap-6">
          <input 
            type="number" 
            value={maxNumber}
            onChange={(e) => setMaxNumber(Number(e.target.value))}
            className="bg-black/40 border border-white/10 text-white text-center w-32 py-3 focus:border-primary outline-none"
          />
          <button 
            onClick={startDraw}
            disabled={isSpinning}
            className="bg-primary text-background-dark font-black px-12 py-4 text-[10px] uppercase tracking-widest hover:bg-white transition-all"
          >
            {isSpinning ? 'SORTEANDO...' : 'INICIAR SORTEIO'}
          </button>
      </div>
    </div>
  );
}

export default function DropPage() {
  const [raffles, setRaffles] = useState<Raffle[]>(MOCK_RAFFLES);
  const [showDrafter, setShowDrafter] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    loadRaffles();
  }, []);

  const loadRaffles = async () => {
    const { data } = await supabase
      .from('raffles')
      .select('*')
      .eq('status', 'ativo')
      .order('created_at', { ascending: false });
    
    if (data && data.length > 0) setRaffles(data);
  };

  return (
    <div className="min-h-screen bg-background-dark pb-20 pt-20 px-6 relative overflow-hidden crt-overlay">
      <div className="scanline"></div>
      <SEO title="Drops | Perfection Airsoft" />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Title & Actions */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-20">
          <div>
            <h1 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tighter italic">
              TACTICAL <span className="text-primary italic">DROPS</span>
            </h1>
            <p className="text-[10px] text-slate-500 font-mono uppercase tracking-[0.3em] mt-2">Inventory Division // Active Operations</p>
          </div>
          
          <div className="flex flex-wrap gap-4">
            <button 
              onClick={() => setShowDrafter(!showDrafter)}
              className="bg-white/5 border border-white/10 text-white font-black py-4 px-8 text-[10px] uppercase tracking-widest hover:bg-white hover:text-black transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">{showDrafter ? 'inventory_2' : 'casino'}</span>
              {showDrafter ? 'Ver Drops Ativos' : 'Abrir Sorteador'}
            </button>
            <Link 
              to="/drop/criar"
              className="bg-primary text-background-dark font-black py-4 px-8 text-[10px] uppercase tracking-widest hover:bg-white transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">rocket_launch</span>
              Criar Novo Drop
            </Link>
          </div>
        </div>

        {/* Dynamic Content */}
        <div className="animate-in fade-in duration-700">
          {showDrafter ? (
            <TacticalDrafter />
          ) : (
            <>
              <div className="flex items-center gap-4 mb-8">
                <span className="h-px w-8 bg-primary"></span>
                <h2 className="text-sm font-black text-white uppercase tracking-[0.3em] italic">Active Drops</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {raffles.map(r => (
                  <RaffleCard key={r.id} raffle={r} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
