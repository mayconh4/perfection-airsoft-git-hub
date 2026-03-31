import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { SEO } from '../components/SEO';
import { supabase } from '../lib/supabase';

interface Event {
  id: string;
  title: string;
  description: string;
  location: string;
  event_date: string;
  ticket_price: number;
  platform_fee: number;
  capacity: number;
  sold_count: number;
  image_url: string | null;
  status: 'draft' | 'published' | 'closed';
  organizer_id: string;
}

const MOCK_EVENTS: Record<string, Event> = {
  '1': {
    id: '1',
    title: 'Operation: Dark Veil',
    description: 'Missão noturna em campo fechado. Modo de jogo: Eliminação por equipes. Capacidade máxima de 40 operadores. Equipamentos obrigatórios: Full-face protection e tracer unit. O briefing detalhado será enviado via rádio 24h antes da operação.',
    location: 'Campo Batalha SP - Zona Leste, São Paulo',
    event_date: '2026-04-12T09:00:00',
    ticket_price: 46,
    platform_fee: 6,
    capacity: 40,
    sold_count: 28,
    image_url: null,
    status: 'published',
    organizer_id: 'org1',
  },
  '2': {
    id: '2',
    title: 'CQB Speedsoft Championship',
    description: 'Torneio de Speedsoft em arena indoor. 3 modalidades: 1v1, 2v2 e 5v5. Premiação para os campeões de cada categoria. Regras oficiais da Federação Mundial de Speedsoft.',
    location: 'Arena Tática Indoor - Santo André, SP',
    event_date: '2026-04-19T10:00:00',
    ticket_price: 60,
    platform_fee: 6,
    capacity: 60,
    sold_count: 60,
    image_url: null,
    status: 'closed',
    organizer_id: 'org2',
  },
  '3': {
    id: '3',
    title: 'Operação Floresta Negra',
    description: 'Missão em campo aberto com mais de 5 hectares de área. Jogo de papéis com times de Assalto e Defesa. Duração: 6 horas contínuas. Recomenda-se camuflagem woodland.',
    location: 'Campo BR Airsoft - Mogi das Cruzes, SP',
    event_date: '2026-05-03T08:00:00',
    ticket_price: 55,
    platform_fee: 6,
    capacity: 80,
    sold_count: 14,
    image_url: null,
    status: 'published',
    organizer_id: 'org1',
  },
};

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [purchasing, setPurchasing] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (id && MOCK_EVENTS[id]) {
      setEvent(MOCK_EVENTS[id]);
      setLoading(false);
    } else {
      // Tentar buscar do Supabase
      loadEvent();
    }
  }, [id]);

  const loadEvent = async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single();
      
      if (!error && data) {
        setEvent(data);
      }
    } catch {
      // Erro silencioso, mantém mock se existir
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = () => {
    setPurchasing(true);
    // Simular processamento de pagamento
    setTimeout(() => {
      setPurchasing(false);
      setOrderComplete(true);
    }, 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-dark">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background-dark px-6">
        <h1 className="text-2xl font-black text-white mb-4 uppercase">Missão não encontrada</h1>
        <Link to="/eventos" className="bg-primary text-black font-black px-8 py-3 text-[10px] uppercase tracking-widest hover:bg-white transition-all">
          Voltar para Eventos
        </Link>
      </div>
    );
  }

  const isSoldOut = event.status === 'closed' || (event.capacity - event.sold_count) <= 0;
  const totalPrice = event.ticket_price * quantity;
  const dateStr = new Date(event.event_date).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  if (orderComplete) {
    return (
      <div className="min-h-screen bg-background-dark flex items-center justify-center p-6">
        <div className="bg-surface/40 border border-primary/20 p-12 max-w-lg w-full text-center">
          <div className="size-20 bg-green-500/10 border border-green-500/30 rounded-full flex items-center justify-center mx-auto mb-8">
            <span className="material-symbols-outlined text-green-500 text-4xl">check_circle</span>
          </div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-4">Alistamento Confirmado!</h2>
          <p className="text-slate-400 text-sm font-mono mb-8 uppercase leading-relaxed">
            Seu ticket para <span className="text-white font-black">{event.title}</span> foi gerado com sucesso.
          </p>
          
          <div className="bg-white p-6 rounded-lg inline-block mb-10 shadow-[0_0_50px_rgba(255,255,255,0.05)]">
            <div className="size-48 bg-slate-100 flex items-center justify-center relative">
               {/* Mock QR Code */}
               <div className="grid grid-cols-4 gap-1 w-full h-full p-2 opacity-80">
                  {Array.from({ length: 16 }).map((_, i) => (
                    <div key={i} className={`h-full w-full ${Math.random() > 0.5 ? 'bg-black' : 'bg-transparent'}`} />
                  ))}
               </div>
               <div className="absolute inset-0 flex items-center justify-center bg-white/20">
                 <span className="material-symbols-outlined text-4xl text-black">qr_code_2</span>
               </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <Link 
              to="/dashboard"
              className="bg-primary text-background-dark font-black py-4 text-[10px] uppercase tracking-[.3em] hover:bg-white transition-all"
            >
              Meus Ingressos
            </Link>
            <Link 
              to="/eventos"
              className="text-slate-500 font-black py-4 text-[10px] uppercase tracking-[.3em] hover:text-white transition-all"
            >
              Voltar à Central
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-dark pb-20">
      <SEO 
        title={`${event.title} | Perfection Airsoft`} 
        description={event.description}
        image={event.image_url || undefined}
      />

      {/* Hero Header */}
      <div className="relative h-[40vh] md:h-[50vh] bg-surface flex items-center justify-center overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-primary/20 rounded-full" />
        </div>
        
        {event.image_url ? (
          <img src={event.image_url} alt={event.title} className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-4 text-white/5 select-none">
            <span className="material-symbols-outlined text-9xl">military_tech</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-background-dark/40 to-transparent" />
        
        <div className="absolute bottom-12 left-0 right-0 max-w-6xl mx-auto px-6">
          <Link to="/eventos" className="inline-flex items-center gap-2 text-primary font-black text-[9px] uppercase tracking-widest mb-6 hover:text-white transition-colors">
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Central de Missões
          </Link>
          <h1 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter mb-4 leading-none max-w-3xl">
            {event.title}
          </h1>
          <div className="flex flex-wrap gap-4 items-center">
            <div className="bg-primary px-3 py-1 flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-black animate-pulse" />
              <span className="text-[9px] font-black text-black uppercase tracking-widest">Missão Confirmada</span>
            </div>
            <div className="bg-white/5 border border-white/10 px-3 py-1 text-[9px] font-black text-white uppercase tracking-widest">
              {event.location.split(',')[1]}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 pt-12">
        <div className="grid lg:grid-cols-3 gap-12">
          {/* Main Info */}
          <div className="lg:col-span-2">
            <section className="mb-12">
              <h2 className="text-xl font-black text-white uppercase tracking-widest mb-6 border-l-4 border-primary pl-4">Briefing da Missão</h2>
              <p className="text-slate-400 font-mono text-sm leading-relaxed whitespace-pre-line mb-8">
                {event.description}
              </p>

              <div className="grid sm:grid-cols-2 gap-8">
                <div className="bg-surface/30 p-6 border border-white/5">
                  <span className="material-symbols-outlined text-primary mb-3">pin_drop</span>
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Localização</h4>
                  <p className="text-sm font-black text-white uppercase tracking-tighter">{event.location}</p>
                </div>
                <div className="bg-surface/30 p-6 border border-white/5">
                  <span className="material-symbols-outlined text-primary mb-3">event</span>
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Horário de Início</h4>
                  <p className="text-sm font-black text-white uppercase tracking-tighter">{dateStr}</p>
                </div>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-xl font-black text-white uppercase tracking-widest mb-6 border-l-4 border-primary pl-4">Regras de Engajamento</h2>
              <ul className="space-y-4 font-mono text-xs text-slate-500 uppercase">
                <li className="flex gap-4">
                  <span className="text-primary font-black">01</span>
                  <span>Uso obrigatório de óculos de proteção balística (ANSI Z87.1+).</span>
                </li>
                <li className="flex gap-4">
                  <span className="text-primary font-black">02</span>
                  <span>Respeito absoluto às ordens dos Staffs e Marechais de campo.</span>
                </li>
                <li className="flex gap-4">
                  <span className="text-primary font-black">03</span>
                  <span>Cronagem obrigatória antes do início da missão.</span>
                </li>
                <li className="flex gap-4">
                  <span className="text-primary font-black">04</span>
                  <span>Proibido qualquer tipo de contato físico hostil.</span>
                </li>
              </ul>
            </section>
          </div>

          {/* Checkout Card */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 bg-surface/80 border border-white/10 p-8 shadow-2xl">
              <h3 className="text-lg font-black text-white uppercase tracking-widest mb-8 text-center underline decoration-primary decoration-4 underline-offset-8">Reserva de Ticket</h3>
              
              {!isSoldOut ? (
                <>
                  <div className="mb-8">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 block">Quantidade de Operadores</label>
                    <div className="flex items-center justify-between border border-white/10 p-2">
                       <button 
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="size-10 flex items-center justify-center text-slate-500 hover:text-white transition-colors"
                       >
                         <span className="material-symbols-outlined">remove</span>
                       </button>
                       <span className="text-xl font-black text-white">{quantity}</span>
                       <button 
                        onClick={() => setQuantity(Math.min(event.capacity - event.sold_count, quantity + 1))}
                        className="size-10 flex items-center justify-center text-slate-500 hover:text-white transition-colors"
                       >
                         <span className="material-symbols-outlined">add</span>
                       </button>
                    </div>
                  </div>

                  <div className="space-y-3 mb-8">
                    <div className="flex justify-between text-[11px] font-mono uppercase text-slate-400">
                      <span>Inscrição individual</span>
                      <span>R$ {event.ticket_price.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-[11px] font-mono uppercase text-slate-400">
                      <span>Taxa de Operação</span>
                      <span>Incluso</span>
                    </div>
                    <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                      <span className="text-xs font-black text-white uppercase tracking-widest">Total</span>
                      <span className="text-2xl font-black text-primary">R$ {totalPrice.toFixed(2)}</span>
                    </div>
                  </div>

                  <button 
                    onClick={handlePurchase}
                    disabled={purchasing}
                    className="w-full bg-primary text-background-dark font-black py-4 text-[10px] uppercase tracking-[.4em] hover:bg-white transition-all mb-4 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {purchasing ? 'PROCESSANDO...' : 'ALISTAR AGORA'}
                  </button>
                  <p className="text-[9px] text-center text-slate-600 font-mono uppercase italic">
                    Pagamento seguro via Mercado Pago
                  </p>
                </>
              ) : (
                <div className="text-center py-12">
                   <span className="material-symbols-outlined text-red-500 text-5xl mb-4">cancel</span>
                   <h4 className="text-white font-black uppercase text-sm mb-2">Missão Esgotada</h4>
                   <p className="text-slate-500 text-[10px] font-mono uppercase">Não há mais vagas disponíveis para esta operação.</p>
                </div>
              )}

              <div className="mt-12 pt-12 border-t border-white/5">
                <div className="flex items-center gap-4 mb-4">
                  <div className="size-10 rounded-full bg-surface-light border border-white/10 flex items-center justify-center overflow-hidden">
                    <span className="material-symbols-outlined text-slate-500">person</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-600 font-black uppercase tracking-widest block">Organizador</span>
                    <span className="text-[11px] text-white font-black uppercase tracking-tighter">Command Center HQ</span>
                  </div>
                </div>
                <button className="w-full border border-white/10 text-white/50 font-black py-3 text-[9px] uppercase tracking-widest hover:text-white hover:border-white transition-all">
                  Contactar Organizador
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
