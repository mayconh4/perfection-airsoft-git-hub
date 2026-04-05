import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
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
  const [loading, setLoading] = useState(true);
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);
  const [history, setHistory] = useState<ScanResult[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [processing, setProcessing] = useState(false);
  const [isSharedOperator, setIsSharedOperator] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    loadEvent();
  }, [user, eventId]);

  const loadEvent = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (error || !data) {
        alert('Evento não encontrado!');
        navigate('/dashboard');
        return;
      }

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user?.id).single();
      
      const isOwner = data.organizer_id === user?.id;
      const isAdmin = profile?.role === 'admin';
      const hasValidToken = token === data.checkin_token;

      if (!isOwner && !isAdmin && !hasValidToken) {
        alert('ACESSO NEGADO: Autenticação insuficiente.');
        navigate('/dashboard');
        return;
      }

      if (hasValidToken && !isOwner && !isAdmin) {
        setIsSharedOperator(true);
      }

      setEvent(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let html5QrCode: Html5Qrcode | null = null;

    const startScanner = async () => {
      if (isScanning && !loading) {
        setScannerError(null);
        try {
          html5QrCode = new Html5Qrcode("reader");
          await html5QrCode.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 250, height: 250 } },
            onScanSuccess,
            onScanFailure
          );
        } catch (err: any) {
          console.error("Camera Error:", err);
          setScannerError("NÃO FOI POSSÍVEL ATIVAR A CÂMERA. VERIFIQUE AS PERMISSÕES.");
          setIsScanning(false);
        }
      }
    };

    startScanner();

    return () => {
      if (html5QrCode) {
        if (html5QrCode.isScanning) {
          html5QrCode.stop().catch(err => console.error("Failed to stop scanner", err));
        }
      }
    };
  }, [isScanning, loading]);

  useEffect(() => {
    if (isScanning && !loading) {
      setTimeout(() => {
        const reader = document.getElementById('reader');
        if (reader) {
          reader.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  }, [isScanning, loading]);

  const onScanSuccess = (decodedText: string) => {
    const uuid = decodedText.split('/').pop();
    if (uuid === 'TAC-TEST-VALID-001' || (uuid && uuid.length === 36)) {
      handleCheckIn(uuid);
      setIsScanning(false);
      setTimeout(() => setIsScanning(true), 3000); 
    }
  };

  const onScanFailure = () => {};

  const handleCheckIn = async (uuid: string) => {
    if (processing) return;
    setProcessing(true);
    setLastResult(null);

    // MODO DE TREINAMENTO / BYPASS DE TESTE
    if (uuid === 'TAC-TEST-VALID-001') {
      setTimeout(() => {
        const result = { 
          success: true, 
          buyer_name: 'OPERADOR DE TESTE (MODO QG)', 
          event_title: event?.title || 'OPERACAO DE TESTE',
          ticket_id: 'TRAINING-001'
        };
        setLastResult(result);
        setHistory(prev => [result as ScanResult, ...prev].slice(0, 10));
        if ('vibrate' in navigator) navigator.vibrate(200);
        setProcessing(false);
        setManualCode('');
      }, 500);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('checkin_ticket', {
        p_ticket_id: uuid,
        p_checker_id: user?.id,
        p_token: token
      });

      if (error) throw error;

      const result = data as ScanResult;
      setLastResult(result);
      
      if (result.success) {
        setHistory(prev => [result, ...prev].slice(0, 10));
        if ('vibrate' in navigator) navigator.vibrate(200);
      } else {
        if ('vibrate' in navigator) navigator.vibrate([100, 50, 100]);
      }
    } catch (err: any) {
      console.error('Check-in Error:', err.message);
      setLastResult({ success: false, reason: 'TICKET_NOT_FOUND' });
    } finally {
      setProcessing(false);
      setManualCode('');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-dark">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-dark pb-20 pt-12 font-mono relative overflow-hidden crt-overlay">
      <div className="scanline"></div>
      <SEO title={`Check-in: ${event.title}`} />
      
      <div className="max-w-2xl mx-auto px-6 relative z-10">
        <div className="mb-8 border-b border-white/5 pb-6">
          <div className="flex items-center justify-between gap-2 text-primary text-[10px] font-black uppercase tracking-[0.3em] mb-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">security</span>
              TERMINAL DE VALIDAÇÃO v1.2
            </div>
            {isSharedOperator && (
              <div className="bg-primary text-black px-2 py-0.5 rounded-sm animate-pulse font-black">
                MODO OPERADOR
              </div>
            )}
          </div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tighter italic leading-none">
            {isSharedOperator ? 'OPERADOR DE CAMPO' : 'COMMAND CENTER'}: <span className="text-primary">{event.title}</span>
          </h1>
          <div className="flex items-center gap-4 mt-4">
            <p className="text-slate-500 text-[9px] uppercase font-mono bg-white/5 px-2 py-1">
              EVT_{event.id.slice(0,8)}
            </p>
            <p className="text-slate-500 text-[9px] uppercase font-mono bg-white/5 px-2 py-1">
              OP_{user?.id.slice(0,8)}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {scannerError && (
            <div className="bg-red-500/20 border border-red-500 p-4 text-red-500 text-[10px] font-black uppercase text-center animate-pulse">
              <span className="material-symbols-outlined block mb-2">error</span>
              {scannerError}
            </div>
          )}

          {!isScanning ? (
            <button
              onClick={() => setIsScanning(true)}
              className="w-full aspect-square bg-surface/30 border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-4 hover:border-primary/50 transition-all group relative overflow-hidden shadow-2xl"
            >
              <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="size-24 bg-primary/10 border border-primary/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform relative z-10 shadow-[0_0_30px_rgba(251,191,36,0.15)]">
                <span className="material-symbols-outlined text-5xl text-primary animate-pulse">qr_code_scanner</span>
              </div>
              <div className="text-center relative z-10">
                <span className="text-white font-black uppercase text-xs tracking-[0.2em] block mb-1">
                  INICIAR PROTOCOLO
                </span>
                <span className="text-slate-500 font-mono text-[8px] uppercase tracking-widest">
                  Awaiting Optical Input...
                </span>
              </div>
            </button>
          ) : (
            <div className="relative overflow-hidden border-2 border-primary/30 bg-black aspect-square max-w-sm mx-auto shadow-[0_0_80px_rgba(251,191,36,0.15)]">
              <div id="reader" className="w-full h-full"></div>
              <button 
                onClick={() => setIsScanning(false)}
                className="absolute top-4 right-4 bg-red-500/80 hover:bg-red-500 text-white p-2 rounded-full shadow-lg z-20 backdrop-blur-sm transition-all flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
              
              <div className="absolute inset-0 pointer-events-none z-10 border-[1px] border-white/5">
                <div className="absolute top-4 left-4 size-12 border-t-2 border-l-2 border-primary/40"></div>
                <div className="absolute top-4 right-4 size-12 border-t-2 border-r-2 border-primary/40"></div>
                <div className="absolute bottom-4 left-4 size-12 border-b-2 border-l-2 border-primary/40"></div>
                <div className="absolute bottom-4 right-4 size-12 border-b-2 border-r-2 border-primary/40"></div>
                
                <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 h-0.5 bg-primary/30 shadow-[0_0_15px_rgba(251,191,36,0.5)] animate-scan-fast"></div>
              </div>
            </div>
          )}

          <div className="flex gap-2 flex-col sm:flex-row">
            <input 
              type="text"
              placeholder="CÓDIGO DE AUTENTICAÇÃO MANUAL"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              className="flex-1 bg-surface/50 border border-white/10 p-5 text-[11px] text-white outline-none focus:border-primary transition-colors font-mono placeholder:text-slate-700"
            />
            <button
              onClick={() => handleCheckIn(manualCode)}
              disabled={processing || !manualCode}
              className="bg-primary text-black font-black px-10 py-5 text-[10px] uppercase tracking-[0.2em] disabled:opacity-50 hover:bg-white transition-all shadow-lg active:scale-95"
            >
              {processing ? '...' : 'VALIDAR'}
            </button>
          </div>

          {!lastResult && !isScanning && (
            <div className="bg-white/5 border border-white/5 p-4 flex items-center justify-center gap-3">
               <span className="material-symbols-outlined text-slate-500 text-sm">info</span>
               <span className="text-[8px] text-slate-600 uppercase font-mono tracking-widest">
                 DICA: Use o código <span className="text-primary font-black">TAC-TEST-VALID-001</span> para validar o scanner.
               </span>
            </div>
          )}

          {lastResult && (
            <div className={`p-8 border-2 animate-in slide-in-from-top duration-500 relative overflow-hidden ${
              lastResult.success ? 'bg-green-500/10 border-green-500/50' : 'bg-red-500/10 border-red-500/50'
            }`}>
              <div className="flex items-center gap-6">
                <div className={`size-16 rounded-sm flex items-center justify-center border-2 shadow-inner ${
                  lastResult.success ? 'bg-green-500/20 border-green-500 text-green-500' : 'bg-red-500/20 border-red-500 text-red-500'
                }`}>
                  <span className="material-symbols-outlined text-4xl font-black">
                    {lastResult.success ? 'verified' : 'gpp_maybe'}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className={`font-black uppercase text-xl tracking-tighter italic ${lastResult.success ? 'text-green-500' : 'text-red-500'}`}>
                      {lastResult.success ? 'ACESSO AUTORIZADO' : 'ACESSO NEGADO'}
                    </h3>
                  </div>
                  <div className="h-px w-full bg-white/10 mb-3"></div>
                  <p className="text-white text-sm font-black uppercase tracking-widest break-all">
                    {lastResult.success ? lastResult.buyer_name : 
                      lastResult.reason === 'ALREADY_USED' ? 'DETECTOR: TICKET JÁ UTILIZADO' :
                      lastResult.reason === 'NOT_PAID' ? 'DETECTOR: PGTO PENDENTE' :
                      lastResult.reason === 'UNAUTHORIZED_CHECKIN' ? 'ALERTA: SEM PERMISSÃO' : 'DETECTOR: CÓDIGO INVÁLIDO'
                    }
                  </p>
                  {lastResult.checked_in_at && (
                    <p className="text-red-400 text-[9px] mt-3 font-mono uppercase bg-red-500/10 px-2 py-1.5 border border-red-500/20 inline-block">
                      SCAN ANTERIOR: {new Date(lastResult.checked_in_at).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {history.length > 0 && (
            <div className="mt-12">
              <div className="flex items-center justify-between mb-4 px-1">
                <h4 className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] flex items-center gap-2">
                  <span className="size-1.5 bg-primary rounded-full"></span>
                  LOG DE OPERAÇÕES
                </h4>
                <span className="text-[8px] text-slate-600 font-mono">COUNT: {history.length}</span>
              </div>
              <div className="space-y-2">
                {history.map((h, i) => (
                  <div key={i} className="flex items-center justify-between bg-white/5 p-4 border border-white/5 group hover:bg-white/10 transition-all">
                    <div>
                      <span className="text-white text-[11px] font-black uppercase block tracking-tight">{h.buyer_name}</span>
                      <span className="text-slate-600 text-[8px] font-mono">TKT_{h.ticket_id?.slice(0, 8)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-green-500 text-[9px] font-black uppercase block tracking-widest">OK</span>
                      <span className="text-slate-700 text-[8px] font-mono">{new Date().toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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
