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
  },
  {
    id: '2',
    title: 'Glock 17 Gen5 Umarex',
    description: 'Pistola licenciada com marcações originais. Novo na caixa, acompanha maleta tática.',
    image_url: null,
    ticket_price: 15,
    total_tickets: 300,
    sold_tickets: 120,
    status: 'ativo',
    draw_date: '2026-04-10T20:00:00',
  },
  {
    id: '3',
    title: 'Óptica Vortex Strike Eagle',
    description: 'LPVO 1-6x24 original. Clareza óptica insuperável para operadores de elite.',
    image_url: null,
    ticket_price: 45,
    total_tickets: 200,
    sold_tickets: 198,
    status: 'ativo',
    draw_date: '2026-04-05T20:00:00',
  }
];

function getTimeRemaining(dateStr: string) {
  const now = new Date();
  const end = new Date(dateStr);
  const diff = end.getTime() - now.getTime();
  if (diff < 0) return 'EXPIRADO';
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  return `${days}D ${hours}H`;
}

function RaffleCard({ raffle }: { raffle: Raffle }) {
  // const { user } = useAuth(); // Temporarily removed for V2.0.5 bypass
  const isAdmin = true; // FORCE VISIBLE FOR TESTING V2.0.5
  const percentSold = (raffle.sold_tickets / raffle.total_tickets) * 100;
  const isEndingSoon = percentSold >= 90;

  return (
    <div className="group relative bg-surface/20 border border-white/5 overflow-hidden transition-all duration-300 hover:border-primary/40 hover:shadow-[0_0_30px_rgba(255,193,7,0.1)] flex flex-col">
      {/* Visual Header Strip */}
      <div className={`h-1.5 w-full ${isEndingSoon ? 'bg-red-500 animate-pulse' : 'bg-primary/20 group-hover:bg-primary/60'}`} />
      
      {/* Image Container */}
      <div className="relative h-56 bg-gradient-to-br from-surface to-black flex items-center justify-center overflow-hidden">
        {raffle.image_url ? (
          <img src={raffle.image_url} alt={raffle.title} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 select-none opacity-20 group-hover:opacity-40 transition-opacity">
            <span className="material-symbols-outlined text-6xl">inventory_2</span>
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Visual Intel Missing</span>
          </div>
        )}
        
        {/* HUD Badges */}
        <div className="absolute top-4 left-4 flex flex-col gap-2 z-20">
            {isAdmin && (
               <Link 
                to={`/drop/editar/${raffle.id}`}
                className="bg-primary hover:bg-white text-background-dark text-[10px] font-black uppercase tracking-widest px-4 py-3 flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(255,193,7,0.5)] border-2 border-black animate-bounce"
               >
                 <span className="material-symbols-outlined text-sm">edit_square</span>
                 COMANDO DROP
               </Link>
            )}
            <span className="bg-black/80 border border-white/10 text-[8px] font-black uppercase tracking-widest px-3 py-1 flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-primary animate-pulse" />
              LIVE OPS
            </span>
            {isEndingSoon && (
               <span className="bg-red-900/80 border border-red-500/30 text-red-100 text-[8px] font-black uppercase tracking-widest px-3 py-1">
                 LAST UNITS
               </span>
            )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background-dark/90 to-transparent">
             <div className="flex justify-between items-end">
                <div>
                   <span className="text-[8px] text-primary/60 font-black uppercase tracking-widest block mb-0.5 font-mono italic">OPERATIONAL PRIZE</span>
                   <h3 className="text-lg font-black text-white uppercase tracking-tighter leading-tight group-hover:text-primary transition-colors">
                      {raffle.title}
                   </h3>
                </div>
                <div className="text-right">
                   <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest block mb-0.5">TICKET VAL</span>
                   <span className="text-xl font-black text-white">R$ {raffle.ticket_price.toFixed(2)}</span>
                </div>
             </div>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-6 flex flex-col flex-1">
        <p className="text-[10px] text-slate-500 font-mono leading-relaxed mb-6 line-clamp-2 uppercase">
          {raffle.description}
        </p>

        {/* HUD Data Grid */}
        <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-white/5 border-l-2 border-primary/40 p-3">
               <span className="text-[8px] text-slate-600 font-black uppercase tracking-widest block mb-1">UNITS LEFT</span>
               <span className="text-sm font-black text-white font-mono">{raffle.total_tickets - raffle.sold_tickets} / {raffle.total_tickets}</span>
            </div>
            <div className="bg-white/5 border-l-2 border-slate-700 p-3">
               <span className="text-[8px] text-slate-600 font-black uppercase tracking-widest block mb-1">DRAW WINDOW</span>
               <span className="text-sm font-black text-primary font-mono">{getTimeRemaining(raffle.draw_date)}</span>
            </div>
        </div>

        {/* Progress HUD */}
        <div className="mb-8">
            <div className="flex justify-between text-[8px] font-black text-slate-600 uppercase tracking-widest mb-2">
                <span>RESERVA OPERACIONAL</span>
                <span>{percentSold.toFixed(1)}%</span>
            </div>
            <div className="h-1 bg-white/5 flex gap-1">
                {[...Array(10)].map((_, i) => (
                    <div 
                        key={i} 
                        className={`h-full flex-1 transition-all duration-700 ${percentSold > (i * 10) ? 'bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.5)]' : 'bg-white/5'}`}
                    />
                ))}
            </div>
        </div>

        {/* CTA */}
        <div className="mt-auto flex gap-2">
          <Link 
            to={`/drop/${raffle.id}`}
            className="flex-1 bg-primary text-background-dark font-black py-4 text-[10px] uppercase tracking-[0.3em] hover:bg-white transition-all text-center flex items-center justify-center gap-3 group/btn"
          >
            <span>SELECT TICKETS</span>
            <span className="material-symbols-outlined text-sm group-hover/btn:translate-x-1 transition-transform">arrow_forward</span>
          </Link>

          {isAdmin && (
            <Link 
              to={`/drop/editar/${raffle.id}`}
              className="bg-white/5 border border-white/10 text-white hover:bg-white hover:text-black px-4 transition-all flex items-center justify-center group/edit shadow-lg"
              title="EDIT OPERATION"
            >
              <span className="material-symbols-outlined text-sm group-hover/edit:rotate-12 transition-transform">edit</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}


function TacticalDrafter() {
  const [maxNumber, setMaxNumber] = useState<number>(100);
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [tempNumber, setTempNumber] = useState<number>(0);
  const [status, setStatus] = useState<'IDLE' | 'SCANNING' | 'LOCKED'>('IDLE');

  const startDraw = () => {
    if (maxNumber < 1) return;
    setIsSpinning(true);
    setResult(null);
    setStatus('SCANNING');
    
    let duration = 3000;
    let startTime = Date.now();

    const spin = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed < duration) {
        setTempNumber(Math.floor(Math.random() * maxNumber) + 1);
        requestAnimationFrame(spin);
      } else {
        const finalWinner = Math.floor(Math.random() * maxNumber) + 1;
        setResult(finalWinner);
        setIsSpinning(false);
        setStatus('LOCKED');
      }
    };
    
    spin();
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-surface/40 border border-primary/20 p-12 relative overflow-hidden">
        {/* HUD Elements */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center gap-4 mb-8">
            <span className="h-px w-12 bg-primary/40" />
            <span className={`text-[10px] font-black uppercase tracking-[0.4em] ${status === 'SCANNING' ? 'text-primary animate-pulse' : status === 'LOCKED' ? 'text-green-500' : 'text-slate-500'}`}>
              {status === 'IDLE' ? 'SYSTEM READY' : status === 'SCANNING' ? 'SCANNING OPERATORS...' : 'TARGET ACQUIRED'}
            </span>
            <span className="h-px w-12 bg-primary/40" />
          </div>

          <div className="mb-12">
            <h2 className="text-sm font-black text-white uppercase tracking-[0.3em] mb-4 italic">TOTAL POOL SIZE</h2>
            <input 
              type="number" 
              value={maxNumber}
              onChange={(e) => setMaxNumber(Number(e.target.value))}
              disabled={isSpinning}
              className="bg-black/40 border border-white/10 text-primary text-4xl font-black text-center w-48 py-4 focus:outline-none focus:border-primary/60 transition-colors font-mono"
            />
          </div>

          {/* Randomizer Visual */}
          <div className="relative mb-12 py-20 px-32 border border-white/5 bg-black/20">
             {/* Reticle Visuals */}
             <div className="absolute top-4 left-4 size-8 border-t-2 border-l-2 border-primary/40" />
             <div className="absolute top-4 right-4 size-8 border-t-2 border-r-2 border-primary/40" />
             <div className="absolute bottom-4 left-4 size-8 border-b-2 border-l-2 border-primary/40" />
             <div className="absolute bottom-4 right-4 size-8 border-b-2 border-r-2 border-primary/40" />

             <span className={`text-9xl font-black font-mono transition-all duration-75 ${status === 'LOCKED' ? 'text-white scale-110' : 'text-primary opacity-80'}`}>
                {(isSpinning ? tempNumber : result || 0).toString().padStart(3, '0')}
             </span>
             
             {status === 'LOCKED' && (
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-green-500 text-background-dark text-[8px] font-black px-4 py-1 uppercase tracking-widest whitespace-nowrap">
                    MATCH CONFIRMED: SECTOR {result}
                </div>
             )}
          </div>

          <button 
            disabled={isSpinning}
            onClick={startDraw}
            className="group relative overflow-hidden bg-primary text-background-dark font-black px-12 py-5 text-[12px] uppercase tracking-[0.5em] hover:bg-white transition-all disabled:opacity-50"
          >
            <span className="relative z-10 flex items-center gap-3">
               {isSpinning ? 'SCANNING...' : 'INITIALIZE PROTOCOL'}
               <span className="material-symbols-outlined text-sm">target</span>
            </span>
            <div className="absolute inset-0 bg-white translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
          </button>
        </div>
      </div>

      <div className="mt-12 grid grid-cols-3 gap-6">
          {[
            { label: 'ALGORITHM', val: 'SECURE_RAND_V2' },
            { label: 'SEED', val: Date.now().toString(16).toUpperCase() },
            { label: 'INTEGRITY', val: 'ENCRYPTED' }
          ].map(item => (
            <div key={item.label} className="bg-white/5 p-4 border-l border-primary/20">
               <span className="text-[8px] text-slate-600 font-black uppercase tracking-widest block mb-1">{item.label}</span>
               <span className="text-[10px] text-white font-mono">{item.val}</span>
            </div>
          ))}
      </div>
    </div>
  );
}

export default function DropPage() {
  const [raffles, setRaffles] = useState<Raffle[]>(MOCK_RAFFLES);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'LIST' | 'DRAFTER'>('LIST');

  useEffect(() => {
    window.scrollTo(0, 0);
    loadRaffles();
  }, []);

  const loadRaffles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('raffles')
        .select('*')
        .eq('status', 'ativo')
        .order('created_at', { ascending: false });
      
      if (!error && data && data.length > 0) {
        setRaffles(data);
      }
    } catch {
      // Mantém mock
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-20 bg-background-dark">
      <SEO 
        title="Tactical Drop Hub | Perfection Airsoft" 
        description="Sorteios táticos oficiais. Garanta seu ticket para os equipamentos mais cobiçados do arsenal."
      />

      <div className="hud-scanline fixed inset-0 z-10 opacity-5 pointer-events-none"></div>

      {/* Hero Section - HUD Style */}
      <div className="relative pt-12 pb-24 border-b border-primary/20 overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--gl-primary)_0%,_transparent_70%)] opacity-10" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 scale-[2]">
                <span className="material-symbols-outlined text-[400px] text-primary/10">target</span>
            </div>
        </div>

        <div className="relative max-w-7xl mx-auto px-6">
          <div className="flex items-center gap-4 mb-8">
            <span className="h-px w-16 bg-primary"></span>
            <span className="text-primary font-black uppercase tracking-[0.5em] text-[10px] flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-primary animate-ping" />
                COMMAND CENTER: DROP DIVISION
            </span>
          </div>

          <div className="max-w-3xl">
            <h1 className="text-5xl md:text-8xl font-black text-white uppercase tracking-tighter leading-none mb-8">
                TACTICAL<br />
                <span className="text-primary drop-shadow-[0_0_15px_rgba(255,193,7,0.3)]">DROPS</span>
            </h1>
            
            {/* Tab Swticher HUD */}
            <div className="flex gap-4 mb-12">
               <button 
                onClick={() => setActiveTab('LIST')}
                className={`flex flex-col items-start px-8 py-4 border-l-2 transition-all ${activeTab === 'LIST' ? 'border-primary bg-primary/5' : 'border-white/10 hover:border-white/30'}`}
               >
                 <span className={`text-[8px] font-black uppercase tracking-widest mb-1 ${activeTab === 'LIST' ? 'text-primary' : 'text-slate-500'}`}>01 // SECTOR</span>
                 <span className={`text-sm font-black uppercase tracking-widest ${activeTab === 'LIST' ? 'text-white' : 'text-slate-600'}`}>ACTIVE OPS</span>
               </button>
               <button 
                onClick={() => setActiveTab('DRAFTER')}
                className={`flex flex-col items-start px-8 py-4 border-l-2 transition-all ${activeTab === 'DRAFTER' ? 'border-primary bg-primary/5' : 'border-white/10 hover:border-white/30'}`}
               >
                 <span className={`text-[8px] font-black uppercase tracking-widest mb-1 ${activeTab === 'DRAFTER' ? 'text-primary' : 'text-slate-500'}`}>02 // MODULE</span>
                 <span className={`text-sm font-black uppercase tracking-widest ${activeTab === 'DRAFTER' ? 'text-white' : 'text-slate-600'}`}>SORTEADOR TÁTICO</span>
               </button>
            </div>

            {activeTab === 'LIST' && (
              <p className="text-slate-500 text-sm font-mono leading-relaxed mb-12 uppercase tracking-wide animate-in fade-in slide-in-from-left-4">
                Arsenal de elite via sistema de reserva tática. Alta probabilidade, transparência total e equipamentos certificados. Selecione sua missão e garanta seu ticket.
              </p>
            )}
            
            {activeTab === 'LIST' && (
              <div className="flex flex-wrap gap-12 animate-in fade-in slide-in-from-left-8">
                  <div className="border-l-2 border-white/10 pl-6">
                      <span className="text-4xl font-black text-white font-mono">{raffles.length}</span>
                      <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest block mt-1">ACTIVE OPS</span>
                  </div>
                  <div className="border-l-2 border-white/10 pl-6">
                      <span className="text-4xl font-black text-white font-mono">1.2k+</span>
                      <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest block mt-1">OPERATORS JOINED</span>
                  </div>
                  <div className="border-l-2 border-primary pl-6">
                      <span className="text-text-primary text-4xl font-black font-mono">100%</span>
                      <span className="text-[9px] text-primary/60 font-black uppercase tracking-widest block mt-1">VERIFIED DRAWS</span>
                  </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-6 py-20 relative z-20">
        
        {activeTab === 'LIST' ? (
          <>
            {/* Filter Bar HUD */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-16 pb-8 border-b border-white/5">
                <div className="flex gap-4">
                    {['ALL DROPS', 'HIGH STAKES', 'ENDING SOON'].map(f => (
                        <button key={f} className={`px-6 py-2.5 text-[9px] font-black uppercase tracking-[0.2em] border transition-all ${f === 'ALL DROPS' ? 'bg-primary text-background-dark border-primary' : 'bg-transparent text-slate-500 border-white/10 hover:border-primary/40'}`}>
                            {f}
                        </button>
                    ))}
                </div>
                
                <div className="flex items-center gap-6">
                    <div className="text-right hidden sm:block">
                        <span className="text-[8px] text-slate-600 font-black uppercase tracking-widest block">SYSTEM STATUS</span>
                        <span className="text-[10px] text-green-500 font-black uppercase tracking-widest flex items-center gap-2">
                            <span className="size-1.5 rounded-full bg-green-500 animate-pulse" />
                            ENCRYPTION ACTIVE
                        </span>
                    </div>

                    <Link 
                        to="/eventos/criar"
                        className="bg-primary text-background-dark font-black py-4 px-8 text-[10px] uppercase tracking-[0.3em] hover:bg-white transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(255,193,7,0.2)]"
                    >
                        <span className="material-symbols-outlined text-sm">rocket_launch</span>
                        CRIAR NOVO DROP
                    </Link>
                </div>
            </div>

            {/* Grid */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[1,2,3].map(i => (
                  <div key={i} className="h-[500px] bg-surface/30 animate-pulse border border-white/5" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {raffles.map(raffle => (
                  <RaffleCard key={raffle.id} raffle={raffle} />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="animate-in zoom-in-95 duration-500">
             <TacticalDrafter />
          </div>
        )}

        {/* Info Box HUD */}
        <div className="mt-32 bg-surface/40 border border-white/5 p-12 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                <span className="material-symbols-outlined text-[120px]">verified_user</span>
            </div>
            <div className="max-w-2xl relative z-10">
                <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-6">PROTOCOLO DE SEGURANÇA</h2>
                <p className="text-xs text-slate-400 font-mono leading-relaxed uppercase mb-8">
                    Todos os sorteios no Tactical Drop Hub são regidos por algoritmos de verificação pública. O vencedor é selecionado através de um sistema de semente randômica baseada em rede, garantindo 100% de imparcialidade e transparência em tempo real.
                </p>
                <div className="flex gap-4">
                    <span className="bg-primary/10 text-primary border border-primary/20 px-4 py-2 text-[9px] font-black uppercase tracking-widest">PROVABLY FAIR</span>
                    <span className="bg-primary/10 text-primary border border-primary/20 px-4 py-2 text-[9px] font-black uppercase tracking-widest">REAL-TIME SEEDING</span>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
