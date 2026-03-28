import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { SEO } from '../components/SEO';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

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
}


export default function RaffleDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [raffle, setRaffle] = useState<Raffle | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTickets, setSelectedTickets] = useState<number[]>([]);
  const [soldTicketNumbers, setSoldTicketNumbers] = useState<number[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const allImages = raffle ? [raffle.image_url, ...(raffle.images || [])].filter(Boolean) as string[] : [];

  useEffect(() => {
    window.scrollTo(0, 0);
    loadRaffle();
  }, [id]);

  const loadRaffle = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('raffles')
        .select('*')
        .eq('id', id)
        .single();
      
      if (!error && data) {
        setRaffle(data);
        
        // Carregar tickets já vendidos/reservados
        const { data: tickets, error: ticketsError } = await supabase
          .from('raffle_tickets')
          .select('ticket_number')
          .eq('raffle_id', id)
          .neq('payment_status', 'cancelado');
        
        if (!ticketsError && tickets) {
          setSoldTicketNumbers(tickets.map(t => t.ticket_number));
        }
      }
    } catch {
      // Mock fallback
    } finally {
      setLoading(false);
    }
  };

  if (loading && !raffle) return <div className="p-20 text-white font-mono uppercase tracking-widest animate-pulse">Sincronizando com o Hub...</div>;
  if (!raffle) return <div className="p-20 text-white">Rifa não encontrada ou desativada.</div>;

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
        const ticketNumbers = selectedTickets;
        const totalAmount = ticketNumbers.length * (raffle?.ticket_price || 0);

        // Gera um ID de referência para o pedido (funciona para usuários logados e anônimos)
        const orderId = `RIFA-${raffle?.id?.slice(0, 8)}-${Date.now()}`;
        const userId = user?.id || null;

        // 1. Criar pedido na tabela 'orders' (funciona com ou sem login)
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert({
                ...(userId ? { user_id: userId } : {}),
                total: totalAmount,
                status: 'pendente',
                customer_data: {
                    name: user?.user_metadata?.full_name || 'Cliente Anônimo',
                    email: user?.email || '',
                    reference: orderId,
                    cpf: user?.user_metadata?.cpf || ''
                },
                shipping_address: { type: 'digital', info: 'Rifa/Drop' }
            })
            .select()
            .single();

        if (orderError || !order) throw new Error(`Erro ao criar pedido: ${orderError?.message}`);

        // 2. Criar itens do pedido (Usamos um ID de produto mestre para satisfazer a FK do banco)
        const MASTER_PRODUCT_ID = '017213a1-6228-48bd-bb71-1154e82ec3eb';
        const { error: itemsError } = await supabase
            .from('order_items')
            .insert({
                order_id: order.id,
                product_id: MASTER_PRODUCT_ID,
                product_name: `TICKET RIFA: ${raffle?.title} (#${ticketNumbers.join(', #')})`,
                product_price: raffle?.ticket_price || 0,
                quantity: ticketNumbers.length
            });

        if (itemsError) throw itemsError;

        // 3. Criar tickets na tabela 'raffle_tickets' vinculados ao pedido
        const { error: ticketError } = await supabase.from('raffle_tickets').insert(
            ticketNumbers.map(num => ({
                raffle_id: raffle?.id,
                user_id: userId,
                ticket_number: num,
                payment_status: 'pendente',
                payment_id: order.id
            }))
        );

        if (ticketError) throw ticketError;

        // 4. Chamar Edge Function via fetch direto (funciona sem login — tok do Mercado Pago na função)
        const { data: { session } } = await supabase.auth.getSession();
        const mpResponse = await fetch('https://seewdqetyolfmqsiyban.supabase.co/functions/v1/mercadopago-payment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Envia o access_token se disponível, caso contrário usa anon key
                'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY || ''}`,
            },
            body: JSON.stringify({
                orderId: order.id,
                customerData: {
                    email: user?.email || '',
                    name: user?.user_metadata?.full_name || 'Cliente',
                    cpf: user?.user_metadata?.cpf || ''
                },
                items: [{
                    product_id: MASTER_PRODUCT_ID,
                    product_name: `TICKETS: ${raffle?.title}`,
                    quantity: ticketNumbers.length,
                    product_price: raffle?.ticket_price
                }],
                total: totalAmount
            })
        });

        console.log('Status HTTP da Edge Function:', mpResponse.status);
        const data = await mpResponse.json();
        console.log('Corpo da resposta:', JSON.stringify(data));

        if (!mpResponse.ok) {
            const errMsg = data?.error || data?.message || `Erro HTTP ${mpResponse.status}`;
            const errDetail = data?.details ? ` Detalhe: ${JSON.stringify(data.details)}` : '';
            throw new Error(errMsg + errDetail);
        }

        if (data?.checkout_url) {
            window.location.href = data.checkout_url;
        } else {
            console.error('Resposta sem URL de checkout:', data);
            throw new Error('O Mercado Pago não retornou um link de pagamento.');
        }

    } catch (err: any) {
        console.error('FALHA NO PROTOCOLO DE COMPRA:', err);
        alert(`FALHA NO PROTOCOLO: ${err.message || 'Erro inesperado na comunicação com o servidor.'}`);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-20 bg-background-dark">
      <SEO title={`${raffle.title} | Tactical Drop`} />

      {/* Header HUD */}
      <div className="border-b border-primary/20 bg-surface/10 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <Link to="/drop" className="text-[10px] font-black text-primary/60 uppercase tracking-[0.3em] flex items-center gap-2 mb-8 hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            ABORT MISSION / RETURN TO HUB
          </Link>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
            <div>
              <span className="bg-primary/20 text-primary border border-primary/40 text-[8px] font-black uppercase tracking-widest px-3 py-1 mb-4 inline-block">
                OBJECTIVE: {raffle.id.substring(0, 8).toUpperCase()}
              </span>
              <h1 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter leading-none">
                {raffle.title}
              </h1>
            </div>
            
            <div className="bg-white/5 border-l-2 border-primary p-6 md:text-right">
               <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest block mb-2">TARGET VALUE / TICKET</span>
               <span className="text-4xl font-black text-white">R$ {raffle.ticket_price.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-12">
        
        {/* Left Column: Intel & Media */}
        <div className="lg:col-span-7 flex flex-col gap-12">
          <div className="flex flex-col gap-4">
              <div className="aspect-video bg-surface overflow-hidden border border-white/5 relative group">
                  {allImages.length > 0 ? (
                    <img src={allImages[activeImageIndex]} alt={raffle.title} className="w-full h-full object-cover transition-all duration-500" />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 opacity-10">
                      <span className="material-symbols-outlined text-9xl">photo_camera</span>
                      <span className="text-xs font-black uppercase tracking-[0.4em]">Visual Feed Offline</span>
                    </div>
                  )}
                  {/* Overlay HUD indicators */}
                  <div className="absolute top-4 right-4 flex gap-2">
                     <div className="size-2 rounded-full bg-primary animate-pulse" />
                     <div className="size-2 rounded-full bg-primary/40" />
                     <div className="size-2 rounded-full bg-primary/20" />
                  </div>
              </div>

              {/* Gallery Thumbnails */}
              {allImages.length > 1 && (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                      {allImages.map((img, idx) => (
                          <button 
                            key={idx}
                            onClick={() => setActiveImageIndex(idx)}
                            className={`aspect-video border-2 transition-all overflow-hidden ${activeImageIndex === idx ? 'border-primary' : 'border-white/5 hover:border-white/20'}`}
                          >
                            <img src={img} alt={`Thumb ${idx}`} className="w-full h-full object-cover" />
                          </button>
                      ))}
                  </div>
              )}
          </div>

          <div className="bg-surface/20 border border-white/5 p-8">
              <h3 className="text-[10px] font-black text-primary/60 uppercase tracking-[0.4em] mb-6 flex items-center gap-3">
                 <span className="h-px w-8 bg-primary/40" />
                 MISSION BRIEFING
              </h3>
              <p className="text-sm text-slate-400 font-mono leading-relaxed uppercase mb-8">
                {raffle.description}
              </p>
              
              <div className="grid grid-cols-2 gap-8 border-t border-white/5 pt-8">
                  <div>
                    <h4 className="text-[9px] font-black text-white uppercase tracking-widest mb-4">
                        {raffle.rules_title || 'RULES & ENGAGEMENT'}
                    </h4>
                    <p className="text-[10px] text-slate-500 font-mono leading-relaxed uppercase">
                        {raffle.rules || 'Sorteio baseado na extração da Loteria Federal ou hash de rede blockchain verificado.'}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-[9px] font-black text-white uppercase tracking-widest mb-4">
                        {raffle.logistics_title || 'LOGISTICS'}
                    </h4>
                    <p className="text-[10px] text-slate-500 font-mono leading-relaxed uppercase">
                        {raffle.logistics_description || 'Envio segurado para todo o Brasil via transportadora tática especializada.'}
                    </p>
                  </div>
              </div>
          </div>
        </div>

        {/* Right Column: Ticket Selector HUD */}
        <div className="lg:col-span-5 flex flex-col gap-8">
          <div className="bg-surface border border-primary/20 p-8 sticky top-32">
              <div className="flex justify-between items-center mb-8">
                  <h3 className="text-xl font-black text-white uppercase tracking-tighter italic">TICKET SELECTOR</h3>
                  <div className="text-right">
                    <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest block">SELECTED</span>
                    <span className="text-lg font-black text-primary font-mono">{selectedTickets.length}</span>
                  </div>
              </div>

              {/* Progress HUD */}
              <div className="mb-8 p-4 bg-black/40 border-l border-primary/40">
                <div className="flex justify-between text-[8px] font-black text-slate-500 uppercase tracking-widest mb-2">
                    <span>OPERATIONAL CAPACITY</span>
                    <span>{((raffle.sold_tickets / raffle.total_tickets) * 100).toFixed(1)}%</span>
                </div>
                <div className="h-1 bg-white/5 w-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${(raffle.sold_tickets / raffle.total_tickets) * 100}%` }} />
                </div>
              </div>

              {/* Ticket Grid Overlay (Visual representation) */}
              <div className="grid grid-cols-10 gap-1 mb-8 overflow-y-auto max-h-80 p-1 bg-black/20">
                  {Array.from({ length: raffle.total_tickets }).map((_, i) => {
                    const ticketNum = i + 1;
                    const isSold = soldTicketNumbers.includes(ticketNum);
                    const isSelected = selectedTickets.includes(ticketNum);

                    return (
                      <button 
                        key={i}
                        disabled={isSold}
                        onClick={() => toggleTicket(ticketNum)}
                        className={`aspect-square text-[8px] font-black transition-all flex items-center justify-center border
                          ${isSold ? 'bg-red-900/40 text-red-500/40 border-transparent cursor-not-allowed' : 
                            isSelected ? 'bg-primary text-background-dark border-primary scale-110 z-10 shadow-[0_0_10px_rgba(255,193,7,0.5)]' : 
                            'bg-white/5 text-slate-500 border-white/10 hover:border-primary/40 hover:text-primary'}
                        `}
                      >
                        {ticketNum}
                      </button>
                    )
                  })}
              </div>

              {/* Summary & Checkout */}
              <div className="border-t border-white/5 pt-8 flex flex-col gap-6">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">TOTAL DEPLOYMENT COST</span>
                    <span className="text-2xl font-black text-white font-mono">R$ {(selectedTickets.length * raffle.ticket_price).toFixed(2)}</span>
                  </div>
                  
                  <button 
                    disabled={selectedTickets.length === 0 || loading}
                    onClick={handlePurchase}
                    className="w-full bg-primary text-background-dark font-black py-4 text-[10px] uppercase tracking-[0.4em] hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all relative overflow-hidden group/btn"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-3">
                        CONFIRM PROTOCOL
                        <span className="material-symbols-outlined text-sm group-hover/btn:translate-x-1 transition-transform">lock</span>
                    </span>
                    <div className="absolute inset-0 bg-white translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300"></div>
                  </button>
                  
                  <p className="text-[8px] text-slate-600 font-mono text-center uppercase tracking-widest leading-relaxed">
                    SECURE ENCRYPTED TRANSACTION<br />
                    MERCADO PAGO AUTHENTICATED
                  </p>
              </div>
          </div>
        </div>
      </div>
    </div>
  );
}
