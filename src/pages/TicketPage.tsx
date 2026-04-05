import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { SEO } from '../components/SEO';
import { supabase } from '../lib/supabase';

interface TicketDetails {
  id: string;
  buyer_name: string;
  status: 'pending' | 'confirmed' | 'used' | 'cancelled';
  qr_uuid: string;
  event: {
    title: string;
    event_date: string;
    location: string;
    image_url: string;
  };
}

export default function TicketPage() {
  const { uuid } = useParams<{ uuid: string }>();
  const [ticket, setTicket] = useState<TicketDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (uuid) {
      loadTicket();
    }
  }, [uuid]);

  const loadTicket = async () => {
    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('tickets')
        .select(`
          id,
          buyer_name,
          status,
          qr_uuid,
          event:events(title, event_date, location, image_url)
        `)
        .eq('qr_uuid', uuid)
        .single();

      if (fetchError) throw fetchError;
      setTicket(data as any);
    } catch (err: any) {
      console.error('Erro ao carregar ingresso:', err.message);
      setError('INGRESSO NÃO ENCONTRADO OU INVÁLIDO.');
    } finally {
      setLoading(false);
    }
  };

  const getQrCodeUrl = (qrUuid: string) => {
    const data = encodeURIComponent(`https://perfectionairsoft.com.br/ticket/${qrUuid}`);
    return `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${data}&format=png&qzone=2`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background-dark p-6">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary mb-4" />
        <p className="text-[10px] text-primary font-black uppercase tracking-widest animate-pulse">Sincronizando Dados...</p>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background-dark p-12 text-center">
        <span className="material-symbols-outlined text-6xl text-red-500/20 mb-6 font-black">error</span>
        <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-4">Falha na Identificação</h2>
        <p className="text-[10px] text-slate-500 font-mono uppercase mb-8 max-w-xs mx-auto">
          {error || 'O PROTOCOLO DE ACESSO FOI REJEITADO PELO SISTEMA.'}
        </p>
        <Link to="/" className="text-primary font-black text-[10px] uppercase tracking-widest hover:underline">
          RETORNAR À BASE
        </Link>
      </div>
    );
  }

  const eventDate = new Date(ticket.event.event_date).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  return (
    <div className="min-h-screen bg-background-dark pb-20 pt-12 relative overflow-hidden">
      <div className="scanline"></div>
      <SEO title={`Ingresso: ${ticket.event.title} | Perfection Airsoft`} />

      <div className="max-w-md mx-auto px-6 relative z-10">
        {/* Ticket Header HUD */}
        <div className="mb-8 border-l-4 border-primary pl-6 py-2 bg-surface/10">
          <span className="text-primary font-black uppercase tracking-[0.4em] text-[10px] block mb-1">
            INGRESSO DIGITAL TÁTICO
          </span>
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter italic">
            OPERADOR: <span className="text-primary truncate block">{ticket.buyer_name}</span>
          </h1>
        </div>

        {/* QR Code Container */}
        <div className="bg-surface/20 border border-white/5 p-8 relative mb-8 group">
          <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-primary/40 group-hover:border-primary transition-colors"></div>
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-primary/40 group-hover:border-primary transition-colors"></div>
          
          <div className="bg-white p-4 shadow-[0_0_50px_rgba(251,191,36,0.1)] mb-6">
            <img 
              src={getQrCodeUrl(ticket.qr_uuid)} 
              alt="QR Code" 
              className="w-full aspect-square block"
              loading="lazy"
            />
          </div>

          <div className="text-center font-mono py-3 bg-black/40 border border-white/5 text-primary text-[10px] tracking-[0.2em] break-all uppercase">
            {ticket.qr_uuid}
          </div>
        </div>

        {/* Event Intel */}
        <div className="space-y-4">
          <div className="bg-surface/30 border border-white/5 p-6 border-l-4 border-l-primary">
            <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Missão</p>
            <h3 className="text-lg font-black text-white uppercase tracking-tight">{ticket.event.title}</h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface/30 border border-white/5 p-6">
              <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Mobilização</p>
              <p className="text-[11px] text-white font-mono uppercase italic">{eventDate}</p>
            </div>
            <div className="bg-surface/30 border border-white/5 p-6">
              <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Localização</p>
              <p className="text-[11px] text-white font-mono uppercase italic truncate">{ticket.event.location}</p>
            </div>
          </div>

          <div className={`p-6 border text-center transition-all ${
            ticket.status === 'confirmed' ? 'bg-primary/10 border-primary/30 text-primary' : 
            ticket.status === 'used' ? 'bg-white/5 border-white/10 text-slate-500' : 
            'bg-red-500/10 border-red-500/30 text-red-500'
          }`}>
            <span className="material-symbols-outlined text-sm mb-1 block">
              {ticket.status === 'confirmed' ? 'verified_user' : ticket.status === 'used' ? 'task_alt' : 'cancel'}
            </span>
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">
              {ticket.status === 'confirmed' ? 'STATUS: INGRESSO VÁLIDO' : 
               ticket.status === 'used' ? 'STATUS: CHECK-IN REALIZADO' : 
               'STATUS: INVÁLIDO / CANCELADO'}
            </span>
          </div>
        </div>

        {/* HUD Footer */}
        <div className="mt-12 text-center">
          <p className="text-[9px] text-slate-600 font-black uppercase tracking-[0.2em] mb-4">
            APRESENTE ESTE CÓDIGO NO CHECK-IN DO CAMPO
          </p>
          <div className="flex justify-center gap-4">
               <button 
                onClick={() => window.print()}
                className="text-[9px] text-slate-500 hover:text-white uppercase font-black tracking-widest flex items-center gap-2 border border-white/5 px-4 py-2"
               >
                 <span className="material-symbols-outlined text-xs">print</span>
                 Imprimir
               </button>
               <Link 
                to="/meus-ingressos"
                className="text-[9px] text-slate-500 hover:text-white uppercase font-black tracking-widest flex items-center gap-2 border border-white/5 px-4 py-2"
               >
                 <span className="material-symbols-outlined text-xs">arrow_back</span>
                 Voltar
               </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
