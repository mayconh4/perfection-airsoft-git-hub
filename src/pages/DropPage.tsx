import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { SEO } from '../components/SEO';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Pencil, MessageCircle, User as UserIcon, Calendar, Trash2, ChevronDown, ChevronUp, BarChart3 } from 'lucide-react';

interface Raffle {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  images: string[] | null;
  ticket_price: number;
  total_tickets: number;
  sold_tickets: number;
  status: 'ativo' | 'finalizado' | 'cancelado';
  draw_date: string;
  created_at: string;
  creator_id: string;
  slug?: string;
  winner_number?: number | null;
  drawn_at?: string | null;
  draw_confirmed?: boolean;
  profiles?: {
    full_name: string | null;
    phone: string | null;
    email?: string | null;
  };
}

const MOCK_RAFFLES: Raffle[] = [
  {
    id: '1',
    title: 'Rifle M4A1 CQBR GBB',
    description: 'Rifle de alta performance com sistema Gas Blowback. Kit completo com 3 magazines extras.',
    image_url: null,
    images: [],
    ticket_price: 25,
    total_tickets: 500,
    sold_tickets: 342,
    status: 'ativo',
    draw_date: '2026-04-15T20:00:00',
    created_at: new Date().toISOString(),
    creator_id: 'mock-admin'
  }
];

function DrawWarningModal({ onConfirm }: { onConfirm: () => void }) {
  useEffect(() => {
    // Tenta reproduzir o som Tactical Nuke
    const audio = new Audio('/sounds/tactical-nuke.mp3');
    audio.play().catch(e => {
        console.warn("Nuke sound not found, trying alternative...", e);
        const fallback = new Audio('/sounds/level1.wav');
        fallback.play().catch(() => {});
    });
  }, []);

  const handleConfirm = () => {
    const audio = new Audio('/sounds/uav.mp3');
    audio.play().catch(e => console.warn("UAV sound failed:", e));
    onConfirm();
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="max-w-md w-full bg-surface border-2 border-primary/50 shadow-[0_0_80px_rgba(var(--primary-rgb),0.3)] p-6 md:p-8 relative overflow-hidden">
        {/* Decorative corner accents */}
        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-primary"></div>
        <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-primary"></div>
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-primary"></div>
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-primary"></div>
        
        <div className="text-center space-y-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 border-2 border-primary animate-pulse mb-2">
            <span className="material-symbols-outlined text-primary text-4xl">warning</span>
          </div>
          
          <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-tighter italic leading-tight">
            ALERTA DE EXTRAÇÃO <br /><span className="text-primary italic">DEFINITIVA</span>
          </h2>
          
          <div className="space-y-4">
            <p className="text-xs md:text-sm text-slate-300 font-medium leading-relaxed">
              Este prêmio permite apenas **um sorteio**. Apenas a conta criadora do drop pode realizar a extração, e essa ação será **definitiva** e válida para o resultado.
            </p>
            
            <div className="text-xs md:text-sm text-slate-300 font-medium leading-relaxed">
              Ao prosseguir, você concorda com esses termos.
              <br />
              <div className="text-primary font-black uppercase mt-3 block border-2 border-primary/20 p-3 bg-primary/5 text-[10px] md:text-xs">
                RECOMENDAMOS GRAVAR A TELA PARA GARANTIR TRANSPARÊNCIA.
              </div>
            </div>
          </div>
          
          <button 
            onClick={handleConfirm}
            className="w-full bg-primary text-background-dark font-black py-5 text-[11px] uppercase tracking-widest hover:bg-white transition-all shadow-lg active:scale-95"
          >
            CONFIRMAR E PROSSEGUIR
          </button>
        </div>
      </div>
    </div>
  );
}

function RaffleCard({ raffle, onDelete, onDraw }: { raffle: Raffle; onDelete?: (id: string) => void; onDraw?: (id: string) => void }) {
  const { user, isAdmin } = useAuth();
  const [showIntel, setShowIntel] = useState(false);
  const percentSold = (raffle.sold_tickets / raffle.total_tickets) * 100;
  const createdAt = new Date(raffle.created_at).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });

  // CARROSSEL TÁTICO: CICLO DE 5 SEGUNDOS
  const allImages = [raffle.image_url, ...(raffle.images || [])].filter(Boolean) as string[];
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    if (allImages.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % allImages.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [allImages.length]);

  const whatsappLink = raffle.profiles?.phone 
    ? `https://wa.me/${raffle.profiles.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${raffle.profiles.full_name}, sou da administração do Perfection Airsoft sobre seu drop "${raffle.title}".`)}`
    : '#';

  const canEdit = user?.id === raffle.creator_id || isAdmin;

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
              to={`/drop/editar/${raffle.id}`}
              className="flex-1 bg-white/5 border border-white/10 text-white hover:bg-white hover:text-black py-2 rounded flex items-center justify-center gap-2 text-[9px] font-black uppercase transition-all"
            >
              <Pencil size={12} />
              Editar
            </Link>
            <button 
              onClick={() => setShowIntel(!showIntel)}
              className={`flex-1 border py-2 rounded flex items-center justify-center gap-2 text-[9px] font-black uppercase transition-all ${showIntel ? 'bg-primary text-black border-primary' : 'bg-primary/10 border-primary/20 text-primary hover:bg-primary/20'}`}
            >
              <BarChart3 size={12} />
              {showIntel ? 'Ocultar Intel' : 'Intel'}
              {showIntel ? <ChevronUp size={10} /> : <ChevronDown size={10} /> }
            </button>
            <a 
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-green-500/20 border border-green-500/30 text-green-500 hover:bg-green-500 hover:text-black py-2 px-3 rounded flex items-center justify-center gap-2 text-[9px] font-black uppercase transition-all"
            >
              <MessageCircle size={12} />
              Contato
            </a>
            {isAdmin && (
              <button 
                onClick={() => onDelete?.(raffle.id)}
                className="bg-red-500/20 border border-red-500/30 text-red-500 hover:bg-red-500 hover:text-black py-2 px-3 rounded transition-all"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
          
          {showIntel && (
            <div className="mt-3 p-3 bg-black/40 border border-white/5 space-y-3 animate-in fade-in zoom-in-95 duration-300">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <span className="text-[7px] text-slate-500 uppercase font-black tracking-widest block">TELEFONE OP</span>
                        <span className="text-[9px] text-white font-mono">{raffle.profiles?.phone || 'NÃO INFORMADO'}</span>
                    </div>
                    <div className="space-y-1 text-right">
                        <span className="text-[7px] text-slate-500 uppercase font-black tracking-widest block">DATA CADASTRO</span>
                        <span className="text-[9px] text-white font-mono">{createdAt}</span>
                    </div>
                </div>
                <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-3">
                    <div className="flex flex-col text-[8px] text-white/60">
                        <span>E-MAIL: {raffle.profiles?.email || 'NÃO INFORMADO'}</span>
                        <span className="mt-1">ID CRIPTOGRAFADO: {raffle.creator_id.substring(0, 8)}...</span>
                    </div>
                </div>
            </div>
          )}
        </div>
      )}

      {/* CARROSSEL HUD DE IMAGENS */}
      <div className="relative h-52 bg-gradient-to-br from-surface to-black flex items-center justify-center overflow-hidden">
        {allImages.length > 0 ? (
          <>
            {allImages.map((img, idx) => (
              <img 
                key={img}
                src={img} 
                alt={`${raffle.title} - ${idx}`} 
                className={`absolute inset-0 w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-1000 ${idx === currentImageIndex ? 'opacity-100 scale-100' : 'opacity-0 scale-110'}`} 
              />
            ))}
            {allImages.length > 1 && (
              <div className="absolute top-4 right-4 flex gap-1 z-10">
                {allImages.map((_, idx) => (
                  <div 
                    key={idx}
                    className={`h-0.5 transition-all duration-500 ${idx === currentImageIndex ? 'w-4 bg-primary' : 'w-1 bg-white/20'}`}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="opacity-20 group-hover:opacity-40 transition-opacity flex flex-col items-center gap-2">
            <span className="material-symbols-outlined text-5xl">inventory_2</span>
            <span className="text-[10px] font-black uppercase tracking-widest">Visual Intel Out</span>
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background-dark/90 to-transparent z-10">
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
        <div className="flex flex-col gap-2">
          <Link 
            to={`/drop/${raffle.slug || raffle.id}`}
            className="w-full bg-primary text-background-dark font-black py-4 text-[10px] uppercase tracking-[0.3em] hover:bg-white transition-all text-center block"
          >
            SELECIONAR TICKETS
          </Link>
          
          {canEdit && (
            <div className="grid grid-cols-2 gap-2 mt-1">
              <Link 
                to={`/drop/editar/${raffle.id}`}
                className="w-full bg-white/5 border border-white/10 text-white font-black py-4 text-[10px] uppercase tracking-widest hover:bg-white hover:text-black transition-all text-center block"
              >
                EDITAR
              </Link>
              <button 
                onClick={() => onDraw?.(raffle.id)}
                className="w-full bg-primary/10 border border-primary/20 text-primary font-black py-4 text-[10px] uppercase tracking-widest hover:bg-primary hover:text-black transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">casino</span>
                SORTEADOR
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TacticalDrafter({ forcedRaffleId, onRaffleSelect }: { forcedRaffleId?: string; onRaffleSelect?: (id: string) => void }) {
  const { user, isAdmin } = useAuth();
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [selectedRaffleId, setSelectedRaffleId] = useState<string>(forcedRaffleId || "");
  const [maxNumber, setMaxNumber] = useState<number>(100);
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [winnerInfo, setWinnerInfo] = useState<{ name: string, phone?: string } | null>(null);
  const [showWarning, setShowWarning] = useState(true);
  const [isFinalized, setIsFinalized] = useState(false);

  // Audio Context for synthesized sounds
  const audioCtx = useRef<AudioContext | null>(null);
  const winAudio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (forcedRaffleId) {
        setSelectedRaffleId(forcedRaffleId);
        setShowWarning(true);
    }
  }, [forcedRaffleId]);

  useEffect(() => {
    const fetchRaffles = async () => {
      const { data } = await supabase
        .from('raffles')
        .select('*')
        .order('created_at', { ascending: false });
      if (data) setRaffles(data as any);
    };
    fetchRaffles();

    winAudio.current = new Audio('/sounds/win.wav');
    winAudio.current.load();
  }, []);

  useEffect(() => {
    const selected = raffles.find(r => r.id === selectedRaffleId);
    if (selected) {
      setMaxNumber(selected.total_tickets);
      if (selected.winner_number) {
          setResult(selected.winner_number);
          setIsFinalized(true);
          identifyWinner(selected.winner_number);
      } else {
          setResult(null);
          setIsFinalized(false);
          setWinnerInfo(null);
      }
    }
  }, [selectedRaffleId, raffles]);

  const handleSelectChange = (id: string) => {
    setSelectedRaffleId(id);
    setShowWarning(true);
    if (onRaffleSelect) onRaffleSelect(id);
  };

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
        .select('full_name, phone')
        .eq('id', ticketData.user_id)
        .single();
      if (userData) setWinnerInfo({ 
          name: userData.full_name || "Operador Anônimo",
          phone: userData.phone 
      });
    } else {
      setWinnerInfo({ name: "NÚMERO NÃO VENDIDO", phone: undefined });
    }
  };

  const saveWinnerToDB = async (num: number) => {
    try {
        const { error } = await supabase
            .from('raffles')
            .update({
                winner_number: num,
                drawn_at: new Date().toISOString(),
                status: 'finalizado'
            })
            .eq('id', selectedRaffleId);
        if (error) throw error;
        setIsFinalized(true);
    } catch (err) {
        console.error("Erro ao persistir resultado:", err);
    }
  };

  const startDraw = () => {
    if (maxNumber < 1) return;
    
    const currentRaffle = raffles.find(r => r.id === selectedRaffleId);
    if (!currentRaffle || (currentRaffle.creator_id !== user?.id && !isAdmin)) {
        alert("Acesso Negado: Apenas o criador do drop pode realizar a extração.");
        return;
    }

    if (isFinalized || currentRaffle.winner_number) {
        alert("Sorteio Bloqueado: Este drop já possui uma extração oficial registrada.");
        return;
    }

    if (audioCtx.current && audioCtx.current.state === 'suspended') audioCtx.current.resume();
    setIsSpinning(true);
    setResult(null);
    setActiveIndex(null);
    setWinnerInfo(null);

    const winner = Math.floor(Math.random() * maxNumber) + 1;
    let currentTicks = 0;
    const totalTicks = 80 + Math.floor(Math.random() * 30); 
    let currentPos = 1;

    const performTick = () => {
      currentTicks++;
      currentPos = Math.floor(Math.random() * maxNumber) + 1;
      setActiveIndex(currentPos);
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
        saveWinnerToDB(winner);

        if (winAudio.current) {
          winAudio.current.currentTime = 0;
          winAudio.current.play().catch(e => {
            console.error("Winner sound blocked:", e);
          });
        }
      }
    };
    performTick();
  };

  const selectedRaffle = raffles.find(r => r.id === selectedRaffleId);
  const isOwner = selectedRaffle?.creator_id === user?.id || isAdmin;

  // Filtragem tática de missões: Se houver um ID forçado, exibe apenas ele
  const visibleRaffles = forcedRaffleId 
    ? raffles.filter(r => r.id === forcedRaffleId) 
    : raffles;

  const handleContactWinner = () => {
    if (winnerInfo?.phone) {
        const cleanPhone = winnerInfo.phone.replace(/\D/g, '');
        window.open(`https://wa.me/${cleanPhone}`, '_blank');
    } else {
        alert("Dados de contato não disponíveis para este vencedor.");
    }
  };

  return (
    <>
      {showWarning && selectedRaffleId && !isFinalized && <DrawWarningModal onConfirm={() => setShowWarning(false)} />}
      
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
                      onChange={(e) => handleSelectChange(e.target.value)}
                      disabled={!!forcedRaffleId}
                      className="bg-transparent text-primary text-[8px] font-black uppercase outline-none border-none cursor-pointer disabled:cursor-default"
                  >
                      {!forcedRaffleId && <option value="" className="bg-background-dark">--- MODO MANUAL ---</option>}
                      {visibleRaffles.map(r => (
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="md:col-span-2 h-20 bg-black/80 border border-white/10 relative overflow-hidden group shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] flex items-center justify-between px-6">
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
                  <div className="flex flex-col items-end animate-in fade-in slide-in-from-right-4 duration-500 relative z-10 text-right">
                      <span className="text-[7px] font-black text-green-500 uppercase tracking-widest leading-none">Alvo Identificado</span>
                      <span className="text-sm font-black text-white uppercase mt-1.5 border-b border-green-500/50 pb-0.5">{winnerInfo.name}</span>
                      {winnerInfo.phone && (
                          <span className="text-[8px] font-bold text-white/40 mt-1 italic">TEL: {winnerInfo.phone}</span>
                      )}
                      
                      {isFinalized && winnerInfo.phone && (
                          <button 
                              onClick={handleContactWinner}
                              className="mt-3 flex items-center gap-2 bg-green-500 text-black px-3 py-1.5 rounded-sm text-[8px] font-black uppercase tracking-widest hover:bg-white transition-all shadow-[0_0_15px_rgba(34,197,94,0.4)]"
                          >
                              <span className="material-symbols-outlined text-[10px]">chat</span>
                              CONTATAR VENCEDOR
                          </button>
                      )}
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
                      className="bg-transparent text-primary font-black text-xl outline-none"
                  />
              </div>
              
              {isFinalized ? (
                <div className="flex-1 flex items-center justify-center bg-slate-800 border border-white/10 text-slate-500 font-black text-[9px] uppercase tracking-widest cursor-not-allowed">
                    <span className="material-symbols-outlined text-[12px] mr-2 opacity-50">lock</span>
                    EXTRAÇÃO ENCERRADA
                </div>
              ) : (
                <button 
                    onClick={startDraw}
                    disabled={isSpinning || !isOwner}
                    className={`flex-1 font-black text-[9px] uppercase tracking-[0.4em] transition-all relative overflow-hidden group/draw ${isSpinning || !isOwner ? 'bg-white/5 text-white/20' : 'bg-primary text-black hover:bg-green-500'}`}
                >
                    <span className="relative z-10">
                        {isSpinning ? 'BUSCANDO...' : !isOwner ? 'RESTRITO AO OP' : 'EXTRAIR'}
                    </span>
                </button>
              )}
          </div>
        </div>
        <div className="bg-black/20 border border-white/5 p-2 relative">
            <div className="grid grid-cols-10 sm:grid-cols-20 md:grid-cols-25 lg:grid-cols-34 gap-[2px] justify-items-center">
                {Array.from({ length: maxNumber }).map((_, i) => {
                    const num = i + 1;
                    const isActive = activeIndex === num;
                    const isWinner = !isSpinning && result === num;
                    return (
                        <div 
                            key={num}
                            className={`size-3 sm:size-4 flex items-center justify-center text-[5px] sm:text-[6px] font-mono transition-all duration-75
                                ${isActive ? 'bg-primary text-black scale-125 z-10' : 
                                  isWinner ? 'bg-green-500 text-black scale-125 z-10 shadow-[0_0_15px_rgba(34,197,94,0.6)]' :
                                  'text-white/10 hover:text-white/30'}
                            `}
                        >
                            {num}
                        </div>
                    );
                })}
            </div>
        </div>
      </div>
    </>
  );
}

export default function DropPage() {
  const { user, isAdmin } = useAuth();
  const [raffles, setRaffles] = useState<Raffle[]>(MOCK_RAFFLES);
  const [showDrafter, setShowDrafter] = useState(false);
  const [selectedRaffleId, setSelectedRaffleId] = useState<string>("");

  useEffect(() => {
    window.scrollTo(0, 0);
    loadRaffles();
  }, []);

  const loadRaffles = async () => {
    try {
      console.log('>>> HQ CONTROL INFILTRATION - USER EMAIL:', user?.email);
      const { data, error } = await supabase
        .from('raffles')
        .select('*, profiles(*)')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('>>> FALHA TÁTICA NO JOIN DE PERFIS:', error.message);
        const { data: simpleData, error: simpleError } = await supabase
          .from('raffles')
          .select('*')
          .order('created_at', { ascending: false });
        if (simpleError) throw simpleError;
        setRaffles(simpleData as any);
      } else {
        setRaffles(data as any);
      }
    } catch (err: any) {
      console.error('ERRO CRÍTICO HQ:', err.message);
    }
  };

  const handleDrawAccess = (id: string) => {
    setSelectedRaffleId(id);
    setShowDrafter(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('🚨 CONFIRMAÇÃO DE DESTRUIÇÃO 🚨\n\nEste drop será apagado permanentemente dos canais táticos. Confirmar operação?')) return;
    try {
      const { error } = await supabase.from('raffles').delete().eq('id', id);
      if (error) throw error;
      setRaffles(prev => prev.filter(r => r.id !== id));
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
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-20">
          <div>
            <h1 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tighter italic">
              TACTICAL <span className="text-primary italic">DROPS</span>
            </h1>
            <p className="text-[10px] text-slate-500 font-mono uppercase tracking-[0.3em] mt-2">Inventory Division // Active Operations</p>
          </div>
          <div className="flex flex-wrap gap-4">
            {(isAdmin || raffles.some(r => r.creator_id === user?.id)) && (
              <button 
                onClick={() => {
                   setShowDrafter(!showDrafter);
                   if (!showDrafter) setSelectedRaffleId("");
                }}
                className="bg-white/5 border border-white/10 text-white font-black py-4 px-8 text-[10px] uppercase tracking-widest hover:bg-white hover:text-black transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">{showDrafter ? 'inventory_2' : 'casino'}</span>
                {showDrafter ? 'Ver Drops Ativos' : 'Abrir Sorteador'}
              </button>
            )}
            <Link 
              to="/drop/criar"
              className="bg-primary text-background-dark font-black py-4 px-8 text-[10px] uppercase tracking-widest hover:bg-white transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">rocket_launch</span>
              Criar Novo Drop
            </Link>
          </div>
        </div>
        <div className="animate-in fade-in duration-700">
          {showDrafter ? (
            <TacticalDrafter 
              forcedRaffleId={selectedRaffleId} 
              onRaffleSelect={(id) => setSelectedRaffleId(id)} 
            />
          ) : (
            <>
              <div className="flex items-center gap-4 mb-8">
                <span className="h-px w-8 bg-primary"></span>
                <h2 className="text-sm font-black text-white uppercase tracking-[0.3em] italic">Active Drops</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {raffles.map(r => (
                  <RaffleCard 
                    key={r.id} 
                    raffle={r} 
                    onDelete={handleDelete} 
                    onDraw={handleDrawAccess}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
