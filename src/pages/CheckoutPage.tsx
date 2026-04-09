import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { TacticalSuccessModal } from '../components/TacticalSuccessModal';

const API_V2 = "https://seewdqetyolfmqsiyban.supabase.co/functions/v1/asaas-checkout-v2";

export function CheckoutPage() {
  const { items, total, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Estados de Fluxo
  const [step, setStep] = useState('identificacao'); // notificacao, pagamento, finalizacao
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dados do Pedido
  const [orderId, setOrderId] = useState<string | null>(null);
  const [pixData, setPixData] = useState<any>(null);
  const [pixConfirmed, setPixConfirmed] = useState(false);

  const [form, setForm] = useState({
    name: '', cpf: '', email: user?.email || '', phone: ''
  });

  // Polling de 3 segundos
  useEffect(() => {
    let interval: any;
    if (orderId && !pixConfirmed) {
      console.log(`[CheckoutV2] Iniciando polling para pedido: ${orderId}`);
      interval = setInterval(async () => {
        try {
          const resp = await fetch(`${API_V2}/status/${orderId}`);
          const data = await resp.json();
          
          if (data.pix_confirmado || data.status === 'confirmed' || data.status === 'pago') {
            console.log("[CheckoutV2] Pix Confirmado Detectado!");
            setPixConfirmed(true);
            clearInterval(interval);
          }
        } catch (err) {
          console.error("[CheckoutV2] Erro no polling:", err);
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [orderId, pixConfirmed]);

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setProcessing(true);

    try {
      // 1. Criar Pedido
      const orderResp = await fetch(`${API_V2}/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerData: form,
          total: total,
          items: items.map(i => ({
            id: i.product.id,
            name: i.product.name,
            quantity: i.quantity,
            price: i.product.price,
            metadata: i.metadata
          }))
        })
      });
      const order = await orderResp.json();
      if (!orderResp.ok) throw new Error(order.error || 'Erro ao criar pedido');
      setOrderId(order.id);

      // 2. Gerar Pix
      const pixResp = await fetch(`${API_V2}/generate-pix`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          customerData: form,
          total: total
        })
      });
      const pix = await pixResp.json();
      if (!pixResp.ok) throw new Error(pix.error || 'Erro ao gerar Pix');
      
      setPixData(pix);
      setStep('pagamento');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleFinish = () => {
    clearCart();
    if (user) {
      navigate('/meus-ingressos');
    } else {
      // Forçar cadastro para vincular o pedido
      navigate(`/login?mode=signup&redirect=/meus-ingressos&email=${orderId ? '' : ''}`);
    }
  };

  if (pixConfirmed) {
    return (
      <TacticalSuccessModal 
        isOpen={true}
        onClose={handleFinish}
        message="PIX REALIZADO COM SUCESSO. Iniciando protocolo do pedido... O comprovante foi enviado para o seu e-mail operacional."
      />
    );
  }

  return (
    <div className="min-h-screen bg-background-dark pt-24 pb-12 px-4 selection:bg-primary selection:text-black">
      <div className="max-w-xl mx-auto">
        <div className="mb-8 flex items-center gap-4">
          <div className="h-[1px] flex-1 bg-white/10" />
          <h1 className="text-xl font-black italic tracking-tighter text-white">CHECKOUT <span className="text-primary italic">V2</span></h1>
          <div className="h-[1px] flex-1 bg-white/10" />
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold tracking-wider uppercase">
            ❌ Erro de Sistema: {error}
          </div>
        )}

        {step === 'identificacao' && (
          <form onSubmit={handleCreateOrder} className="space-y-6 bg-white/[0.02] border border-white/5 p-8 backdrop-blur-md">
            <h2 className="text-[10px] font-black tracking-[0.3em] text-white/40 uppercase mb-8">Protocolo de Identificação</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[9px] font-black text-slate-500 mb-1.5 tracking-[0.2em] uppercase">Nome Completo</label>
                <input 
                  required
                  value={form.name}
                  onChange={e => setForm({...form, name: e.target.value})}
                  className="w-full bg-background-dark border border-white/10 text-white px-4 py-3 text-xs tracking-wide outline-none focus:border-primary transition-colors"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-black text-slate-500 mb-1.5 tracking-[0.2em] uppercase">CPF</label>
                  <input 
                    required
                    value={form.cpf}
                    onChange={e => setForm({...form, cpf: e.target.value})}
                    placeholder="000.000.000-00"
                    className="w-full bg-background-dark border border-white/10 text-white px-4 py-3 text-xs tracking-wide outline-none focus:border-primary transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-500 mb-1.5 tracking-[0.2em] uppercase">WhatsApp</label>
                  <input 
                    required
                    value={form.phone}
                    onChange={e => setForm({...form, phone: e.target.value})}
                    placeholder="(00) 00000-0000"
                    className="w-full bg-background-dark border border-white/10 text-white px-4 py-3 text-xs tracking-wide outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[9px] font-black text-slate-500 mb-1.5 tracking-[0.2em] uppercase">E-mail Operacional</label>
                <input 
                  required
                  type="email"
                  value={form.email}
                  onChange={e => setForm({...form, email: e.target.value})}
                  className="w-full bg-background-dark border border-white/10 text-white px-4 py-3 text-xs tracking-wide outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={processing}
              className="w-full bg-primary hover:bg-primary-light text-black font-black py-4 text-xs tracking-[0.2em] uppercase transition-all disabled:opacity-50 mt-4 group relative overflow-hidden"
            >
              {processing ? 'PROCESSANDO PROTOCOLO...' : 'GERAR PIX DE COBRANÇA'}
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            </button>
          </form>
        )}

        {step === 'pagamento' && pixData && (
          <div className="bg-white/[0.02] border border-white/5 p-8 backdrop-blur-md text-center">
            <h2 className="text-[10px] font-black tracking-[0.3em] text-primary uppercase mb-8 italic">PIX GERADO COM SUCESSO</h2>
            
            <div className="mb-8 bg-white p-4 inline-block rounded-lg">
              <img src={`data:image/png;base64,${pixData.qrCodeBase64}`} alt="QR Code Pix" className="w-48 h-48 mx-auto" />
            </div>

            <div className="mb-8">
               <p className="text-[9px] font-bold text-white/30 tracking-[0.2em] uppercase mb-3">Linha Digitável / Copia e Cola</p>
               <div className="flex gap-2 bg-background-dark border border-white/10 p-3">
                 <input readOnly value={pixData.qrCode} className="flex-1 bg-transparent border-none text-[10px] font-mono text-white/60 outline-none truncate" />
                 <button 
                  onClick={() => {
                    navigator.clipboard.writeText(pixData.qrCode);
                    alert("Copiado!");
                  }}
                  className="text-primary text-[10px] font-black tracking-widest uppercase px-2">Copiar</button>
               </div>
            </div>

            <div className="flex items-center justify-center gap-3 animate-pulse">
              <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]" />
              <p className="text-xs font-black text-white tracking-[0.15em] uppercase italic">Aguardando pagamento...</p>
            </div>

            <p className="mt-8 text-[9px] text-white/20 font-medium leading-relaxed italic">
              O sistema detectará o pagamento automaticamente. <br/> Não é necessário enviar o comprovante.
            </p>
          </div>
        )}

        <div className="mt-8 pt-8 border-t border-white/5 flex flex-col items-center gap-4">
            <p className="text-[8px] font-black text-white/10 tracking-[0.4em] uppercase">CRYSTAL ARMSTRONG • 2026 • SYSTEM V2</p>
        </div>
      </div>
    </div>
  );
}
