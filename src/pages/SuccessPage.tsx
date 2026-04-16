import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SEO } from '../components/SEO';
import { supabase } from '../lib/supabase';

export default function SuccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order_id');
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) {
      navigate('/');
      return;
    }

    const fetchOrder = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('id', orderId)
        .single();

      if (!error && data) {
        setOrderDetails(data);
      }
      setLoading(false);
    };

    fetchOrder();
  }, [orderId, navigate]);

  const handleProceed = () => {
    // Redireciona para o fluxo de cadastro/login com os dados do comprador
    const customerData = orderDetails?.customer_data;
    if (customerData) {
      navigate('/login', { 
        state: { 
          email: customerData.email,
          name: customerData.name,
          phone: customerData.phone
        } 
      });
    } else {
      navigate('/login');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background-dark flex items-center justify-center">
        <div className="text-primary font-black animate-pulse tracking-widest">SINCRONIZANDO PROTOCOLO...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-dark relative overflow-hidden flex items-center justify-center p-6">
      <SEO title="Missão Confirmada | Tactical Ops" description="Pagamento confirmado com sucesso." />
      
      {/* Background FX */}
      <div className="scanline opacity-20"></div>
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_40%,#fbbf2410,transparent_70%)] opacity-50"></div>
      
      <div className="max-w-xl w-full bg-surface border border-primary/20 p-8 md:p-12 relative z-10 shadow-[0_0_100px_rgba(251,191,36,0.05)] text-center space-y-8">
        {/* Success Icon HUD */}
        <div className="relative inline-block">
          <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full scale-150 animate-pulse"></div>
          <div className="size-24 rounded-full border-2 border-primary border-dashed flex items-center justify-center relative bg-black/40">
            <span className="material-symbols-outlined text-5xl text-primary animate-in zoom-in duration-500">verified</span>
          </div>
          <div className="absolute -top-2 -right-2 bg-emerald-500 text-[10px] font-black text-black px-2 py-0.5 shadow-lg">CONFIRMED</div>
        </div>

        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-black text-white italic tracking-tighter uppercase leading-none">
            PARABÉNS,<br />OPERADOR!
          </h1>
          <div className="h-px w-24 bg-primary mx-auto opacity-40"></div>
          <p className="text-slate-400 font-mono text-xs uppercase tracking-widest leading-relaxed">
            Seu pagamento foi validado pelo QG. O protocolo de acesso foi liberado para sua conta.
          </p>
        </div>

        {/* Order Intel HUD */}
        <div className="bg-black/40 border border-white/5 p-6 rounded-sm text-left grid grid-cols-2 gap-4">
          <div>
            <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest block">ORDEM ID</span>
            <span className="text-[11px] text-primary font-mono">#{orderId?.slice(0, 12).toUpperCase()}</span>
          </div>
          <div className="text-right">
            <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest block">STATUS</span>
            <span className="text-[11px] text-emerald-400 font-black italic">DEPLOYMENT READY</span>
          </div>
        </div>

        <button
          onClick={handleProceed}
          className="w-full bg-primary text-black font-black py-5 text-xs uppercase tracking-[0.3em] hover:bg-white transition-all shadow-[0_10px_40px_rgba(251,191,36,0.2)] group"
        >
          <span className="flex items-center justify-center gap-3 italic">
            PROSSEGUIR PARA O HUB
            <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
          </span>
        </button>

        <div className="text-[8px] text-slate-600 font-black uppercase tracking-[0.4em] pt-4">
          PERFECTION AIRSOFT // OPERATIONAL SYSTEM V4.0
        </div>
      </div>
    </div>
  );
}
