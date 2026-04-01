import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { SEO } from '../components/SEO';
import { supabase } from '../lib/supabase';
import { useCart } from '../context/CartContext';

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
  rules_title?: string;
  logistics_title?: string;
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
              if (payload.new && (payload.new as any).payment_status === 'pago') {
                 const ticketNum = (payload.new as any).ticket_number;
                 setSoldTicketNumbers(prev => [...new Set([...prev, ticketNum])]);
                 
                 // Atualiza contador total na rifa
                 setRaffle(prev => prev ? {
                   ...prev,
                   sold_tickets: (prev.sold_tickets || 0) + 1
                 } : null);
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
          .select('ticket_number')
          .eq('raffle_id', data.id)
          .eq('payment_status', 'pago');

        if (tickets) {
          setSoldTicketNumbers(tickets.map(t => t.ticket_number));
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

  const toggleTicket = (num: number) => {
    if (selectedTickets.includes(num)) {
      setSelectedTickets(selectedTickets.filter(t => t !== num));
    } else {
      setSelectedTickets([...selectedTickets, num]);
    }
  };

  const handlePurchase = async () => {
    if (selectedTickets.length === 0) {
        alert('SELECIONE AO MENOS UM TICKET PARA INICIAR O PROTOCOLO.');
        return;
    }

    setLoading(true);
    try {
        console.log('[DEBUG] Adicionando tickets ao carrinho...', selectedTickets);
        
        // Adiciona ao carrinho como um produto (raffleId) com metadados (tickets)
        const success = await addItem(raffle.id, selectedTickets.length, {
            type: 'raffle',
            tickets: selectedTickets,
            raffleTitle: raffle.title
        });

        if (success) {
            setIsCartOpen(true);
            // Limpa seleção após adicionar ao carrinho
            setSelectedTickets([]);
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
                    {raffle.rules_title || 'REGRAS E ENGAJAMENTO'}
                  </h4>
                  <p className="text-[10px] text-slate-500 font-mono leading-relaxed uppercase italic">
                    {raffle.rules || 'Sorteio baseado na extração da Loteria Federal ou hash de rede blockchain verificado.'}
                  </p>
                </div>
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">local_shipping</span>
                    {raffle.logistics_title || 'PROTOCOLO DE LOGÍSTICA'}
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

              {/* Progress HUD (Desktop Column) */}
              <div className="bg-black/20 border border-white/5 p-4 space-y-3 mb-2 animate-in fade-in duration-700">
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
                            LIMPAR ARSENAL
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

                {/* Ticket Grid Overlay */}
                <div className="relative z-10 group/grid">
                  <div className="grid grid-cols-10 gap-1 overflow-y-auto max-h-64 p-2 bg-black/40 border border-white/5 scrollbar-thin scrollbar-thumb-primary/20">
                    {Array.from({ length: raffle.total_tickets }).map((_, i) => {
                      const ticketNum = i + 1;
                      const isSold = soldTicketNumbers.includes(ticketNum);
                      const isSelected = selectedTickets.includes(ticketNum);

                      return (
                        <button
                          key={i}
                          disabled={isSold}
                          onClick={() => toggleTicket(ticketNum)}
                          className={`aspect-square text-[9px] font-bold transition-all flex items-center justify-center border
                                ${isSold ? 'bg-red-900/20 text-red-500/20 border-transparent cursor-not-allowed grayscale' :
                              isSelected ? 'bg-primary text-background-dark border-primary scale-110 z-10 shadow-[0_0_15px_rgba(251,191,36,0.4)] rotate-3' :
                                'bg-white/5 text-slate-500 border-white/10 hover:border-primary/50 hover:text-white backdrop-blur-sm'}
                              `}
                        >
                          {ticketNum}
                        </button>
                      )
                    })}
                  </div>
                  {/* Grid Shadow Overlay to suggest scroll */}
                  <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-surface to-transparent pointer-events-none opacity-60"></div>
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
                  <div className="mt-10 pt-8 border-t border-white/5 space-y-6">
                    <div className="flex items-center justify-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">
                      <span className="material-symbols-outlined text-[14px] text-emerald-500">verified</span>
                      SISTEMA DE PAGAMENTO CRIPTOGRAFADO
                    </div>
                    
                    <div className="flex flex-nowrap items-baseline justify-center gap-4 font-black text-[11px] text-white/40 uppercase tracking-[0.2em] overflow-hidden">
                      <span className="hover:text-white transition-colors cursor-crosshair whitespace-nowrap">MERCADO PAGO</span>
                      <span className="text-white/10 flex-shrink-0">•</span>
                      <span className="hover:text-white transition-colors cursor-crosshair whitespace-nowrap">VISA</span>
                      <span className="text-white/10 flex-shrink-0">•</span>
                      <span className="hover:text-white transition-colors cursor-crosshair whitespace-nowrap">MASTERCARD</span>
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

