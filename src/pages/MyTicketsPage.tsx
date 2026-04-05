import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SEO } from '../components/SEO';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface Ticket {
  id: string;
  event_id: string;
  buyer_name: string;
  buyer_email: string;
  quantity: number;
  price_paid: number;
  status: 'pending' | 'confirmed' | 'used' | 'cancelled';
  qr_uuid: string;
  qr_code: string;
  checked_in_at: string | null;
  created_at: string;
  event: {
    id: string;
    title: string;
    event_date: string;
    location: string;
    image_url: string | null;
  };
}


export default function MyTicketsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  useEffect(() => {
    if (!user) { navigate('/login?redirect=/meus-ingressos'); return; }
    loadTickets();
  }, [user]);

  const loadTickets = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tickets')
      .select(`
        *,
        event:events(id, title, event_date, location, image_url)
      `)
      .eq('buyer_id', user!.id)
      .order('created_at', { ascending: false });

    if (!error && data) setTickets(data as Ticket[]);
    setLoading(false);
  };

  const statusConfig = {
    pending:   { label: 'AGUARDANDO PAGAMENTO', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20', icon: 'schedule' },
    confirmed: { label: 'INGRESSO VÁLIDO',       color: 'text-primary',    bg: 'bg-primary/10 border-primary/20',       icon: 'check_circle' },
    used:      { label: 'CHECK-IN REALIZADO',    color: 'text-slate-400',  bg: 'bg-white/5 border-white/10',           icon: 'task_alt' },
    cancelled: { label: 'CANCELADO',             color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/30',      icon: 'cancel' },
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-dark">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-dark pb-20 pt-12">
      <SEO title="Meus Ingressos | Perfection Airsoft" description="Seus ingressos digitais para eventos de airsoft." />

      <div className="max-w-4xl mx-auto px-6">
        {/* Header */}
        <div className="mb-12 border-l-4 border-primary pl-8 py-4 bg-surface/10">
          <span className="text-primary font-black uppercase tracking-[0.4em] text-[10px] block mb-2">
            CENTRAL DE INTELIGÊNCIA
          </span>
          <h1 className="text-4xl font-black text-white uppercase tracking-tighter">
            MEUS INGRESSOS
          </h1>
          <p className="text-slate-500 font-mono text-xs mt-2 uppercase tracking-widest">
            {tickets.length} ingresso{tickets.length !== 1 ? 's' : ''} encontrado{tickets.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Lista vazia */}
        {tickets.length === 0 && (
          <div className="text-center py-24 border border-white/5 bg-surface/10">
            <span className="material-symbols-outlined text-5xl text-white/10 mb-6 block">
              confirmation_number
            </span>
            <h3 className="text-white font-black uppercase text-sm mb-2">Nenhum ingresso encontrado</h3>
            <p className="text-slate-500 font-mono text-[10px] uppercase mb-8">
              Você ainda não comprou ingressos para nenhuma missão.
            </p>
            <Link
              to="/eventos"
              className="bg-primary text-black font-black px-10 py-4 text-[10px] uppercase tracking-widest hover:bg-white transition-all"
            >
              Ver Missões Disponíveis
            </Link>
          </div>
        )}

        {/* Grid de tickets */}
        <div className="space-y-6">
          {tickets.map((ticket) => {
            const cfg = statusConfig[ticket.status];
            const eventDate = new Date(ticket.event?.event_date).toLocaleDateString('pt-BR', {
              weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
            });

            return (
              <div
                key={ticket.id}
                className="bg-surface/30 border border-white/5 overflow-hidden hover:border-white/10 transition-all"
              >
                <div className="flex flex-col sm:flex-row">
                  {/* Imagem do evento */}
                  <div className="sm:w-40 h-32 sm:h-auto flex-shrink-0 bg-black/30 relative overflow-hidden">
                    {ticket.event?.image_url ? (
                      <img
                        src={ticket.event.image_url}
                        alt={ticket.event?.title}
                        className="w-full h-full object-cover opacity-70"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-4xl text-primary/20">
                          sports_esports
                        </span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent to-surface/80" />
                  </div>

                  {/* Info do ticket */}
                  <div className="flex-1 p-6">
                    <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                      <div>
                        <h3 className="text-lg font-black text-white uppercase tracking-tight">
                          {ticket.event?.title || 'Evento'}
                        </h3>
                        <p className="text-slate-500 text-[10px] font-mono uppercase mt-1">
                          {eventDate}
                        </p>
                      </div>
                      <div className={`flex items-center gap-2 px-3 py-1.5 border text-[9px] font-black uppercase tracking-widest ${cfg.bg} ${cfg.color}`}>
                        <span className="material-symbols-outlined text-sm">{cfg.icon}</span>
                        {cfg.label}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                      <div>
                        <p className="text-[8px] text-slate-600 font-black uppercase tracking-widest mb-1">Local</p>
                        <p className="text-xs text-white font-mono">{ticket.event?.location || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[8px] text-slate-600 font-black uppercase tracking-widest mb-1">Qtd</p>
                        <p className="text-xs text-white font-mono">{ticket.quantity}x</p>
                      </div>
                      <div>
                        <p className="text-[8px] text-slate-600 font-black uppercase tracking-widest mb-1">Valor Pago</p>
                        <p className="text-xs text-primary font-black">
                          R$ {(ticket.price_paid * ticket.quantity).toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[8px] text-slate-600 font-black uppercase tracking-widest mb-1">ID</p>
                        <p className="text-xs text-white/40 font-mono truncate">{ticket.id.slice(0, 8)}...</p>
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="flex flex-wrap gap-3">
                      {ticket.status === 'confirmed' && (
                        <button
                          onClick={() => setSelectedTicket(ticket)}
                          className="flex items-center gap-2 bg-primary text-black font-black px-6 py-2.5 text-[9px] uppercase tracking-widest hover:bg-white transition-all"
                        >
                          <span className="material-symbols-outlined text-sm">badge</span>
                          Ver Tag de Operador
                        </button>
                      )}
                      {ticket.status === 'used' && (
                        <div className="flex items-center gap-2 text-slate-500 font-mono text-[9px] uppercase">
                          <span className="material-symbols-outlined text-sm">task_alt</span>
                          Check-in em {ticket.checked_in_at
                            ? new Date(ticket.checked_in_at).toLocaleDateString('pt-BR')
                            : 'data não disponível'}
                        </div>
                      )}
                      <Link
                        to={`/eventos/${ticket.event_id}`}
                        className="flex items-center gap-2 border border-white/10 text-white/40 hover:text-white font-black px-6 py-2.5 text-[9px] uppercase tracking-widest hover:border-white/20 transition-all"
                      >
                        <span className="material-symbols-outlined text-sm">open_in_new</span>
                        Ver Evento
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Modal Tag de Operador ── */}
      {selectedTicket && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
          onClick={() => setSelectedTicket(null)}
        >
          <div
            className="bg-background-dark border border-primary/30 shadow-[0_0_60px_rgba(255,193,7,0.1)] max-w-sm w-full p-8 relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            id="operator-tag"
          >
            {/* Elementos Decorativos Táticos */}
            <div className="absolute top-0 left-0 w-full h-1 bg-primary shadow-[0_0_10px_rgba(251,191,36,0.5)]"></div>
            <div className="absolute top-0 right-0 p-1 bg-primary text-black text-[7px] font-black uppercase rotate-45 translate-x-3 -translate-y-1 w-20 text-center shadow-lg">
               AUTORIZADO
            </div>

            {/* Fechar */}
            <button
              onClick={() => setSelectedTicket(null)}
              className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors print:hidden"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            {/* Header */}
            <div className="text-center mb-8 pt-4">
              <p className="text-primary font-black text-[9px] uppercase tracking-[0.4em] mb-2 flex items-center justify-center gap-2">
                <span className="h-px w-4 bg-primary/30"></span>
                TAG DE OPERADOR
                <span className="h-px w-4 bg-primary/30"></span>
              </p>
              <h3 className="text-white font-black uppercase tracking-tighter text-2xl italic leading-none">
                {selectedTicket.event?.title}
              </h3>
              <div className="h-px w-20 bg-primary/20 mx-auto mt-4"></div>
            </div>

            {/* Grid Principal (Estilo Crachá) */}
            <div className="space-y-6">
              <div className="bg-white/5 border border-white/5 p-4 rounded-sm text-center">
                 <p className="text-[8px] text-slate-600 font-black uppercase tracking-widest mb-1">IDENTIFICACÃO DO OPERADOR</p>
                 <p className="text-xl text-white font-black uppercase italic tracking-tight">{selectedTicket.buyer_name}</p>
                 <p className="text-[10px] text-primary/60 font-mono mt-1 lowercase">{selectedTicket.buyer_email}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 border border-white/5 p-4 text-center">
                   <p className="text-[8px] text-slate-600 font-black uppercase tracking-widest mb-1">ID DA MISSÃO</p>
                   <p className="text-xs text-white font-mono font-bold">#{selectedTicket.qr_uuid.slice(0, 8).toUpperCase()}</p>
                </div>
                <div className="bg-white/5 border border-white/5 p-4 text-center">
                   <p className="text-[8px] text-slate-600 font-black uppercase tracking-widest mb-1">LOCAL OPERAÇÃO</p>
                   <p className="text-[10px] text-white font-black uppercase truncate">{selectedTicket.event?.location || 'LZ'}</p>
                </div>
              </div>

              <div className="bg-primary/10 border border-primary/20 p-4 flex items-center justify-between">
                <div>
                   <p className="text-[8px] text-primary/60 font-black uppercase tracking-widest">STATUS TÁTICO</p>
                   <p className="text-sm text-primary font-black uppercase italic tracking-tighter">CONFIRMADO</p>
                </div>
                <span className="material-symbols-outlined text-primary text-3xl font-black">verified</span>
              </div>
            </div>

            {/* Disclaimer */}
            <div className="mt-8 text-center">
               <p className="text-[9px] text-slate-600 font-mono uppercase leading-relaxed">
                  ESTA TAG É SUA IDENTIFICAÇÃO OFICIAL NO CAMPO.<br/>
                  APRESENTE JUNTO COM UM DOCUMENTO COM FOTO.
               </p>
            </div>

            {/* Botão de Impressão */}
            <button 
              onClick={() => window.print()}
              className="w-full mt-8 bg-white/5 border border-white/10 text-white/50 hover:text-white font-black py-4 text-[10px] uppercase tracking-widest transition-all hover:bg-white/10 flex items-center justify-center gap-2 print:hidden"
            >
              <span className="material-symbols-outlined text-sm">print</span>
              IMPRIMIR TAG PARA O CAMPO
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
