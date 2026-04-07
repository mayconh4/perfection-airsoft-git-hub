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

function EventCard({ event, rating }: { event: Event, rating?: { avg: number, count: number } }) {
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
        <h3 className="text-sm font-black text-white uppercase tracking-widest mb-2 leading-tight group-hover:text-primary transition-colors line-clamp-1">
          {event.title}
        </h3>

        {/* Tactical Reputation (Stars) */}
        {(rating || event.status === 'closed') && (
          <div className="flex items-center gap-2 mb-3 animate-in fade-in slide-in-from-left-2 duration-700">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <span key={star} className={`material-symbols-outlined text-[14px] ${star <= Math.round((rating?.avg || 10) / 2) ? 'text-primary' : 'text-white/10'}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                  star
                </span>
              ))}
            </div>
            <div className="border border-primary/30 px-2 py-0.5 bg-primary/5 rounded-sm flex items-center gap-2">
              <span className="text-[10px] font-black text-primary">{(rating?.avg || 10).toFixed(1)}</span>
              <span className="text-[7px] text-primary/70 uppercase font-bold tracking-tighter">Missão de Elite</span>
            </div>
          </div>
        )}

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
              <Link 
                to={`/eventos/${event.id}`}
                className="bg-white/5 border border-white/10 text-white/50 hover:text-primary hover:border-primary/40 p-3 flex items-center justify-center transition-all"
                title="Ver briefing da missão"
              >
                <span className="material-symbols-outlined text-sm text-[16px]">visibility</span>
              </Link>
              
              {user?.id === event.organizer_id && (
                <Link 
                  to={`/organizador?event=${event.id}`}
                  className="bg-white/5 border border-white/10 text-white/50 hover:text-primary hover:border-primary/40 p-3 flex items-center justify-center transition-all group/edit"
                  title="Gerenciar Missão"
                >
                  <span className="material-symbols-outlined text-sm text-[16px] group-hover/edit:rotate-45 transition-transform">settings</span>
                </Link>
              )}
              
              <Link 
                to={`/eventos/${event.id}`}
                className="flex-1 bg-primary text-background-dark font-black py-3 text-[9px] uppercase tracking-widest hover:bg-white transition-all text-center flex items-center justify-center gap-2"
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
  const [ratings, setRatings] = useState<Record<string, { avg: number; count: number }>>({});
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
        // Buscar avaliações para os eventos carregados
        const eventIds = data.map(e => e.id);
        if (eventIds.length > 0) {
          const { data: reviews } = await supabase
            .from('event_reviews')
            .select('event_id, rating')
            .in('event_id', eventIds);
          
          if (reviews) {
            const mapping = reviews.reduce((acc: any, review: any) => {
              if (!acc[review.event_id]) acc[review.event_id] = { sum: 0, count: 0 };
              acc[review.event_id].sum += review.rating;
              acc[review.event_id].count += 1;
              return acc;
            }, {});

            const finalMapping: any = {};
            Object.keys(mapping).forEach(id => {
              finalMapping[id] = {
                avg: mapping[id].sum / mapping[id].count,
                count: mapping[id].count
              };
            });
            setRatings(finalMapping);
          }
        }
      }
    } catch {
      // Falha na conexão
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-20 bg-background-dark pt-20 px-6 relative overflow-hidden crt-overlay">
      <div className="scanline"></div>
      <SEO 
        title="Eventos & Missões | Perfection Airsoft" 
        description="Encontre e compre tickets para as melhores missões e torneios de airsoft da região."
      />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Simplified Hero Section */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-20">
          <div>
            <h1 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tighter italic">
              TACTICAL <span className="text-primary italic">MISSÕES</span>
            </h1>
            <p className="text-[10px] text-slate-500 font-mono uppercase tracking-[0.3em] mt-2">
              Central Operations // Active Missions
            </p>
          </div>
          <div className="flex flex-wrap gap-4">
            <Link 
              to="/eventos/criar"
              className="bg-primary text-background-dark font-black py-4 px-8 text-[10px] uppercase tracking-widest hover:bg-white transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">rocket_launch</span>
              Criar Nova Missão
            </Link>
          </div>
        </div>

        {/* Section Header */}
        <div className="flex items-center gap-4 mb-8">
          <span className="h-px w-8 bg-primary"></span>
          <h2 className="text-sm font-black text-white uppercase tracking-[0.3em] italic">Active Missions</h2>
        </div>

        {/* Event Grid - Clean layout without sidebar */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1,2,3].map(i => (
              <div key={i} className="h-96 bg-surface/30 animate-pulse border border-white/5" />
            ))}
          </div>
        ) : events.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {events.map(event => (
              <EventCard key={event.id} event={event} rating={ratings[event.id]} />
            ))}
          </div>
        ) : (
          <div className="text-center py-24 border border-dashed border-white/5">
            <span className="material-symbols-outlined text-6xl text-white/10 block mb-4">event_busy</span>
            <p className="text-slate-500 font-mono text-[10px] uppercase tracking-widest italic">Nenhuma missão ativa detectada nesta zona.</p>
          </div>
        )}
      </div>
    </div>
  );
}
