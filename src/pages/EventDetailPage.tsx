import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { SEO } from '../components/SEO';
import { supabase } from '../lib/supabase';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

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
}

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { user } = useAuth();

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [copying, setCopying] = useState(false);

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

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        if (profile?.role === 'admin') setIsAdmin(true);
      }
    } catch (err: any) {
      setError('Evento não encontrado.');
    } finally {
      setLoading(false);
    }
  };

  const copyOperatorLink = () => {
    if (!event) return;
    const url = `${window.location.origin}/eventos/${event.id}/checkin?token=${event.checkin_token}`;
    navigator.clipboard.writeText(url);
    setCopying(true);
    setTimeout(() => setCopying(false), 2000);
  };

  const handleBuyTicket = async () => {
    if (!event) return;

    // Exige login para comprar ingresso
    if (!user) {
      navigate(`/login?redirect=/eventos/${event.id}`);
      return;
    }

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
          unit_price: event.ticket_price,
        }
      );

      if (success) {
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
  const isSoldOut = event.status === 'closed' || spotsLeft <= 0;
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
              {isSoldOut ? '⛔ ESGOTADO' : occupancyPct >= 80 ? '⚡ ÚLTIMAS VAGAS' : '🟢 VAGAS DISPONÍVEIS'}
            </span>
            {event.location && (
              <span className="text-[9px] font-black px-2 py-1 bg-white/5 border border-white/10 text-white/50 uppercase tracking-widest">
                📍 {event.location}
              </span>
            )}
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter leading-none max-w-3xl">
            {event.title}
          </h1>
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
            <section className="grid sm:grid-cols-2 gap-6">
              <div className="bg-surface/30 p-6 border border-white/5">
                <span className="material-symbols-outlined text-primary mb-3 block">event</span>
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Data e Hora</h4>
                <p className="text-sm font-black text-white uppercase tracking-tighter">{dateStr}</p>
              </div>
              <div className="bg-surface/30 p-6 border border-white/5">
                <span className="material-symbols-outlined text-primary mb-3 block">pin_drop</span>
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Localização</h4>
                <p className="text-sm font-black text-white uppercase tracking-tighter">{event.location || '—'}</p>
              </div>
              <div className="bg-surface/30 p-6 border border-white/5">
                <span className="material-symbols-outlined text-primary mb-3 block">group</span>
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Capacidade</h4>
                <p className="text-sm font-black text-white uppercase tracking-tighter">
                  {event.sold_count} / {event.capacity} operadores
                </p>
              </div>
              <div className="bg-surface/30 p-6 border border-white/5">
                <span className="material-symbols-outlined text-primary mb-3 block">confirmation_number</span>
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Vagas Restantes</h4>
                <p className={`text-sm font-black uppercase tracking-tighter ${isSoldOut ? 'text-red-400' : 'text-primary'}`}>
                  {isSoldOut ? 'ESGOTADO' : `${spotsLeft} vagas`}
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

            {/* Regras */}
            <section>
              <h2 className="text-xl font-black text-white uppercase tracking-widest mb-6 border-l-4 border-primary pl-4">
                Regras de Engajamento
              </h2>
              <ul className="space-y-4 font-mono text-xs text-slate-500 uppercase">
                {[
                  'Uso obrigatório de óculos de proteção balística (ANSI Z87.1+).',
                  'Respeito absoluto às ordens dos Staffs e Marechais de campo.',
                  'Cronagem obrigatória antes do início da missão.',
                  'Proibido qualquer tipo de contato físico hostil.',
                ].map((rule, i) => (
                  <li key={i} className="flex gap-4">
                    <span className="text-primary font-black">0{i + 1}</span>
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {/* ── Checkout Card ── */}
          <div className="lg:col-span-1 space-y-8">
            
            {(user?.id === event.organizer_id || isAdmin) && (
              <div className="bg-primary/5 border-2 border-primary/30 p-8 shadow-[0_0_50px_rgba(251,191,36,0.1)] relative overflow-hidden group">
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 p-2 text-[7px] font-mono text-primary/40 uppercase tracking-widest">
                  Secure_Terminal_v1.0
                </div>
                <div className="absolute -right-4 -bottom-4 size-32 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-all"></div>
                
                <h3 className="text-lg font-black text-white uppercase tracking-[0.2em] mb-6 flex items-center gap-3 italic">
                  <span className="size-2 bg-primary animate-pulse"></span>
                  SETOR DE COMANDO
                </h3>

                <div className="space-y-4 relative z-10">
                  <Link
                    to={`/eventos/${event.id}/checkin`}
                    className="w-full bg-primary text-black font-black py-4 text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-white transition-all shadow-lg"
                  >
                    <span className="material-symbols-outlined">qr_code_scanner</span>
                    INICIAR SCANNER TÁTICO
                  </Link>

                  <button
                    onClick={copyOperatorLink}
                    className="w-full bg-white/5 border border-white/10 text-white font-black py-4 text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-white/10 transition-all group/btn"
                  >
                    <span className="material-symbols-outlined text-primary group-hover/btn:rotate-12 transition-transform">
                      {copying ? 'check_circle' : 'share'}
                    </span>
                    {copying ? 'TOKEN COPIADO!' : 'COMPARTILHAR COM OPERADOR'}
                  </button>

                  <Link
                    to={`/organizador/eventos/${event.id}`}
                    className="w-full border border-primary/50 text-primary font-black py-4 text-[10px] uppercase tracking-[.3em] flex items-center justify-center gap-3 hover:bg-primary hover:text-black transition-all"
                  >
                    <span className="material-symbols-outlined">edit_note</span>
                    EDITAR BRIEFING DA MISSÃO
                  </Link>

                  <p className="text-[8px] text-slate-500 font-mono uppercase leading-tight mt-2 text-center">
                    Link gera acesso direto ao terminal de validação <br/> para operadores de campo autorizados.
                  </p>
                </div>
              </div>
            )}

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
                    <div className="flex justify-between text-[11px] font-mono uppercase text-slate-400">
                      <span>Taxa de Operação</span>
                      <span>Incluso</span>
                    </div>
                    <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                      <span className="text-xs font-black text-white uppercase tracking-widest">Total</span>
                      <span className="text-2xl font-black text-primary">R$ {totalPrice.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* CTA */}
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
                  <p className="text-[9px] text-center text-slate-600 font-mono uppercase italic">
                    Pagamento seguro via PIX • Ingresso digital enviado por email
                  </p>

                  {!user && (
                    <p className="text-[9px] text-center text-primary/70 font-mono uppercase mt-3 border-t border-white/5 pt-3">
                      ⚠ Login necessário para comprar
                    </p>
                  )}
                </>
              ) : (
                <div className="text-center py-12">
                  <span className="material-symbols-outlined text-red-500 text-5xl mb-4 block">cancel</span>
                  <h4 className="text-white font-black uppercase text-sm mb-2">Missão Esgotada</h4>
                  <p className="text-slate-500 text-[10px] font-mono uppercase">
                    Não há mais vagas disponíveis para esta operação.
                  </p>
                </div>
              )}

              {/* Info do QR Code */}
              {!isSoldOut && (
                <div className="mt-6 pt-6 border-t border-white/5">
                  <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 p-4">
                    <span className="material-symbols-outlined text-primary text-xl">qr_code_2</span>
                    <div>
                      <p className="text-[9px] font-black text-white uppercase tracking-widest">Ingresso Digital</p>
                      <p className="text-[8px] text-slate-500 font-mono uppercase">
                        QR Code enviado por email após pagamento
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
