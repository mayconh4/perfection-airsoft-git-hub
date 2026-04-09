import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { SEO } from '../components/SEO';
import { supabase } from '../lib/supabase';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { gerarLinkWhatsApp, getPublicMissionLink } from '../utils/sharing';
import { MISSION_TYPES, GAME_MODES } from '../data/missionCatalog';

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
  checkin_token: string | null;
  engagement_rules: string[] | null;
  mission_type: string | null;
  game_mode: string | null;
}

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addItem } = useCart();
  useAuth();

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [organizerName, setOrganizerName] = useState<string>('Perfection Operator');

  useEffect(() => {
    window.scrollTo(0, 0);
    loadEvent();
  }, [id]);

  const loadEvent = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setEvent(data);

      // Busca média de avaliações
      const { data: reviews } = await supabase
        .from('event_reviews')
        .select('rating')
        .eq('event_id', id);
      
      if (reviews && reviews.length > 0) {
        const avg = reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length;
        setAvgRating(avg);
      }

      // Busca Perfil do Organizador para o compartilhamento
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', data.organizer_id)
        .single();
      
      if (profile) {
        setOrganizerName(profile.full_name || profile.email?.split('@')[0] || 'Perfection Operator');
      }
    } catch (err: any) {
      setError('Evento não encontrado.');
    } finally {
      setLoading(false);
    }
  };


  const handleBuyTicket = async () => {
    if (!event) return;

    setAdding(true);
    setError(null);

    try {
      // Monta item de ingresso como produto virtual
      // O CartContext já suporta esse padrão (mesmo fluxo das rifas)
      const ticketProductId = `ticket_${event.id}`;

      const success = await addItem(
        ticketProductId,
        quantity,
        {
          type: 'ticket',               // flag para checkout detectar
          event_id: event.id,
          event_title: event.title,
          event_date: event.event_date,
          event_location: event.location,
          event_image: event.image_url, // inteligência de imagem preservada
          unit_price: event.ticket_price,
        }
      );

      if (success) {
        // Redireciona direto para o checkout como convidado
        navigate('/checkout');
      } else {
        setError('Não foi possível adicionar o ingresso. Tente novamente.');
      }
    } catch (err: any) {
      setError('Erro ao adicionar ingresso: ' + err.message);
    } finally {
      setAdding(false);
    }
  };

  // ─── Loading ─────────────────────────────────────────────────────────────

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

  // ─── Derived State ────────────────────────────────────────────────────────

  const spotsLeft = event.capacity - event.sold_count;
  const isPast = new Date(event.event_date) < new Date();
  const isSoldOut = event.status === 'closed' || spotsLeft <= 0 || isPast;
  const totalPrice = event.ticket_price * quantity;
  const occupancyPct = Math.min(100, Math.round((event.sold_count / event.capacity) * 100));
  const dateStr = new Date(event.event_date).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  // QR Code URL (via api — sem dependência de biblioteca)
  // const qrUrl = (uuid: string) =>
  //   `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${uuid}&format=png`;

  return (
    <div className="min-h-screen bg-background-dark pb-20">
      <SEO
        title={`${event.title} | Perfection Airsoft`}
        description={event.description}
        image={event.image_url || undefined}
      />

      {/* ── Hero ── */}
      <div className="relative h-[40vh] md:h-[50vh] flex items-end overflow-hidden border-b border-white/5">
        {event.image_url ? (
          <img src={event.image_url} alt={event.title} className="absolute inset-0 w-full h-full object-cover opacity-40" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-black to-black" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-background-dark/60 to-transparent" />

        <div className="relative max-w-6xl mx-auto px-6 pb-12 w-full">
          <Link to="/eventos" className="inline-flex items-center gap-2 text-primary font-black text-[9px] uppercase tracking-widest mb-6 hover:text-white transition-colors">
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Central de Missões
          </Link>
          <div className="flex flex-wrap gap-2 items-center mb-3">
            <span className={`text-[9px] font-black px-2 py-1 uppercase tracking-widest ${
              isSoldOut ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
              occupancyPct >= 80 ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
              'bg-primary/20 text-primary border border-primary/30'
            }`}>
              {isSoldOut ? '⛔ VAGAS ENCERRADAS' : occupancyPct >= 80 ? '⚡ ÚLTIMAS VAGAS' : '🟢 VAGAS DISPONÍVEIS'}
            </span>
            {event.location && (
              <span className="text-[9px] font-black px-2 py-1 bg-white/5 border border-white/10 text-white/50 uppercase tracking-widest">
                📍 {event.location}
              </span>
            )}

            {/* Novas Categorias */}
            {event.mission_type && (
              <Link 
                to={`/blog/modalidades/${MISSION_TYPES.find(t => t.id === event.mission_type)?.slug}`}
                className="text-[9px] font-black px-2 py-1 bg-primary/10 border border-primary/20 text-primary uppercase tracking-widest hover:bg-primary hover:text-black transition-all flex items-center gap-1.5 group"
              >
                <span className="material-symbols-outlined text-[12px]">military_tech</span>
                {MISSION_TYPES.find(t => t.id === event.mission_type)?.label}
              </Link>
            )}
            {event.game_mode && (
              <Link 
                to={`/blog/modos/${GAME_MODES.find(m => m.id === event.game_mode)?.slug}`}
                className="text-[9px] font-black px-2 py-1 bg-white/5 border border-white/10 text-white hover:border-primary/40 transition-all flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[12px]">security</span>
                {GAME_MODES.find(m => m.id === event.game_mode)?.label}
              </Link>
            )}
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter leading-none max-w-3xl mb-4">
            {event.title}
          </h1>

          {/* Sistema de Estrelas (0-10) */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => {
                const isFilled = avgRating ? Math.round(avgRating) >= star : false;
                return (
                  <span key={star} className={`material-symbols-outlined text-primary text-lg select-none ${isFilled ? 'fill-1' : ''}`} style={{ fontVariationSettings: `'FILL' ${isFilled ? 1 : 0}` }}>
                    {isFilled ? 'star' : 'star_outline'}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="max-w-6xl mx-auto px-6 pt-12">
        <div className="grid lg:grid-cols-3 gap-12">

          {/* ── Coluna principal ── */}
          <div className="lg:col-span-2 space-y-12">

            {/* Briefing */}
            <section>
              <h2 className="text-xl font-black text-white uppercase tracking-widest mb-6 border-l-4 border-primary pl-4">
                Briefing da Missão
              </h2>
              <p className="text-slate-400 font-mono text-sm leading-relaxed whitespace-pre-line">
                {event.description}
              </p>
            </section>

            {/* Info Grid */}
            <section className="grid grid-cols-2 gap-3 md:gap-6">
              <div className="bg-surface/30 p-4 md:p-6 border border-white/5">
                <span className="material-symbols-outlined text-primary mb-2 md:mb-3 block text-xl">event</span>
                <h4 className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 md:mb-2 text-wrap">Data e Hora</h4>
                <p className="text-[11px] md:text-sm font-black text-white uppercase tracking-tighter">{dateStr}</p>
              </div>
              <div className="bg-surface/30 p-4 md:p-6 border border-white/5">
                <span className="material-symbols-outlined text-primary mb-2 md:mb-3 block text-xl">pin_drop</span>
                <h4 className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 md:mb-2 text-wrap">Localização</h4>
                <p className="text-[11px] md:text-sm font-black text-white uppercase tracking-tighter">{event.location || '—'}</p>
              </div>
              <div className="bg-surface/30 p-4 md:p-6 border border-white/5">
                <span className="material-symbols-outlined text-primary mb-2 md:mb-3 block text-xl">group</span>
                <h4 className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 md:mb-2 text-wrap">Capacidade</h4>
                <p className="text-[11px] md:text-sm font-black text-white uppercase tracking-tighter text-wrap">
                  {event.sold_count} / {event.capacity} ops
                </p>
              </div>
              <div className="bg-surface/30 p-4 md:p-6 border border-white/5">
                <span className="material-symbols-outlined text-primary mb-2 md:mb-3 block text-xl">confirmation_number</span>
                <h4 className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 md:mb-2 text-wrap">Vagas</h4>
                <p className={`text-[11px] md:text-sm font-black uppercase tracking-tighter ${isSoldOut ? 'text-red-400' : 'text-primary'}`}>
                  {isSoldOut ? 'ENCERRADO' : `${spotsLeft} vagas`}
                </p>
              </div>
            </section>

            {/* Barra de ocupação */}
            <section>
              <div className="flex justify-between text-[9px] font-black uppercase tracking-widest mb-2">
                <span className="text-slate-500 font-mono">Ocupação</span>
                <span className={`font-mono ${occupancyPct >= 80 ? 'text-orange-400' : 'text-primary'}`}>
                  {occupancyPct}%
                </span>
              </div>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                <div
                  className={`h-full transition-all duration-1000 ${occupancyPct >= 80 ? 'bg-orange-400' : 'bg-primary'}`}
                  style={{ width: `${occupancyPct}%` }}
                />
              </div>
            </section>

            {/* Regras de Engajamento (Dinâmico) */}
            {(event.engagement_rules && event.engagement_rules.length > 0) && (
              <section className="animate-in fade-in slide-in-from-bottom duration-1000">
                <div className="flex items-center gap-4 mb-8">
                   <div className="w-1.5 h-8 bg-primary"></div>
                   <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic">
                     REGRAS DE ENGAJAMENTO
                   </h2>
                </div>
                
                <div className="space-y-6">
                  {event.engagement_rules.map((rule, i) => (
                    <div key={i} className="flex gap-6 group">
                      <span className="text-primary font-black text-lg italic tracking-tighter opacity-60 group-hover:opacity-100 transition-opacity">
                        {(i + 1).toString().padStart(2, '0')}
                      </span>
                      <p className="text-white font-black text-sm uppercase tracking-widest leading-relaxed pt-1">
                        {rule}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* ── Checkout Card ── */}
          <div className="lg:col-span-1 space-y-8">
            

            <div className="sticky top-24 bg-surface/80 border border-white/10 p-8 shadow-2xl">
              <h3 className="text-lg font-black text-white uppercase tracking-widest mb-8 text-center underline decoration-primary decoration-4 underline-offset-8">
                Reserva de Ticket
              </h3>

              {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-widest">
                  {error}
                </div>
              )}

              {!isSoldOut ? (
                <>
                  {/* Seletor de quantidade */}
                  <div className="mb-8">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 block">
                      Quantidade de Ingressos
                    </label>
                    <div className="flex items-center justify-between border border-white/10 p-2">
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="size-10 flex items-center justify-center text-slate-500 hover:text-white transition-colors"
                      >
                        <span className="material-symbols-outlined">remove</span>
                      </button>
                      <span className="text-xl font-black text-white">{quantity}</span>
                      <button
                        onClick={() => setQuantity(Math.min(spotsLeft, Math.min(5, quantity + 1)))}
                        className="size-10 flex items-center justify-center text-slate-500 hover:text-white transition-colors"
                      >
                        <span className="material-symbols-outlined">add</span>
                      </button>
                    </div>
                    <p className="text-[9px] text-slate-600 font-mono uppercase mt-2">
                      Máximo: 5 por CPF
                    </p>
                  </div>

                  {/* Resumo de preço */}
                  <div className="space-y-3 mb-8">
                    <div className="flex justify-between text-[11px] font-mono uppercase text-slate-400">
                      <span>{quantity}x Ingresso</span>
                      <span>R$ {event.ticket_price.toFixed(2)}</span>
                    </div>
                    <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                      <span className="text-xs font-black text-white uppercase tracking-widest">Total</span>
                      <span className="text-2xl font-black text-primary">R$ {totalPrice.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Botão de Compartilhar (Verde) - Prioridade de Engajamento */}
                  <button
                    onClick={() => {
                      if (!event) return;
                      const link = getPublicMissionLink(event.id);
                      const whatsappUrl = gerarLinkWhatsApp({
                        nome: event.title,
                        organizacao: organizerName,
                        data: new Date(event.event_date).toLocaleDateString('pt-BR'),
                         // @ts-ignore - Horário formatado para 00:00
                        horario: new Date(event.event_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                        local: event.location,
                        valor: `R$ ${event.ticket_price.toFixed(2)}`,
                        link: link
                      });
                      window.open(whatsappUrl, '_blank');
                    }}
                    className="w-full bg-green-500/10 border border-green-500/20 text-green-500 font-black py-4 text-[10px] uppercase tracking-[0.2em] hover:bg-green-500 hover:text-black transition-all flex items-center justify-center gap-2 group mb-4"
                  >
                    <span className="material-symbols-outlined text-sm group-hover:rotate-12 transition-transform">share</span>
                    Compartilhar no WhatsApp
                  </button>

                  {/* CTA Compra (Amarelo) */}
                  <button
                    onClick={handleBuyTicket}
                    disabled={adding}
                    className="w-full bg-primary text-background-dark font-black py-4 text-[10px] uppercase tracking-[.4em] hover:bg-white transition-all mb-4 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {adding ? (
                      <>
                        <div className="size-3 border-2 border-black border-t-transparent animate-spin rounded-full" />
                        PROCESSANDO...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-sm">confirmation_number</span>
                        ALISTAR AGORA
                      </>
                    )}
                  </button>
                </>
              ) : (
                <div className="text-center py-12">
                  <span className="material-symbols-outlined text-red-500 text-5xl mb-4 block">cancel</span>
                  <h4 className="text-white font-black uppercase text-sm mb-2">MISSÃO CONCLUÍDA</h4>
                  <p className="text-slate-500 text-[10px] font-mono uppercase">
                    As inscrições para esta operação foram finalizadas.
                  </p>
                </div>
              )}

              {/* Info do QR Code removida conforme solicitação do usuário */}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
