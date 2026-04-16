import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { SEO } from '../components/SEO';
import { supabase } from '../lib/supabase';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { BarChart3, ChevronDown, ChevronUp, Users, ShieldCheck, Sword } from 'lucide-react';
import { RaffleGrid } from '../components/RaffleGrid';

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
  rules?: string;
  images: string[];
  logistics_description?: string;
  slug?: string;
}

export default function RaffleDetailPage() {
  const { idOrSlug } = useParams();
  const { addItem, setIsCartOpen } = useCart();
  const [raffle, setRaffle] = useState<Raffle | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTickets, setSelectedTickets] = useState<number[]>([]);
  const [soldTicketNumbers, setSoldTicketNumbers] = useState<number[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Intel Tática
  const { isAdmin } = useAuth();
  const [showIntel, setShowIntel] = useState(false);
  const [participants, setParticipants] = useState<any[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);

  const allImages = raffle ? [raffle.image_url, ...(raffle.images || [])].filter(Boolean) as string[] : [];
  
  // Auto-carrossel de 3 segundos
  useEffect(() => {
    if (allImages.length <= 1) return;

    const interval = setInterval(() => {
      setActiveImageIndex((prev) => (prev + 1) % allImages.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [allImages.length]);

  useEffect(() => {
    if (showIntel) {
      loadParticipants();
    }
  }, [showIntel]);

  const loadParticipants = async () => {
    if (!raffle?.id) return;
    setLoadingParticipants(true);
    try {
      const { data, error } = await supabase
        .from('raffle_tickets')
        .select(`
          ticket_number,
          payment_status,
          user_id,
          payment_id,
          created_at,
          profiles:user_id (full_name, phone),
          orders:payment_id (customer_data)
        `)
        .eq('raffle_id', raffle.id)
        .order('ticket_number', { ascending: true });

      if (error) throw error;
      setParticipants(data || []);
    } catch (err) {
      console.error('Erro ao carregar participantes:', err);
    } finally {
      setLoadingParticipants(false);
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    
    const loadData = async () => {
      const loadedRaffle = await loadRaffle();
      if (loadedRaffle) {
        // real-time subscription para novos tickets vendidos
        const channel = supabase
          .channel(`raffle-tickets-${loadedRaffle.id}`)
          .on(
            'postgres_changes',
            { 
              event: '*', 
              schema: 'public', 
              table: 'raffle_tickets',
              filter: `raffle_id=eq.${loadedRaffle.id}`
            },
            (payload) => {
              console.log('[REALTIME] Update nos tickets:', payload);
              if (payload.new) {
                const ticket = payload.new as any;
                const isPaid = ticket.payment_status === 'pago';
                const isRecentPending = ticket.payment_status === 'pendente' && 
                  (new Date().getTime() - new Date(ticket.created_at).getTime() < 5 * 60 * 1000);

                if (isPaid || isRecentPending) {
                  setSoldTicketNumbers(prev => [...new Set([...prev, ticket.ticket_number])]);
                  if (isPaid) {
                    setRaffle(prev => prev ? {
                      ...prev,
                      sold_tickets: (prev.sold_tickets || 0) + 1
                    } : null);
                  }
                }
              }
            }
          )
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
      }
    };

    loadData();
  }, [idOrSlug]);

  const loadRaffle = async () => {
    setLoading(true);
    try {
      // Tentar buscar por ID (UUID) ou por Slug
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug || "");
      
      let query = supabase.from('raffles').select('*');
      
      if (isUUID) {
        query = query.eq('id', idOrSlug);
      } else {
        query = query.eq('slug', idOrSlug);
      }

      const { data, error } = await query.single();

      if (!error && data) {
        setRaffle(data);

        // Carregar tickets já vendidos/reservados
        const { data: tickets } = await supabase
          .from('raffle_tickets')
          .select('ticket_number, payment_status, created_at')
          .eq('raffle_id', data.id);

        if (tickets) {
          const unavailable = tickets.filter(t => 
            t.payment_status === 'pago' || 
            (t.payment_status === 'pendente' && (new Date().getTime() - new Date(t.created_at).getTime() < 5 * 60 * 1000))
          ).map(t => t.ticket_number);
          
          setSoldTicketNumbers(unavailable);
        }
        
        setLoading(false);
        return data;
      }
      
      // FALLBACK PARA MOCK (Se for ID '1' que é o mock do DropPage)
      if (idOrSlug === '1') {
        const mockRaffle: Raffle = {
           id: '1',
           title: 'Rifle M4A1 CQBR GBB',
           description: 'Rifle de alta performance com sistema Gas Blowback. Kit completo com 3 magazines extras.',
           image_url: null,
           ticket_price: 25,
           total_tickets: 500,
           sold_tickets: 342,
           status: 'ativo',
           draw_date: '2026-04-15T20:00:00',
           images: []
        };
        setRaffle(mockRaffle);
        setLoading(false);
        return mockRaffle;
      }

      setLoading(false);
      return null;
    } catch (err) {
      console.error('Error loading raffle:', err);
      setLoading(false);
      return null;
    }
  };


  if (loading && !raffle) return <div className="p-20 text-white font-mono uppercase tracking-widest animate-pulse">Sincronizando com o Hub do QG...</div>;
  if (!raffle) return <div className="p-20 text-white font-black uppercase tracking-widest">PROTOCOLO NÃO ENCONTRADO OU DESATIVADO.</div>;

  const handlePurchase = async () => {
    if (selectedTickets.length === 0) {
        alert('SELECIONE AO MENOS UM TICKET PARA INICIAR O PROTOCOLO.');
        return;
    }

    if (!raffle?.id) return;

    setLoading(true);
    try {
        console.log('[DEBUG] Iniciando reserva atômica...', selectedTickets);
        
        // 1. Chamar a função de reserva atômica no Supabase
        const { data: orderId, error: rpcError } = await supabase.rpc('reserve_raffle_numbers', {
          p_rifa_id: raffle.id,
          p_user_id: (await supabase.auth.getUser()).data.user?.id,
          p_numeros: selectedTickets
        });

        if (rpcError) {
          throw new Error(rpcError.message || 'Falha ao reservar números. Tente novamente.');
        }

        console.log('[DEBUG] Reserva concluída. Order ID:', orderId);

        // 2. Adicionar ao carrinho com o ID da ordem para o checkout
        const success = await addItem(raffle.id, selectedTickets.length, {
            type: 'raffle',
            tickets: selectedTickets,
            raffleTitle: raffle.title,
            orderId: orderId // Importante para o checkout processar a reserva
        });

        if (success) {
            setSelectedTickets([]);
            setIsCartOpen(true);
        } else {
            throw new Error('Falha ao adicionar ao carrinho operacional.');
        }

    } catch (err: any) {
        console.error('[ERRO] Falha ao processar tickets:', err);
        alert(`FALHA NO PROTOCOLO: ${err.message || 'Erro inesperado.'}`);
    } finally {
        setLoading(false);
    }
  };



  return (
    <div className="min-h-screen pb-20 bg-background-dark selection:bg-primary selection:text-black">
      <div className="scanline opacity-10"></div>
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_-20%,#fbbf2415,transparent_50%)] pointer-events-none"></div>
      
      <SEO 
        title={`${raffle.title} | Premium Drop`} 
        description={raffle.description}
        image={raffle.image_url || undefined}
      />

      {/* Top Navigation HUD */}
      <nav className="border-b border-white/5 bg-black/40 backdrop-blur-md py-4 px-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link to="/drop" className="text-[10px] font-black text-primary/60 uppercase tracking-[0.3em] flex items-center gap-2 hover:text-primary transition-all group">
            <span className="material-symbols-outlined text-sm group-hover:-translate-x-1 transition-transform">arrow_back</span>
            RETORNAR AO HUB
          </Link>
          <div className="hidden md:flex items-center gap-4 text-[9px] font-mono text-slate-500 uppercase tracking-widest">
            <span className="text-primary/40">SISTEMA: ATIVO</span>
            <span className="h-3 w-px bg-white/10"></span>
            <span>OBJETIVO: {raffle.id.substring(0, 8).toUpperCase()}</span>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16">
          
          {/* LEFT COLUMN: Visual Arsenal */}
          <div className="lg:col-span-7 space-y-6">
            {/* Progress HUD (Now at the top of image) */}
            <div className="bg-black/20 border border-white/5 p-4 space-y-3 animate-in fade-in duration-700">
              <div className="flex justify-between text-[9px] font-black text-slate-500 uppercase tracking-widest">
                <span className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-primary animate-ping" />
                  CAPACIDADE OPERACIONAL DO DROP
                </span>
                <span className="text-white font-mono">{((raffle.sold_tickets / raffle.total_tickets) * 100).toFixed(1)}%</span>
              </div>
              <div className="h-1 bg-white/5 w-full overflow-hidden rounded-full p-[1px]">
                <div className="h-full bg-primary shadow-[0_0_10px_rgba(251,191,36,0.5)] rounded-full transition-all duration-1000" style={{ width: `${(raffle.sold_tickets / raffle.total_tickets) * 100}%` }} />
              </div>
            </div>

            <div className="relative group">
              <div className="aspect-square md:aspect-video bg-black/60 overflow-hidden border border-white/5 relative shadow-2xl">
                {allImages.length > 0 ? (
                  <img 
                    src={allImages[activeImageIndex]} 
                    alt={raffle.title} 
                    className="w-full h-full object-cover transition-all duration-700 group-hover:scale-105" 
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 opacity-10">
                    <span className="material-symbols-outlined text-9xl">photo_camera</span>
                    <span className="text-xs font-black uppercase tracking-[0.4em]">Visual Feed Offline</span>
                  </div>
                )}
                
                {/* HUD Overlay Indicators */}
                <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md border border-white/10 px-3 py-1.5 flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="size-1.5 rounded-full bg-primary animate-pulse" />
                    <div className="size-1.5 rounded-full bg-primary/40" />
                  </div>
                  <span className="text-[8px] font-black text-white/60 tracking-widest uppercase">HD LIVE FEED</span>
                </div>

                {/* Progress Mini-HUD (Mobile Overlay) */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 md:hidden">
                   <div className="flex justify-between items-end">
                      <h1 className="text-2xl font-black text-white uppercase tracking-tighter italic leading-none">{raffle.title}</h1>
                      <div className="text-right">
                        <span className="text-[8px] text-primary font-black block tracking-widest">A PARTIR DE</span>
                        <span className="text-2xl font-black text-white leading-none">R$ {raffle.ticket_price.toFixed(2)}</span>
                      </div>
                   </div>
                </div>
              </div>

              {/* Gallery Thumbnails */}
              {allImages.length > 1 && (
                <div className="grid grid-cols-5 gap-2 mt-2">
                  {allImages.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImageIndex(idx)}
                      className={`aspect-square border-2 transition-all duration-300 ${activeImageIndex === idx ? 'border-primary' : 'border-transparent opacity-40 hover:opacity-100'}`}
                    >
                      <img src={img} alt={`Thumb ${idx}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Mission Intel (Briefing) - Tablet/Desktop View */}
            <div className="hidden lg:block space-y-8 pt-8">
              <div className="border-b border-white/5 pb-4">
                <h3 className="text-sm font-black text-white uppercase tracking-[0.4em] flex items-center gap-3 italic">
                  <span className="h-px w-8 bg-primary" />
                  Descrição do equipamento
                </h3>
              </div>
              <p className="text-sm text-slate-400 font-mono leading-relaxed uppercase whitespace-pre-line bg-white/5 p-6 border-l-2 border-primary/40">
                {raffle.description}
              </p>
              
              <div className="grid grid-cols-2 gap-12 pt-4">
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">gavel</span>
                    REGRAS
                  </h4>
                  <p className="text-[10px] text-slate-500 font-mono leading-relaxed uppercase italic">
                    {raffle.rules || 'Sorteio baseado na extração da Loteria Federal ou hash de rede blockchain verificado.'}
                  </p>
                </div>
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">local_shipping</span>
                    LOGÍSTICA
                  </h4>
                  <p className="text-[10px] text-slate-500 font-mono leading-relaxed uppercase italic">
                    {raffle.logistics_description || 'Envio segurado para todo o Brasil via transportadora tática especializada.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Control Panel & Purchase */}
          <div className="lg:col-span-5 space-y-8">
            <div className="sticky top-28 space-y-8">
            
            {/* PAINEL DE INTELIGÊNCIA OPERACIONAL [ADMIN ONLY - REPOSICIONADO NO TOPO] */}
            {isAdmin && (
              <div className="bg-primary/5 border border-primary/20 p-4 animate-in fade-in slide-in-from-top-4 duration-700">
                <button 
                  onClick={() => setShowIntel(!showIntel)}
                  className={`w-full flex items-center justify-between p-3 border transition-all ${showIntel ? 'bg-primary text-black border-primary font-black' : 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20'}`}
                >
                  <div className="flex items-center gap-2">
                    <BarChart3 size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Painel de Comando Intel</span>
                  </div>
                  {showIntel ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {showIntel && (
                  <div className="mt-2 bg-black/60 border border-white/5 p-4 space-y-4 animate-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center justify-between pb-2 border-b border-white/10">
                      <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <Users size={12} className="text-primary" />
                        Status de Extração em Tempo Real
                      </span>
                      <span className="text-[10px] text-white font-mono">{participants.length} / {raffle.total_tickets}</span>
                    </div>

                    {loadingParticipants ? (
                      <div className="py-8 text-center text-[8px] text-white/20 uppercase tracking-[0.3em] animate-pulse italic">
                         Capturando feed de dados do grid...
                      </div>
                    ) : participants.length > 0 ? (
                      <div className="max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-primary/20 space-y-1 pr-1">
                        {participants.map((p, idx) => {
                            const pName = p.profiles?.full_name || p.orders?.customer_data?.name || 'Operador Desconhecido';
                            const pPhone = p.profiles?.phone || p.orders?.customer_data?.phone || 'Sem Contato';
                            const isPaid = p.payment_status === 'pago';
                            
                            return (
                              <div key={idx} className="flex items-center justify-between bg-white/5 p-2 border-l-2 border-transparent hover:border-primary/40 transition-all group/item">
                                <div className="flex items-center gap-3">
                                  <span className={`text-[10px] font-black w-7 h-7 flex items-center justify-center rounded-sm ${isPaid ? 'bg-primary text-black' : 'bg-white/10 text-white/40'}`}>
                                    {p.ticket_number}
                                  </span>
                                  <div className="flex flex-col">
                                    <span className="text-[9px] font-bold text-white uppercase leading-none group-hover/item:text-primary transition-colors">{pName}</span>
                                    <span className="text-[7px] text-slate-500 font-mono mt-1">{pPhone}</span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className={`text-[7px] font-black uppercase tracking-widest ${isPaid ? 'text-emerald-500' : 'text-amber-500'}`}>
                                    {p.payment_status}
                                  </span>
                                </div>
                              </div>
                            );
                        })}
                      </div>
                    ) : (
                      <div className="py-8 text-center text-[8px] text-slate-600 uppercase italic">
                        O grid operacional ainda não detectou compras.
                      </div>
                    )}
                    
                    <div className="pt-2 flex justify-center border-t border-white/5">
                       <p className="text-[6px] text-white/20 uppercase font-mono tracking-widest italic">Acesso Restrito ao Comando Superior</p>
                    </div>
                  </div>
                )}
              </div>
            )}
              
              {/* Product Header (Desktop Only) */}
              <div className="hidden lg:block space-y-4 border-b border-white/5 pb-8">
                <span className="text-[10px] font-black text-primary uppercase tracking-[0.5em] block animate-in slide-in-from-left duration-500">TACTICAL DROP // ATIVO</span>
                <h1 className="text-5xl font-black text-white uppercase tracking-tighter italic leading-[0.8]">{raffle.title}</h1>
                <div className="flex items-center justify-between pt-4">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">PREÇO POR UNIDADE</span>
                    <span className="text-4xl font-black text-white tracking-tight">R$ {raffle.ticket_price.toFixed(2)}</span>
                  </div>
                  <div className="text-right">
                     <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">DISPONIBILIDADE</span>
                     <span className="text-xs font-black text-green-400 block tracking-widest italic uppercase">Estoque Operacional</span>
                  </div>
                </div>
              </div>

              {/* Purchase HUD Selector */}
              <div className="bg-surface border border-white/10 p-4 md:p-5 space-y-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden backdrop-blur-xl">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                
                <header className="flex justify-between items-center relative z-10">
                  <div className="space-y-1">
                    <h3 className="text-[14px] md:text-lg font-black text-white uppercase tracking-tighter italic">SELETOR DE TICKET</h3>
                    <div className="flex items-center gap-2">
                       <span className="size-1 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                       <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest">Selecione seus números da sorte</span>
                    </div>
                  </div>
                  <div className="bg-white/5 px-3 py-1.5 border-r-2 border-primary">
                    <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest block text-right">ORDENS</span>
                    <span className="text-lg font-black text-primary font-mono">{selectedTickets.length}</span>
                  </div>
                </header>

                {/* Quick Select Buttons */}
                <div className="space-y-2 relative z-10">
                    <div className="grid grid-cols-4 gap-2">
                        {[5, 10, 25, 50].map((num) => (
                        <button 
                            key={num}
                            type="button"
                            onClick={() => {
                            const available = Array.from({ length: raffle.total_tickets }, (_, i) => i + 1)
                                .filter(n => !soldTicketNumbers.includes(n) && !selectedTickets.includes(n))
                                .slice(0, num);
                            setSelectedTickets(prev => [...prev, ...available]);
                            }}
                            className="bg-white/5 border border-white/10 py-2 text-[9px] font-black text-white/60 hover:bg-primary hover:text-black hover:border-primary transition-all uppercase tracking-widest"
                        >
                            +{num}
                        </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <button 
                            type="button"
                            onClick={() => setSelectedTickets([])}
                            className="bg-red-500/10 border border-red-500/20 py-3 text-[9px] font-black text-red-500 hover:bg-red-500 hover:text-white transition-all uppercase tracking-widest flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined text-sm">delete_sweep</span>
                            LIMPAR TICKET
                        </button>
                        <button 
                            type="button"
                            onClick={() => {
                                const available = Array.from({ length: raffle.total_tickets }, (_, i) => i + 1)
                                    .filter(n => !soldTicketNumbers.includes(n) && !selectedTickets.includes(n));
                                
                                if (available.length > 0) {
                                    const randomIndex = Math.floor(Math.random() * available.length);
                                    const luckyNumber = available[randomIndex];
                                    setSelectedTickets(prev => [...prev, luckyNumber]);
                                }
                            }}
                            className="bg-emerald-500/10 border border-emerald-500/20 py-3 text-[9px] font-black text-emerald-500 hover:bg-emerald-500 hover:text-black transition-all uppercase tracking-widest flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined text-sm">casino</span>
                            SORTEIO ALEATÓRIO
                        </button>
                    </div>
                </div>

                {/* LEGENDA TÁTICA DO GRID */}
                <div className="grid grid-cols-2 gap-4 pb-2 relative z-10">
                  <div className="flex items-center gap-2">
                      <div className="size-3 bg-red-900/40 border border-red-500/20 rounded-sm" />
                      <span className="text-[7px] text-slate-500 font-black uppercase tracking-widest">Ocupado</span>
                  </div>
                  <div className="flex items-center gap-2">
                      <div className="size-3 bg-white/5 border border-white/20 rounded-sm" />
                      <span className="text-[7px] text-slate-500 font-black uppercase tracking-widest">Disponível</span>
                  </div>
                </div>

                {/* Raffle Grid Component */}
                <div className="relative z-10">
                  <RaffleGrid 
                    raffleId={raffle.id}
                    totalTickets={raffle.total_tickets}
                    ticketPrice={raffle.ticket_price}
                    onSelectionChange={setSelectedTickets}
                    currentUserId={(supabase.auth.getUser() as any)?.data?.user?.id}
                  />
                </div>

                {/* Order Summary & Mobilization */}
                <div className="pt-6 space-y-6 relative z-10">
                  <div className="flex justify-between items-end">
                    <div className="space-y-1">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">INVESTIMENTO OPERACIONAL</span>
                      <div className="flex items-center gap-2">
                        <span className="text-3xl font-black text-white font-mono tracking-tighter">R$ {(selectedTickets.length * raffle.ticket_price).toFixed(2)}</span>
                        {selectedTickets.length > 0 && (
                          <span className="text-[10px] text-primary font-black animate-pulse bg-primary/10 px-2 py-0.5 border border-primary/20">READY</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    disabled={selectedTickets.length === 0 || loading}
                    onClick={handlePurchase}
                    className="w-full bg-primary text-background-dark font-black py-5 text-[11px] uppercase tracking-[0.5em] hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all relative overflow-hidden group/btn shadow-[0_0_30px_rgba(251,191,36,0.15)]"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-4 italic">
                      {loading ? 'PROCESSANDO...' : 'INICIALIZAR COMPRA'}
                      <span className="material-symbols-outlined text-sm group-hover/btn:translate-x-2 transition-transform">bolt</span>
                    </span>
                    <div className="absolute inset-0 bg-white translate-y-full group-hover/btn:translate-y-0 transition-transform duration-500"></div>
                  </button>

                  {/* Ajuste de Fluxo e Escala [SAMA Protocol - v8] */}
                  <div className="mt-6 pt-6 border-t border-white/5">
                    <div className="flex items-center justify-center gap-2 text-[10px] font-black text-emerald-500 uppercase tracking-[0.4em] italic">
                      <span className="material-symbols-outlined text-[16px]">verified</span>
                      COMPRA SEGURA
                    </div>
                  </div>
                </div>
              </div>
              </div>

            </div>
          </div>
        </div>

        {/* Mobile-Only Description & Rules (Moved down) */}
        <div className="lg:hidden mt-12 space-y-12">
           <div className="space-y-6">
              <h3 className="text-xl font-black text-white uppercase tracking-tighter italic border-l-4 border-primary pl-4">Descrição do equipamento</h3>
              <p className="text-sm text-slate-400 font-mono leading-relaxed uppercase bg-white/5 p-4 border border-white/5">
                {raffle.description}
              </p>
           </div>
           
           <div className="grid grid-cols-1 gap-8">
              <div className="bg-white/5 p-6 border-t border-primary/20">
                <h4 className="text-xs font-black text-primary uppercase tracking-widest mb-4">REGRAS E ENGAJAMENTO</h4>
                <p className="text-[10px] text-slate-500 font-mono leading-relaxed uppercase">
                  {raffle.rules || 'Sorteio baseado na extração da Loteria Federal.'}
                </p>
              </div>
              <div className="bg-white/5 p-6 border-t border-primary/20">
                <h4 className="text-xs font-black text-primary uppercase tracking-widest mb-4">PROTOCOLO DE LOGÍSTICA</h4>
                <p className="text-[10px] text-slate-500 font-mono leading-relaxed uppercase">
                  {raffle.logistics_description || 'Envio segurado para todo o Brasil.'}
                </p>
              </div>
           </div>
        </div>
      </main>

      {/* STICKY BOTTOM BAR (MOBILE ONLY) */}
      {selectedTickets.length > 0 && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-background-dark/95 backdrop-blur-xl border-t border-primary/30 p-4 z-[100] animate-in slide-in-from-bottom duration-500">
           <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto">
              <div className="flex-1">
                 <span className="text-[10px] font-black text-primary uppercase tracking-widest block">{selectedTickets.length} UNIDADES</span>
                 <span className="text-lg font-black text-white font-mono">R$ {(selectedTickets.length * raffle.ticket_price).toFixed(2)}</span>
              </div>
              <button
                onClick={handlePurchase}
                className="bg-primary text-background-dark font-black py-4 px-8 text-[11px] uppercase tracking-widest italic flex items-center gap-2 active:scale-95 transition-transform"
              >
                CONFIRMAR
                <span className="material-symbols-outlined text-sm">bolt</span>
              </button>
           </div>
        </div>
      )}
    </div>
  );
}

