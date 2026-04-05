import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { SEO } from '../components/SEO';

interface ScanResult {
  success: boolean;
  ticket_id?: string;
  buyer_name?: string;
  event_title?: string;
  reason?: 'TICKET_NOT_FOUND' | 'ALREADY_USED' | 'NOT_PAID' | 'EVENT_NOT_FOUND' | 'UNAUTHORIZED_CHECKIN';
  checked_in_at?: string;
}

export default function EventCheckInPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [event, setEvent] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);

  const [processing, setProcessing] = useState(false);
  const [isSharedOperator, setIsSharedOperator] = useState(false);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    loadData();
  }, [user, eventId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Carregar Evento
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (eventError || !eventData) {
        alert('Evento não encontrado!');
        navigate('/dashboard');
        return;
      }

      // 2. Verificar Permissão
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user?.id).single();
      const isOwner = eventData.organizer_id === user?.id;
      const isAdmin = profile?.role === 'admin';
      const hasValidToken = token === eventData.checkin_token;

      if (!isOwner && !isAdmin && !hasValidToken) {
        alert('ACESSO NEGADO: Autenticação insuficiente.');
        navigate('/dashboard');
        return;
      }

      if (hasValidToken && !isOwner && !isAdmin) {
        setIsSharedOperator(true);
      }

      setEvent(eventData);

      // 3. Carregar Participantes
      const { data: participantsData, error: pError } = await supabase
        .from('tickets')
        .select('*')
        .eq('event_id', eventId)
        .order('buyer_name', { ascending: true });

      if (pError) throw pError;
      setParticipants(participantsData || []);

    } catch (err: any) {
      console.error('Error loading data:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (uuid: string) => {
    try {
      if (processing) return;
      setProcessing(true);
      setLastResult(null);
      const cleanUuid = uuid?.trim();

      const { data, error } = await supabase.rpc('checkin_ticket', {
        p_ticket_id: cleanUuid,
        p_checker_id: user?.id,
        p_token: token
      });

      if (error) throw error;

      const result = data as ScanResult;
      setLastResult(result);
      
      if (result.success) {

        // Atualizar lista local instantaneamente
        setParticipants(prev => prev.map(p => 
          p.qr_uuid === cleanUuid ? { ...p, status: 'used', checked_in_at: new Date().toISOString() } : p
        ));
        if ('vibrate' in navigator) navigator.vibrate(200);
      } else {
        if ('vibrate' in navigator) navigator.vibrate([100, 50, 100]);
      }
    } catch (err: any) {
      console.error('Check-in Error:', err.message);
    } finally {
      setProcessing(false);
    }
  };

  const filteredParticipants = participants.filter(p => 
    p.buyer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.buyer_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.buyer_cpf?.includes(searchTerm)
  );

  const stats = {
    total: participants.length,
    present: participants.filter(p => p.status === 'used').length
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-dark">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin size-12 border-4 border-primary border-t-transparent rounded-full shadow-[0_0_20px_rgba(251,191,36,0.3)]"></div>
          <p className="text-primary text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">Sincronizando Lista Tática...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-dark py-12 relative overflow-hidden">
      <SEO title={`Check-in: ${event.title}`} />
      
      <div className="max-w-2xl mx-auto px-6 relative z-10">
        <div className="mb-8 border-b border-white/10 bg-surface/30 -mx-6 px-6 py-8 relative overflow-hidden">
          <div className="flex items-center justify-between gap-2 text-primary text-[10px] font-black uppercase tracking-[0.3em] mb-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">group</span>
              LISTA DE OPERADORES v2.0
            </div>
            {isSharedOperator && (
              <div className="bg-primary text-black px-2 py-0.5 rounded-sm animate-pulse font-black">
                OPERADOR AUXILIAR
              </div>
            )}
          </div>

          <h2 className="text-white text-3xl font-black uppercase tracking-tighter italic leading-none mb-2">
            COMMAND CENTER: <span className="text-primary">{event.title}</span>
          </h2>
          
          <div className="flex items-center gap-4 mt-6">
            <div className="flex-1 bg-black/40 border border-white/5 p-4 rounded-sm">
                <div className="text-[8px] text-slate-500 font-black uppercase tracking-widest mb-1">MOVIMENTAÇÃO EM CAMPO</div>
                <div className="flex items-end gap-2">
                    <span className="text-white text-2xl font-mono leading-none">{stats.present}</span>
                    <span className="text-slate-600 text-[10px] pb-0.5">/ {stats.total} PRESENTES</span>
                </div>
                <div className="w-full h-1 bg-white/5 mt-3 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-1000 shadow-[0_0_10px_rgba(251,191,36,0.5)]" 
                      style={{ width: `${(stats.present / (stats.total || 1)) * 100}%` }}
                    ></div>
                </div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="relative group">
            <input 
              type="text"
              placeholder="BUSCAR NOME, EMAIL OU CPF..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-surface border border-white/10 p-6 pl-14 text-[12px] text-white outline-none focus:border-primary transition-all font-bold placeholder:text-slate-700 shadow-2xl"
            />
            <span className="material-symbols-outlined absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors">
              search
            </span>
            {searchTerm && (
               <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
               >
                 <span className="material-symbols-outlined text-sm">close</span>
               </button>
            )}
          </div>

          {lastResult && (
            <div className={`p-6 border animate-in zoom-in duration-300 relative overflow-hidden mb-8 ${
              lastResult.success ? 'bg-green-500/10 border-green-500/50' : 'bg-red-500/10 border-red-500/50'
            }`}>
              <div className="flex items-center gap-4">
                <div className={`size-10 rounded-sm flex items-center justify-center border ${
                  lastResult.success ? 'bg-green-500/20 border-green-500 text-green-500' : 'bg-red-500/20 border-red-500 text-red-500'
                }`}>
                  <span className="material-symbols-outlined text-2xl font-black">
                    {lastResult.success ? 'check_circle' : 'warning'}
                  </span>
                </div>
                <div className="flex-1">
                  <h3 className={`font-black uppercase text-sm tracking-tighter ${lastResult.success ? 'text-green-500' : 'text-red-500'}`}>
                    {lastResult.success ? 'VALIDAÇÃO CONCLUÍDA' : 'ERRO NA VALIDAÇÃO'}
                  </h3>
                  <p className="text-white text-[11px] font-black uppercase mt-0.5">
                    {lastResult.success ? lastResult.buyer_name : 'FALHA NO RECONHECIMENTO REGISTRADA'}
                  </p>
                </div>
                <button 
                  onClick={() => setLastResult(null)}
                  className="bg-white/5 hover:bg-white/10 p-2 rounded-sm"
                >
                  <span className="material-symbols-outlined text-slate-400">close</span>
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {filteredParticipants.length > 0 ? (
              filteredParticipants.map((p, i) => (
                <div key={i} className={`flex items-center justify-between p-4 border transition-all ${
                  p.status === 'used' 
                    ? 'bg-green-500/5 border-green-500/20 opacity-60' 
                    : 'bg-white/5 border-white/5 hover:border-primary/30 hover:bg-white/10'
                }`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white text-[12px] font-black uppercase truncate tracking-tight">{p.buyer_name}</span>
                      {p.status === 'used' && (
                        <span className="bg-green-500 text-black text-[7px] font-black px-1 rounded-sm uppercase">CONCLUÍDO</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-slate-600 text-[8px] font-mono tracking-tighter">
                      <span className="truncate">{p.buyer_email}</span>
                      <span className="hidden sm:inline border-l border-white/10 pl-3">CPF: {p.buyer_cpf || '---'}</span>
                    </div>
                  </div>
                  
                  <div className="ml-4">
                    {p.status !== 'used' ? (
                      <button
                        onClick={() => handleCheckIn(p.qr_uuid)}
                        disabled={processing}
                        className="bg-primary text-black font-black px-4 py-2 text-[9px] uppercase tracking-widest hover:bg-white transition-all shadow-lg active:scale-95 disabled:opacity-50"
                      >
                        {processing ? '...' : 'VALIDAR'}
                      </button>
                    ) : (
                      <div className="text-green-500 text-[9px] font-black uppercase tracking-widest flex items-center gap-1 p-2">
                         <span className="material-symbols-outlined text-[14px]">done_all</span>
                         OK
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-24 bg-white/5 border border-dashed border-white/10 rounded-sm">
                 <span className="material-symbols-outlined text-slate-800 text-5xl mb-4">search_off</span>
                 <p className="text-slate-700 text-[10px] font-black uppercase tracking-widest">Nenhum operador localizado na frequência atual</p>
              </div>
            )}
          </div>

          <Link 
            to={isSharedOperator ? "/eventos" : "/dashboard"}
            className="flex items-center justify-center gap-2 text-slate-600 hover:text-white text-[9px] uppercase font-black tracking-[0.3em] pt-12 transition-all hover:gap-4"
          >
            {isSharedOperator ? 'ENCERRAR SESSÃO' : 'RETORNAR AO QG'}
            <span className="material-symbols-outlined text-sm">logout</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
