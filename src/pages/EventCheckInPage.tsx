import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { SEO } from '../components/SEO';

interface ScanResult {
  success: boolean;
  ticket_id?: string;
  buyer_name?: string;
  event_title?: string;
  reason?: 'TICKET_NOT_FOUND' | 'ALREADY_USED' | 'NOT_PAID' | 'EVENT_NOT_FOUND' | 'NOT_AUTHORIZED';
  checked_in_at?: string;
}

export default function EventCheckInPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);
  const [history, setHistory] = useState<ScanResult[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    loadEvent();
  }, [user, eventId]);

  const loadEvent = async () => {
    setLoading(true);
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

    // Verificar se é o organizador ou admin
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user?.id).single();
    if (data.organizer_id !== user?.id && profile?.role !== 'admin') {
      alert('Acesso restrito ao organizador do evento.');
      navigate('/dashboard');
      return;
    }

    setEvent(data);
    setLoading(false);
  };

  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;

    if (isScanning && !loading) {
      scanner = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
      );

      scanner.render(onScanSuccess, onScanFailure);
    }

    return () => {
      if (scanner) {
        scanner.clear().catch(error => console.error("Failed to clear scanner", error));
      }
    };
  }, [isScanning, loading]);

  const onScanSuccess = (decodedText: string) => {
    // O QR Code contém a URL: https://perfectionairsoft.com.br/ticket/UUID
    // Extraímos o UUID do final
    const uuid = decodedText.split('/').pop();
    if (uuid && uuid.length === 36) {
      handleCheckIn(uuid);
      // Parar o scanner temporariamente após sucesso para evitar múltiplos scans do mesmo código
      setIsScanning(false);
      setTimeout(() => setIsScanning(true), 3000); 
    }
  };

  const onScanFailure = (error: any) => {
    // console.warn(`Code scan error = ${error}`);
  };

  const handleCheckIn = async (uuid: string) => {
    if (processing) return;
    setProcessing(true);
    setLastResult(null);

    try {
      const { data, error } = await supabase.rpc('checkin_ticket', {
        p_qr_uuid: uuid,
        p_checker_id: user?.id
      });

      if (error) throw error;

      const result = data as ScanResult;
      setLastResult(result);
      
      if (result.success) {
        setHistory(prev => [result, ...prev].slice(0, 10));
        // Feedback tático: No navegador não dá pra fazer beep fácil sem interação, 
        // mas podemos usar a API de vibração se disponível
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
    <div className="min-h-screen bg-background-dark pb-20 pt-12 font-mono">
      <SEO title={`Check-in: ${event.title}`} />
      
      <div className="max-w-2xl mx-auto px-6">
        {/* Header Tático */}
        <div className="mb-8 border-b border-white/5 pb-6">
          <div className="flex items-center gap-2 text-primary text-[10px] font-black uppercase tracking-[0.3em] mb-2">
            <span className="material-symbols-outlined text-sm">security</span>
            Terminal de Validação v1.0
          </div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tighter italic">
            CHECK-IN: <span className="text-primary">{event.title}</span>
          </h1>
          <p className="text-slate-500 text-[10px] mt-1 uppercase">
            Operador: {user?.email} • {new Date().toLocaleTimeString()}
          </p>
        </div>

        {/* Scanner Area */}
        <div className="space-y-6">
          {!isScanning ? (
            <button
              onClick={() => setIsScanning(true)}
              className="w-full aspect-square bg-surface/30 border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-4 hover:border-primary/50 transition-all group"
            >
              <div className="size-20 bg-primary/10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-4xl text-primary">qr_code_scanner</span>
              </div>
              <span className="text-white font-black uppercase text-[10px] tracking-widest">
                Ativar Scanner de Ingressos
              </span>
            </button>
          ) : (
            <div className="relative overflow-hidden border-2 border-primary/30 bg-black aspect-square max-w-sm mx-auto">
              <div id="reader" className="w-full h-full"></div>
              <button 
                onClick={() => setIsScanning(false)}
                className="absolute bottom-4 right-4 bg-red-500 text-white p-2 rounded-full shadow-lg"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
              {/* Overlay Decorativo Tático */}
              <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-px bg-primary/30 animate-pulse"></div>
            </div>
          )}

          {/* Manual Input */}
          <div className="flex gap-2">
            <input 
              type="text"
              placeholder="CÓDIGO MANUAL (UUID)"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              className="flex-1 bg-surface/50 border border-white/10 p-4 text-[10px] text-white outline-none focus:border-primary transition-colors"
            />
            <button
              onClick={() => handleCheckIn(manualCode)}
              disabled={processing || !manualCode}
              className="bg-primary text-black font-black px-6 py-4 text-[10px] uppercase tracking-widest disabled:opacity-50"
            >
              Validar
            </button>
          </div>

          {/* Feedback Card */}
          {lastResult && (
            <div className={`p-6 border-2 animate-in zoom-in duration-300 ${
              lastResult.success ? 'bg-green-500/10 border-green-500/50' : 'bg-red-500/10 border-red-500/50'
            }`}>
              <div className="flex items-center gap-4">
                <div className={`size-12 rounded-full flex items-center justify-center ${
                  lastResult.success ? 'bg-green-500 text-black' : 'bg-red-500 text-white'
                }`}>
                  <span className="material-symbols-outlined font-black">
                    {lastResult.success ? 'check' : 'warning'}
                  </span>
                </div>
                <div>
                  <h3 className={`font-black uppercase text-sm ${lastResult.success ? 'text-green-500' : 'text-red-500'}`}>
                    {lastResult.success ? 'INGRESSO VÁLIDO' : 'ERRO NA VALIDAÇÃO'}
                  </h3>
                  <p className="text-white text-xs font-black uppercase mt-1">
                    {lastResult.success ? lastResult.buyer_name : 
                      lastResult.reason === 'ALREADY_USED' ? 'INGRESSO JÁ UTILIZADO' :
                      lastResult.reason === 'NOT_PAID' ? 'PAGAMENTO NÃO CONFIRMADO' :
                      lastResult.reason === 'NOT_AUTHORIZED' ? 'NÃO AUTORIZADO' : 'CÓDIGO INVÁLIDO'
                    }
                  </p>
                  {lastResult.checked_in_at && (
                    <p className="text-slate-500 text-[8px] mt-1 italic">
                      Scan anterior: {new Date(lastResult.checked_in_at).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Recent History */}
          {history.length > 0 && (
            <div className="mt-8">
              <h4 className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-4 border-b border-white/5 pb-2">
                Últimos Check-ins
              </h4>
              <div className="space-y-2">
                {history.map((h, i) => (
                  <div key={i} className="flex items-center justify-between bg-surface/20 p-3 border border-white/5">
                    <span className="text-white text-[10px] font-black uppercase">{h.buyer_name}</span>
                    <span className="text-green-500 text-[8px] font-mono">CONFIRMADO</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Link 
            to="/dashboard"
            className="block text-center text-slate-500 hover:text-white text-[9px] uppercase tracking-widest pt-4"
          >
            ← Voltar ao Command Center
          </Link>
        </div>
      </div>
    </div>
  );
}
