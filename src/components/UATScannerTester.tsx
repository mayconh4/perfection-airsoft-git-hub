import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export function UATScannerTester({ eventId, eventTitle }: { eventId: string, eventTitle: string }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const simulatePurchase = async () => {
    if (!user) return;
    setLoading(true);
    setResult(null);

    try {
      // Simula a criação de um ticket confirmado diretamente (como o webhook faria)
      const { data, error } = await supabase
        .from('tickets')
        .insert({
          event_id: eventId,
          buyer_id: user.id,
          buyer_name: user.user_metadata?.full_name || 'Operador de Teste',
          buyer_email: user.email,
          quantity: 1,
          price_paid: 0.01,
          status: 'confirmed',
          qr_uuid: crypto.randomUUID()
        })
        .select()
        .single();

      if (error) throw error;

      setResult(`SUCESSO! Ticket gerado ID: ${data.id.slice(0,8)}. Verifique 'Meus Ingressos'.`);
    } catch (err: any) {
      setResult(`ERRO: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 p-4 bg-primary/10 border border-primary/20 rounded-sm">
      <div className="flex items-center gap-2 mb-2">
        <span className="material-symbols-outlined text-primary text-sm">terminal</span>
        <span className="text-[10px] text-primary font-black uppercase tracking-widest">Ferramenta de Teste UAT (Admin)</span>
      </div>
      <p className="text-[9px] text-slate-500 uppercase mb-4">Simule a criação de um ingresso para o evento "{eventTitle}" para validar o scanner e o dashboard.</p>
      
      <button
        onClick={simulatePurchase}
        disabled={loading}
        className="bg-primary text-black font-black px-4 py-2 text-[9px] uppercase tracking-widest hover:bg-white transition-all disabled:opacity-50"
      >
        {loading ? 'GERANDO...' : 'SIMULAR COMPRA (GERAR TICKET)'}
      </button>

      {result && (
        <p className={`mt-2 text-[9px] font-black uppercase ${result.startsWith('ERRO') ? 'text-red-500' : 'text-green-500'}`}>
          {result}
        </p>
      )}
    </div>
  );
}
