import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { SEO } from '../components/SEO';
import { supabase } from '../lib/supabase';
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
}

// Tabela de Eventos original removida em favor do Supabase

const FILTERS = ['Todos', 'Esta Semana', 'Este Mês', 'Esgotados'];

function getTimeUntil(dateStr: string) {
  const now = new Date();
  const event = new Date(dateStr);
  const diff = event.getTime() - now.getTime();
  if (diff < 0) return 'Encerrado';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Hoje';
  if (days === 1) return 'Amanhã';
  return `Em ${days} dias`;
}

function EventCard({ event }: { event: Event }) {
  const { user } = useAuth();
  const availableSlots = event.capacity - event.sold_count;
  const occupancyPercent = (event.sold_count / event.capacity) * 100;
  const isSoldOut = event.status === 'closed' || availableSlots === 0;
  const dateStr = new Date(event.event_date).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  return (
    <div className={`group relative border transition-all duration-300 overflow-hidden flex flex-col ${isSoldOut ? 'border-white/5 opacity-60' : 'border-white/10 hover:border-primary/40 hover:shadow-[0_0_30px_rgba(255,193,7,0.1)]'}`}>
      
      {/* Card Image / Cover */}
      <div className="relative h-44 bg-gradient-to-br from-surface to-black flex items-center justify-center overflow-hidden">
        {event.image_url ? (
          <img src={event.image_url} alt={event.title} className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 select-none">
            <span className="material-symbols-outlined text-5xl text-white/10">military_tech</span>
            <div className="absolute inset-0 bg-gradient-to-t from-background-dark/80 to-transparent" />
          </div>
        )}
        
        {/* Status Badge */}
        <div className="absolute top-4 left-4 z-10">
          {isSoldOut ? (
            <span className="bg-red-900/80 border border-red-500/30 text-red-400 text-[9px] font-black uppercase tracking-widest px-3 py-1">ESGOTADO</span>
          ) : (
            <span className="bg-green-900/80 border border-green-500/30 text-green-400 text-[9px] font-black uppercase tracking-widest px-3 py-1 flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-green-400 animate-pulse" />
              VAGAS DISPONÍVEIS
            </span>
          )}
        </div>

        {/* Countdown */}
        <div className="absolute top-4 right-4 z-10">
          <span className="bg-black/70 border border-white/10 text-primary text-[9px] font-black uppercase tracking-widest px-3 py-1">
            {getTimeUntil(event.event_date)}
          </span>
        </div>
      </div>

      {/* Card Body */}
      <div className="flex flex-col flex-1 p-6 bg-surface/40">
        <h3 className="text-sm font-black text-white uppercase tracking-widest mb-3 leading-tight group-hover:text-primary transition-colors line-clamp-1">
          {event.title}
        </h3>

        <p className="text-[10px] text-slate-500 font-mono leading-relaxed mb-4 line-clamp-2 flex-1">
          {event.description}
        </p>

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-[9px] text-slate-500 font-mono uppercase tracking-widest">
            <span className="material-symbols-outlined text-sm text-primary/60">location_on</span>
            <span className="truncate">{event.location}</span>
          </div>
          <div className="flex items-center gap-2 text-[9px] text-slate-500 font-mono uppercase tracking-widest">
            <span className="material-symbols-outlined text-sm text-primary/60">calendar_month</span>
            <span>{dateStr}</span>
          </div>
        </div>

        {/* Occupancy Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">
            <span>{event.sold_count}/{event.capacity} operadores</span>
            <span>{availableSlots > 0 ? `${availableSlots} vagas` : 'Esgotado'}</span>
          </div>
          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${occupancyPercent >= 90 ? 'bg-red-500' : occupancyPercent >= 60 ? 'bg-yellow-500' : 'bg-green-500'}`}
              style={{ width: `${occupancyPercent}%` }}
            />
          </div>
        </div>

        {/* Price + CTA */}
        <div className="flex items-center justify-between gap-4 mt-auto">
          <div>
            <span className="text-[8px] text-slate-600 font-black uppercase tracking-widest block">Valor</span>
            <span className="text-xl font-black text-white">
              R$ {event.ticket_price.toFixed(2)}
            </span>
          </div>

          {isSoldOut ? (
            <button disabled className="flex-1 bg-white/5 text-slate-600 font-black py-3 text-[9px] uppercase tracking-widest cursor-not-allowed">
              ESGOTADO
            </button>
          ) : (
            <div className="flex-1 flex gap-2">
              {user?.id === event.organizer_id && (
                <Link 
                  to={`/organizador/eventos/${event.id}`}
                  className="bg-white/5 border border-white/10 text-white/50 hover:text-primary hover:border-primary/40 p-3 flex items-center justify-center transition-all group/edit"
                  title="Editar Missão"
                >
                  <span className="material-symbols-outlined text-sm group-hover/edit:rotate-45 transition-transform">settings</span>
                </Link>
              )}
              <Link 
                to={`/eventos/${event.id}`}
                className="flex-1 bg-primary text-background-dark font-black py-3 text-[9px] uppercase tracking-widest hover:bg-white transition-all text-center"
              >
                COMPRAR TICKET
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [activeFilter, setActiveFilter] = useState('Todos');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    loadEvents();
  }, []);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('status', 'published')
        .order('event_date', { ascending: true });
      
      if (!error && data) {
        setEvents(data);
      }
    } catch {
      // Falha na conexão
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = events.filter(e => {
    if (activeFilter === 'Todos') return true;
    if (activeFilter === 'Esgotados') return e.status === 'closed' || e.sold_count >= e.capacity;
    const now = new Date();
    const eventDate = new Date(e.event_date);
    if (activeFilter === 'Esta Semana') {
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() + 7);
      return eventDate >= now && eventDate <= weekEnd;
    }
    if (activeFilter === 'Este Mês') {
      return eventDate.getMonth() === now.getMonth() && eventDate.getFullYear() === now.getFullYear();
    }
    return true;
  });

  const publishedCount = events.filter(e => e.status === 'published').length;
  const totalSold = events.reduce((sum, e) => sum + e.sold_count, 0);

  return (
    <div className="min-h-screen pb-20 bg-background-dark">
      <SEO 
        title="Eventos & Missões | Perfection Airsoft" 
        description="Encontre e compre tickets para as melhores missões e torneios de airsoft da região."
      />

      {/* Hero Section */}
      <div className="relative bg-surface/20 border-b border-white/5 pt-8 pb-16 overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-primary/20 rounded-full" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border border-primary/20 rounded-full" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] border border-primary/30 rounded-full animate-pulse" />
        </div>

        <div className="relative max-w-6xl mx-auto px-6">
          <div className="flex items-center gap-4 mb-6">
            <span className="h-px w-12 bg-primary"></span>
            <span className="text-primary font-black uppercase tracking-[0.4em] text-xs">Centro de Operações</span>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter mb-6 leading-none">
                Missões &<br /> <span className="text-primary">Eventos</span>
              </h1>
              <p className="text-slate-500 text-sm font-mono leading-relaxed mb-10 max-w-md">
                Encontre, compre e participe das melhores operações de airsoft da região. Tickets com QR Code direto no seu dashboard.
              </p>
              
              <div className="flex gap-8">
                <div>
                  <span className="text-3xl font-black text-white">{publishedCount}</span>
                  <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest block mt-1">Missões Ativas</span>
                </div>
                <div className="w-px bg-white/10"></div>
                <div>
                  <span className="text-3xl font-black text-white">{totalSold}</span>
                  <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest block mt-1">Tickets Vendidos</span>
                </div>
                <div className="w-px bg-white/10"></div>
                <div>
                  <span className="text-3xl font-black text-white">SP</span>
                  <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest block mt-1">Região de Atuação</span>
                </div>
              </div>
            </div>

            {/* Organizer CTA */}
            <div className="bg-primary/5 border border-primary/20 p-8 hidden lg:block">
              <span className="material-symbols-outlined text-3xl text-primary mb-4 block">add_circle</span>
              <h3 className="text-lg font-black text-white uppercase tracking-widest mb-3">Você organiza eventos?</h3>
              <p className="text-[11px] text-slate-400 font-mono leading-relaxed mb-6 uppercase">
                Publique sua missão, gerencie as inscrições e receba os pagamentos direto na sua conta.
              </p>
              <Link 
                to="/organizador"
                className="bg-primary text-background-dark font-black py-4 px-8 text-[10px] uppercase tracking-[0.3em] inline-block hover:bg-white transition-colors"
              >
                Criar Missão
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Filter + Events Grid */}
      <div className="max-w-6xl mx-auto px-6 pt-12">
        {/* Filters */}
        <div className="flex items-center gap-4 mb-10 flex-wrap">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`text-[9px] font-black uppercase tracking-widest px-5 py-2.5 border transition-all ${activeFilter === f ? 'bg-primary text-black border-primary' : 'bg-transparent text-slate-500 border-white/10 hover:border-primary/40 hover:text-primary'}`}
            >
              {f}
            </button>
          ))}
          <span className="ml-auto text-[9px] text-slate-600 font-mono uppercase tracking-widest">
            {filteredEvents.length} missão(ões) encontrada(s)
          </span>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3].map(i => (
              <div key={i} className="h-96 bg-surface/30 animate-pulse border border-white/5" />
            ))}
          </div>
        ) : filteredEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map(event => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <div className="text-center py-24">
            <span className="material-symbols-outlined text-6xl text-white/10 block mb-4">event_busy</span>
            <p className="text-slate-500 font-mono text-xs uppercase tracking-widest">Nenhuma missão encontrada para este filtro.</p>
          </div>
        )}

        {/* Mobile CTA Organizer */}
        <div className="mt-16 p-8 border border-dashed border-primary/20 text-center lg:hidden">
          <h3 className="text-sm font-black text-white uppercase tracking-widest mb-3">Você organiza eventos?</h3>
          <Link 
            to="/organizador"
            className="bg-primary text-background-dark font-black py-4 px-10 text-[10px] uppercase tracking-[0.3em] inline-block hover:bg-white transition-colors"
          >
            Criar Missão
          </Link>
        </div>
      </div>
    </div>
  );
}
