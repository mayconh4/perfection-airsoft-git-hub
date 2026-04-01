import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { SEO } from '../components/SEO';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Pencil, MessageCircle, User as UserIcon, Calendar, Trash2 } from 'lucide-react';

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
  created_at: string;
  creator_id: string;
  slug?: string;
  profiles?: {
    full_name: string | null;
    phone: string | null;
  };
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
    created_at: new Date().toISOString(),
    creator_id: 'mock-admin'
  }
];

function RaffleCard({ raffle, onDelete }: { raffle: Raffle; onDelete?: (id: string) => void }) {
  const { isAdmin } = useAuth();
  const percentSold = (raffle.sold_tickets / raffle.total_tickets) * 100;
  const createdAt = new Date(raffle.created_at).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });

  const whatsappLink = raffle.profiles?.phone 
    ? `https://wa.me/${raffle.profiles.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${raffle.profiles.full_name}, sou da administração do Perfection Airsoft sobre seu drop "${raffle.title}".`)}`
    : '#';

  return (
    <div className="group relative bg-surface/20 border border-white/5 overflow-hidden transition-all duration-300 hover:border-primary/40 flex flex-col">
      <div className="h-1 w-full bg-primary/20 group-hover:bg-primary" />
      
      {/* ADMIN PANEL OVERLAY */}
      {isAdmin && (
        <div className="bg-primary/10 border-b border-primary/20 p-3 space-y-2 animate-in fade-in slide-in-from-top-2 duration-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[8px] font-black text-primary uppercase tracking-widest">
              <UserIcon size={10} />
              <span>OP: {raffle.profiles?.full_name || 'DESCONHECIDO'}</span>
            </div>
            <div className="flex items-center gap-2 text-[8px] font-bold text-white/40 uppercase font-mono">
              <Calendar size={10} />
              <span>{createdAt}</span>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Link 
              to={`/organizador?edit=${raffle.id}`}
              className="flex-1 bg-white/5 border border-white/10 text-white hover:bg-white hover:text-black py-2 rounded flex items-center justify-center gap-2 text-[9px] font-black uppercase transition-all"
            >
              <Pencil size={12} />
              Editar
            </Link>
            <a 
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-green-500/20 border border-green-500/30 text-green-500 hover:bg-green-500 hover:text-black py-2 rounded flex items-center justify-center gap-2 text-[9px] font-black uppercase transition-all"
            >
              <MessageCircle size={12} />
              Contato
            </a>
            <button 
              onClick={() => onDelete?.(raffle.id)}
              className="px-3 bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white rounded flex items-center justify-center transition-all"
              title="EXCLUIR DROP"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      )}

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
          to={`/drop/${raffle.slug || raffle.id}`}
          className="w-full bg-primary text-background-dark font-black py-4 text-[10px] uppercase tracking-[0.3em] hover:bg-white transition-all text-center block"
        >
          SELECIONAR TICKETS
        </Link>
      </div>
    </div>
  );
}

function TacticalDrafter() {
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [selectedRaffleId, setSelectedRaffleId] = useState<string>("");
  const [maxNumber, setMaxNumber] = useState<number>(100);
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [winnerInfo, setWinnerInfo] = useState<{ name: string } | null>(null);

  // Audio Context for synthesized sounds (Foolproof)
  const audioCtx = useRef<AudioContext | null>(null);
  const winAudio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Carregar Rifas Ativas
    const fetchRaffles = async () => {
      const { data } = await supabase
        .from('raffles')
        .select('*')
        .eq('status', 'ativo')
        .order('created_at', { ascending: false });
      if (data) setRaffles(data);
    };
    fetchRaffles();

    // Preload win audio (Local asset for 100% reliability)
    winAudio.current = new Audio('/sounds/win.wav');
    winAudio.current.load();
  }, []);

  // Sincroniza o número máximo com a rifa selecionada
  useEffect(() => {
    const selected = raffles.find(r => r.id === selectedRaffleId);
    if (selected) {
      setMaxNumber(selected.total_tickets);
    }
  }, [selectedRaffleId, raffles]);

  const playSynthesizedTick = () => {
    try {
      if (!audioCtx.current) {
        audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const ctx = audioCtx.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'square';
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.1);
      
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.1);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch (e) {
      console.warn("Audio synthesis failed:", e);
    }
  };

  const identifyWinner = async (num: number) => {
    if (!selectedRaffleId) return;
    
    // Busca o ticket e o perfil do usuário
    const { data: ticketData } = await supabase
      .from('raffle_tickets')
      .select('user_id')
      .eq('raffle_id', selectedRaffleId)
      .eq('ticket_number', num)
      .eq('payment_status', 'pago')
      .single();

    if (ticketData?.user_id) {
      const { data: userData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', ticketData.user_id)
        .single();
      
      if (userData) {
        setWinnerInfo({ name: userData.full_name || "Operador Anônimo" });
      }
    } else {
      setWinnerInfo({ name: "NÚMERO NÃO VENDIDO" });
    }
  };

  const startDraw = () => {
    if (maxNumber < 1) return;
    
    // Unlock Audio Context on first interaction
    if (audioCtx.current && audioCtx.current.state === 'suspended') {
      audioCtx.current.resume();
    }

    setIsSpinning(true);
    setResult(null);
    setActiveIndex(null);
    setWinnerInfo(null);

    const winner = Math.floor(Math.random() * maxNumber) + 1;
    let currentTicks = 0;
    const totalTicks = 40 + Math.floor(Math.random() * 15); 
    let currentPos = 1;

    const performTick = () => {
      currentTicks++;
      currentPos = Math.floor(Math.random() * maxNumber) + 1;
      setActiveIndex(currentPos);

      // Play synthesized tick
      playSynthesizedTick();

      if (currentTicks < totalTicks) {
        const progress = currentTicks / totalTicks;
        const delay = 40 + (Math.pow(progress, 3) * 600); 
        setTimeout(performTick, delay);
      } else {
        setActiveIndex(winner);
        setResult(winner);
        setIsSpinning(false);
        identifyWinner(winner);

        // Win Audio
        if (winAudio.current) {
          winAudio.current.currentTime = 0;
          winAudio.current.play().catch(e => {
            console.error("Winner sound blocked:", e);
            // Fallback: Synth bip longo
            const ctx = audioCtx.current;
            if (ctx) {
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.frequency.setValueAtTime(880, ctx.currentTime);
              gain.gain.setValueAtTime(0.1, ctx.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
              osc.start();
              osc.stop(ctx.currentTime + 0.5);
            }
          });
        }
      }
    };

    performTick();
  };

  return (
    <div className="bg-surface/5 border border-white/5 p-4 sm:p-6 text-center max-w-4xl mx-auto relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent"></div>
      
      <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
          <div className="flex flex-col items-start">
            <h2 className="text-[7px] font-black text-slate-500 uppercase tracking-[0.4em] flex items-center gap-3">
                <span className="h-px w-4 bg-primary/20"></span>
                SORTEADOR TÁTICO V3.5 // IDENTITY CORE
            </h2>
            <div className="flex items-center gap-2 mt-2 bg-black/40 border border-white/5 p-1 px-2">
                <span className="text-[6px] text-white/30 font-black uppercase">Missão:</span>
                <select 
                    value={selectedRaffleId}
                    onChange={(e) => setSelectedRaffleId(e.target.value)}
                    className="bg-transparent text-primary text-[8px] font-black uppercase outline-none border-none cursor-pointer"
                >
                    <option value="" className="bg-background-dark">--- MODO MANUAL ---</option>
                    {raffles.map(r => (
                        <option key={r.id} value={r.id} className="bg-background-dark">{r.title}</option>
                    ))}
                </select>
            </div>
          </div>
          <div className="flex items-center gap-6 text-[6px] font-bold text-white/10 tracking-[0.5em] uppercase sm:visible">
                <span>V: OK</span>
                <span>S: 100%</span>
                <span>B: STABLE</span>
          </div>
      </div>

      {/* Main HUD: Ultra Compact & Integrated */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="md:col-span-2 h-20 bg-black/80 border border-white/10 relative overflow-hidden group shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] flex items-center justify-between px-6">
            {/* Background HUD Decor */}
            <div className="absolute inset-0 opacity-10 pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:10px_10px]"></div>
            </div>

            <div className="flex flex-col items-start relative z-10">
                <div className="text-[5px] font-black text-white/20 uppercase tracking-[0.4em] mb-1">Output Stream</div>
                <span className={`text-4xl sm:text-5xl font-black font-mono tracking-tighter transition-all duration-75 ${isSpinning ? 'text-primary scale-105 blur-[1px]' : result ? 'text-green-500 drop-shadow-[0_0_15px_rgba(34,197,94,0.3)]' : 'text-white/5'}`}>
                    {(activeIndex || result || 0).toString().padStart(3, '0')}
                </span>
            </div>

            {winnerInfo && (
                <div className="flex flex-col items-end animate-in fade-in slide-in-from-right-4 duration-500 relative z-10">
                    <span className="text-[7px] font-black text-green-500 uppercase tracking-widest leading-none">Alvo Identificado</span>
                    <span className="text-sm font-black text-white uppercase mt-1.5 border-b border-green-500/50 pb-0.5">{winnerInfo.name}</span>
                    <span className="text-[5px] font-bold text-white/20 uppercase mt-1 italic tracking-widest">Active Operator</span>
                </div>
            )}

            {!winnerInfo && !isSpinning && !result && (
                <div className="flex flex-col items-end opacity-20">
                    <span className="text-[6px] font-black text-white uppercase tracking-widest">Waiting Intel</span>
                    <div className="flex gap-1 mt-1">
                        {[1,2,3].map(i => <div key={i} className="w-1 h-1 bg-white/40 rounded-full animate-pulse" style={{ animationDelay: `${i*0.2}s` }}></div>)}
                    </div>
                </div>
            )}
        </div>

        <div className="flex flex-col gap-2 h-20">
            <div className="flex-1 bg-black/40 border border-white/5 p-2 flex flex-col justify-center text-left relative overflow-hidden">
                <span className="text-[5px] font-black text-white/30 uppercase tracking-widest mb-0.5">Alcance</span>
                <input 
                    type="number" 
                    value={maxNumber}
                    onChange={(e) => setMaxNumber(Math.min(1000, Math.max(1, Number(e.target.value))))}
                    disabled={isSpinning || !!selectedRaffleId}
                    className="bg-transparent text-primary font-black text-xl outline-none transition-all disabled:opacity-30 w-full leading-none"
                />
                {selectedRaffleId && <div className="absolute top-1 right-2 text-[5px] text-primary/30 font-bold tracking-widest animate-pulse">AUTO</div>}
            </div>
            <button 
                onClick={startDraw}
                disabled={isSpinning}
                className={`flex-1 font-black text-[9px] uppercase tracking-[0.4em] transition-all relative overflow-hidden group/draw ${isSpinning ? 'bg-white/5 text-white/20' : 'bg-primary text-black hover:bg-green-500 shadow-[0_0_15px_rgba(255,193,7,0.15)]'}`}
            >
                <span className="relative z-10">{isSpinning ? 'BUSCANDO...' : 'EXTRAIR'}</span>
                {!isSpinning && <div className="absolute inset-0 bg-white translate-x-full group-hover:translate-x-0 transition-transform duration-500"></div>}
            </button>
        </div>
      </div>

      {/* Matrix Grid: No scroll, dense, beautiful */}
      <div className="bg-black/20 border border-white/5 p-2 relative">
          <div className="grid grid-cols-10 sm:grid-cols-20 md:grid-cols-25 lg:grid-cols-34 gap-[2px] justify-items-center">
              {Array.from({ length: maxNumber }).map((_, i) => {
                  const num = i + 1;
                  const isActive = activeIndex === num;
                  const isWinner = !isSpinning && result === num;
                  
                  return (
                      <div 
                          key={num}
                          className={`size-3 sm:size-4 flex items-center justify-center text-[5px] sm:text-[6px] font-mono leading-none transition-all duration-75
                              ${isActive ? 'bg-primary text-black scale-125 z-10 shadow-[0_0_12px_rgba(255,193,7,0.8)] font-black text-[7px] sm:text-[9px]' : 
                                isWinner ? 'bg-green-500 text-black scale-125 z-10 shadow-[0_0_15px_rgba(34,197,94,0.6)] font-black text-[7px] sm:text-[9px]' :
                                'text-white/10 hover:text-white/30'}
                          `}
                      >
                          {num}
                      </div>
                  );
              })}
          </div>

          {!isSpinning && !result && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-[7px] font-black text-white/5 uppercase tracking-[1em] italic">System Ready // Waiting Input</span>
              </div>
          )}
      </div>

      {/* Footer Hud */}
      <div className="mt-4 flex justify-between items-center text-[5px] font-black uppercase tracking-[0.3em] text-white/10 px-2 italic">
          <div className="flex items-center gap-2">
            <span className="size-1 bg-primary/20 rounded-full"></span>
            Data Block Loaded
          <span>Ref: PERF-AI-01-2026</span>
        </div>
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
      .select('*, profiles(full_name, phone)')
      .eq('status', 'ativo')
      .order('created_at', { ascending: false });
    
    if (data) setRaffles(data as any);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('🚨 CONFIRMAÇÃO DE DESTRUIÇÃO 🚨\n\nEste drop será apagado permanentemente dos canais táticos. Confirmar operação?')) return;

    try {
      const { error } = await supabase
        .from('raffles')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      // Atualização otimista
      setRaffles(prev => prev.filter(r => r.id !== id));
      console.log(`[HQ-OVERRIDE] Drop ${id} excluído com sucesso.`);
    } catch (err: any) {
      console.error('Falha ao excluir drop:', err.message);
      alert('Erro ao excluir drop: ' + err.message);
    }
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
                  <RaffleCard key={r.id} raffle={r} onDelete={handleDelete} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
