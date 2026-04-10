import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { TacticalSuccessModal } from '../components/TacticalSuccessModal';
import { supabase } from '../lib/supabase'; // Assumindo que este cliente existe
import { motion, AnimatePresence } from 'framer-motion';

/** 
 * CHECKOUT PHOENIX V3 - THE TACTICAL HUD
 * Design Premium, Realtime Listeners, Zero Polling.
 */

const API_V2 = "https://seewdqetyolfmqsiyban.supabase.co/functions/v1/asaas-checkout-v2";

export function CheckoutPage() {
  const { items, total, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Estados de Fluxo
  const [step, setStep] = useState<'dados' | 'pagamento'>('dados');
  const [method, setMethod] = useState<'pix' | 'card' | 'boleto' | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados de Negócio
  const [order, setOrder] = useState<any>(null);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);

  // Formulários
  const [form, setForm] = useState(() => {
    const saved = localStorage.getItem('tactical_p_data');
    return saved ? JSON.parse(saved) : { name: '', cpf: '', email: user?.email || '', phone: '' };
  });

  const [cardForm, setCardForm] = useState({
    number: '', holder: '', expiry: '', ccv: '', installments: 1
  });

  // 1. Persistência de Dados
  useEffect(() => {
    localStorage.setItem('tactical_p_data', JSON.stringify(form));
  }, [form]);

  // 2. REALTIME LISTENER (A Mágica da v3)
  useEffect(() => {
    if (!order?.id || isConfirmed) return;

    console.log(`[HUD] Iniciando rastreamento de radar para pedido: ${order.id}`);
    
    const channel = supabase
      .channel(`order-status-${order.id}`)
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'orders', 
          filter: `id=eq.${order.id}` 
        },
        (payload) => {
          console.log('[HUD] Mudança de status detectada via satélite:', payload.new.status);
          if (payload.new.status === 'confirmed' || payload.new.pix_confirmado) {
            setIsConfirmed(true);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [order?.id, isConfirmed]);

  // 3. Handlers
  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.cpf || !form.email) return setError("Identificação obrigatória!");
    setStep('pagamento');
  };

  const generatePayment = async (selectedMethod: 'pix' | 'card' | 'boleto') => {
    setMethod(selectedMethod);
    setProcessing(true);
    setError(null);

    try {
      // Step A: Create Order if not exists
      let currentOrder = order;
      if (!currentOrder) {
        const oResp = await fetch(`${API_V2}/create-order`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerData: form,
            total,
            items: items.map(i => ({ id: i.product.id, name: i.product.name, quantity: i.quantity, price: i.product.price }))
          })
        });
        currentOrder = await oResp.json();
        if (!oResp.ok) throw new Error(currentOrder.error || "Erro no protocolo do pedido");
        setOrder(currentOrder);
      }

      // Step B: Generate Payment
      const pResp = await fetch(`${API_V2}/generate-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: currentOrder.id,
          method: selectedMethod,
          customerData: form,
          total,
          creditCard: selectedMethod === 'card' ? {
            info: {
              holderName: cardForm.holder,
              number: cardForm.number.replace(/\D/g, ''),
              expiryMonth: cardForm.expiry.split('/')[0],
              expiryYear: '20' + cardForm.expiry.split('/')[1],
              ccv: cardForm.ccv
            },
            holder: {
              name: form.name, email: form.email,
              cpfCnpj: form.cpf.replace(/\D/g, ''),
              postalCode: "01001000", addressNumber: "SN",
              phone: form.phone.replace(/\D/g, '')
            }
          } : null,
          installments: cardForm.installments
        })
      });

      const pData = await pResp.json();
      if (!pResp.ok) throw new Error(pData.error || "Operação negada pelo Gateway");
      setPaymentData(pData);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  if (isConfirmed) {
    return (
      <TacticalSuccessModal 
        isOpen={true}
        onClose={() => { clearCart(); navigate('/meus-ingressos'); }}
        message="MISSÃO CUMPRIDA! Pagamento confirmado em tempo real. Sua mercadoria tática já está em processamento."
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white pt-28 pb-20 px-4 overflow-hidden relative">
      {/* Background Decor - Radar Lines */}
      <div className="absolute inset-0 pointer-events-none opacity-5">
        <div className="h-full w-full" style={{ backgroundImage: 'linear-gradient(rgba(255,184,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,184,0,0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        
        {/* HUD HEADER */}
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <span className="text-primary text-[10px] font-black tracking-[0.5em] uppercase mb-2 block">System Status: Operacional</span>
            <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter uppercase leading-none">
              Checkout <span className="text-primary">Phoenix</span>
            </h1>
          </div>
          <div className="bg-white/5 border border-white/10 px-6 py-4 rounded-sm backdrop-blur-md">
            <span className="text-[10px] font-bold text-white/40 uppercase block mb-1">Total da Operação</span>
            <span className="text-3xl font-black italic text-primary">R$ {total.toFixed(2)}</span>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
          
          {/* PAINEL DE COMANDO (Identificação & Pagamento) */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* STEP 1: DADOS */}
            <section className={`transition-all duration-500 ${step === 'dados' ? 'opacity-100' : 'opacity-40 grayscale pointer-events-none'}`}>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-8 h-8 bg-primary text-black flex items-center justify-center font-black rounded-full">01</div>
                <h2 className="text-xl font-black italic uppercase tracking-tight">Protocolo de Identidade</h2>
              </div>

              <div className="bg-white/[0.03] border border-white/10 p-8 clip-path-tactical">
                <form onSubmit={handleNext} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input label="Nome Completo" value={form.name} onChange={v => setForm({...form, name: v})} />
                  <Input label="CPF Operacional" value={form.cpf} onChange={v => setForm({...form, cpf: v})} placeholder="000.000.000-00" />
                  <Input label="E-mail de Contato" value={form.email} onChange={v => setForm({...form, email: v})} type="email" />
                  <Input label="WhatsApp / Rádio" value={form.phone} onChange={v => setForm({...form, phone: v})} placeholder="(00) 00000-0000" />
                  {step === 'dados' && (
                    <button className="col-span-1 md:col-span-2 bg-primary text-black font-black py-4 uppercase tracking-[0.2em] text-xs hover:bg-white transition-all mt-4">
                      Configurar Pagamento →
                    </button>
                  )}
                </form>
              </div>
            </section>

            {/* STEP 2: PAGAMENTO */}
            <AnimatePresence>
              {step === 'pagamento' && (
                <motion.section 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-8 h-8 bg-primary text-black flex items-center justify-center font-black rounded-full">02</div>
                    <h2 className="text-xl font-black italic uppercase tracking-tight">Arsenal de Pagamento</h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <PaymentOption active={method === 'pix'} onClick={() => generatePayment('pix')} title="Pix" desc="Aprovação Flash" icon="⚡" />
                    <PaymentOption active={method === 'card'} onClick={() => setMethod('card')} title="Cartão" desc="Até 12x" icon="💳" />
                    <PaymentOption active={method === 'boleto'} onClick={() => generatePayment('boleto')} title="Boleto" desc="3 dias úteis" icon="📄" />
                  </div>

                  {/* Detalhes do Pagamento Selecionado */}
                  <div className="bg-white/[0.03] border border-white/10 p-8 min-h-[300px] flex flex-col items-center justify-center text-center">
                    {processing ? (
                      <div className="space-y-4">
                         <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                         <p className="text-[10px] font-black tracking-widest text-primary uppercase">Criptografando Dados...</p>
                      </div>
                    ) : error ? (
                      <div className="text-red-500 space-y-4">
                        <span className="text-4xl">⚠️</span>
                        <p className="font-black uppercase text-xs tracking-widest">{error}</p>
                        <button onClick={() => setMethod(null)} className="text-[10px] underline uppercase">Tentar outro método</button>
                      </div>
                    ) : method === 'pix' && paymentData ? (
                      <div className="space-y-6 w-full">
                        <div className="bg-white p-4 inline-block rounded-sm">
                           <img src={`data:image/png;base64,${paymentData.qrCodeBase64}`} alt="QR Code" className="w-40 h-40" />
                        </div>
                        <div className="w-full max-w-sm mx-auto bg-black border border-white/10 p-3 flex gap-2">
                          <input readOnly value={paymentData.qrCode} className="bg-transparent text-[9px] font-mono text-white/40 outline-none flex-1 truncate" />
                          <button onClick={() => { navigator.clipboard.writeText(paymentData.qrCode); }} className="bg-primary text-black text-[9px] font-black px-4">COPIAR</button>
                        </div>
                        <div className="flex items-center justify-center gap-2 animate-pulse">
                          <div className="w-2 h-2 bg-primary rounded-full" />
                          <span className="text-[9px] font-black tracking-[0.3em] text-primary uppercase">Sintonizando confirmação via satélite...</span>
                        </div>
                      </div>
                    ) : method === 'card' ? (
                      <div className="w-full space-y-4 text-left">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <Input label="Número do Cartão" value={cardForm.number} onChange={v => setCardForm({...cardForm, number: v})} />
                           <Input label="Nome Impresso" value={cardForm.holder} onChange={v => setCardForm({...cardForm, holder: v})} />
                           <Input label="Validade (MM/AA)" value={cardForm.expiry} onChange={v => setCardForm({...cardForm, expiry: v})} />
                           <Input label="CVV" value={cardForm.ccv} onChange={v => setCardForm({...cardForm, ccv: v})} />
                        </div>
                        <select 
                          className="w-full bg-black/50 border border-white/10 p-4 text-xs font-black uppercase outline-none focus:border-primary"
                          value={cardForm.installments}
                          onChange={e => setCardForm({...cardForm, installments: parseInt(e.target.value)})}
                        >
                           {[1,2,3,4,5,6,10,12].map(i => (
                             <option key={i} value={i} className="bg-black text-white">{i}x de R$ {(total * (i > 1 ? 1.25 : 1) / i).toFixed(2)}</option>
                           ))}
                        </select>
                        <button 
                          onClick={() => generatePayment('card')}
                          className="w-full bg-primary text-black font-black py-4 uppercase text-xs tracking-widest mt-4"
                        >
                          Efetuar Disparo Financeiro
                        </button>
                      </div>
                    ) : method === 'boleto' && paymentData ? (
                      <div className="space-y-6">
                        <p className="text-xs font-black uppercase text-white/60">Boleto gerado com sucesso</p>
                        <div className="bg-black/50 p-4 border border-white/5 font-mono text-[10px] break-all">{paymentData.identificationField}</div>
                        <a href={paymentData.bankSlipUrl} target="_blank" className="inline-block bg-primary text-black font-black px-10 py-4 uppercase text-[10px] tracking-widest">Abrir PDF</a>
                      </div>
                    ) : (
                      <p className="text-xs font-black uppercase text-white/20 tracking-widest leading-relaxed">Selecione um método acima para<br/>iniciar a autorização</p>
                    )}
                  </div>
                </motion.section>
              )}
            </AnimatePresence>
          </div>

          {/* COLUNA RESUMO (RECON) */}
          <aside className="lg:col-span-1">
             <div className="bg-white/[0.02] border border-white/5 p-8 backdrop-blur-xl relative overflow-hidden">
                {/* HUD Decoration */}
                <div className="absolute top-0 right-0 p-2 text-[8px] font-mono text-primary/30 uppercase tracking-tighter">REF: {order?.id?.slice(0,8) || 'PENDING'}</div>
                
                <h3 className="text-[10px] font-black tracking-[0.4em] text-primary uppercase mb-8 border-b border-primary/20 pb-4">Sumário da Carga</h3>
                
                <div className="space-y-6 mb-12">
                   {items.map((item, i) => (
                     <div key={i} className="flex justify-between items-start">
                        <div>
                           <p className="text-[10px] font-black uppercase text-white mb-1">{item.product.name}</p>
                           <p className="text-[8px] font-bold text-white/30 uppercase">Quantidade: {item.quantity}</p>
                        </div>
                        <span className="text-[10px] font-mono text-white/60">R$ {(item.product.price * item.quantity).toFixed(2)}</span>
                     </div>
                   ))}
                </div>

                <div className="space-y-3 pt-6 border-t border-white/5">
                   <div className="flex justify-between text-[10px] font-bold text-white/40 uppercase">
                      <span>Logística</span>
                      <span>Grátis</span>
                   </div>
                   <div className="flex justify-between text-xl font-black italic text-primary pt-4">
                      <span>Total</span>
                      <span>R$ {total.toFixed(2)}</span>
                   </div>
                </div>

                <div className="mt-12 text-[8px] font-black text-white/10 uppercase tracking-[0.3em] leading-relaxed text-center">
                   Acesso Criptografado • V3 Tactical System
                </div>
             </div>
          </aside>

        </div>
      </div>
    </div>
  );
}

// Sub-components para manter o código limpo e premium
function Input({ label, value, onChange, type = "text", placeholder = "" }: { label: string, value: string, onChange: (v: string) => void, type?: string, placeholder?: string }) {
  return (
    <div className="space-y-2">
      <label className="text-[9px] font-black text-white/40 tracking-widest uppercase">{label}</label>
      <input 
        type={type} 
        value={value} 
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-black/60 border border-white/10 px-4 py-4 text-xs font-sans outline-none focus:border-primary transition-all rounded-sm placeholder:text-white/5"
      />
    </div>
  );
}

function PaymentOption({ active, onClick, title, desc, icon }: { active: boolean, onClick: () => void, title: string, desc: string, icon: string }) {
  return (
    <button 
      onClick={onClick}
      className={`p-6 border text-left transition-all duration-300 relative overflow-hidden group ${active ? 'bg-primary border-primary' : 'bg-white/[0.02] border-white/10 hover:border-white/30'}`}
    >
       <div className={`text-2xl mb-4 group-hover:scale-110 transition-transform ${active ? 'grayscale-0' : 'grayscale'}`}>{icon}</div>
       <div className={`text-xs font-black uppercase tracking-widest ${active ? 'text-black' : 'text-white'}`}>{title}</div>
       <div className={`text-[8px] font-black uppercase tracking-tighter mt-1 ${active ? 'text-black/60' : 'text-white/30'}`}>{desc}</div>
       {active && <div className="absolute top-0 right-0 w-8 h-8 bg-black/10 flex items-center justify-center text-[10px]">✔</div>}
    </button>
  );
}
