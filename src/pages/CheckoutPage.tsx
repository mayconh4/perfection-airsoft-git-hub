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

  // Fluxo de Etapas
  const [step, setStep] = useState<'dados' | 'pagamento'>('dados');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados do Pedido
  const [orderId, setOrderId] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<'pix' | 'card' | 'boleto' | null>(null);
  const [pixData, setPixData] = useState<any>(null);
  const [boletoData, setBoletoData] = useState<any>(null);
  const [pixConfirmed, setPixConfirmed] = useState(false);

  // Formulários com persistência robusta
  const [form, setForm] = useState({
    name: '', 
    cpf: '13561055648', // CPF padrão para testes do Maycon
    email: user?.email || '', 
    phone: ''
  });
  const [isLoaded, setIsLoaded] = useState(false);

  // 1. Carregar dados salvos ao iniciar (uma única vez)
  useEffect(() => {
    const saved = localStorage.getItem('checkout_customer_data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setForm(prev => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error("Erro ao carregar dados salvos:", e);
      }
    }
    setIsLoaded(true); // Marca que o carregamento inicial terminou
  }, []);

  // 2. Salvar dados ao mudar (após carregamento inicial)
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('checkout_customer_data', JSON.stringify(form));
    }
  }, [form, isLoaded]);

  const [cardForm, setCardForm] = useState({
    number: '', holder: '', expiry: '', ccv: '', installments: 1
  });

  // Monitoramento de Pagamento (Realtime + Polling Acelerado)
  useEffect(() => {
    let interval: any;
    
    if (orderId && !pixConfirmed) {
      // 1. Polling de Alta Frequência (Plano de Backup)
      // Reduzido para 2 segundos para maior agilidade
      interval = setInterval(async () => {
        try {
          const resp = await fetch(`${API_V2}/status/${orderId}`, {
            headers: {
              'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
            }
          });
          if (resp.ok) {
            const data = await resp.json();
            // Verifica múltiplos campos de confirmação para garantir
            if (data.pix_confirmado || data.status === 'confirmed' || data.status === 'pago') {
              console.log("[Checkout] Pagamento detectado via Polling!");
              setPixConfirmed(true);
              clearInterval(interval);
            }
          }
        } catch (err) {
          console.error("Erro polling:", err);
        }
      }, 2000); 

      // 2. Realtime Listener (Opcional se configurado no banco)
      // Se o Realtime estiver ativo na tabela 'orders', isso será instantâneo
      // (Mantido como tentativa silenciosa)
    }
    
    return () => clearInterval(interval);
  }, [orderId, pixConfirmed]);


  const handleNextToPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.cpf || !form.name || !form.email) {
      setError("Preencha todos os campos obrigatórios.");
      return;
    }
    setStep('pagamento');
  };

  const handleProcessOrder = async () => {
    if (!selectedMethod) {
      setError("Selecione um método de pagamento.");
      return;
    }

    setError(null);
    setProcessing(true);

    try {
      // 1. Criar Pedido (Se ainda não foi criado)
      let currentOrderId = orderId;
      if (!currentOrderId) {
        const orderResp = await fetch(`${API_V2}/create-order`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
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
        const orderResult = await orderResp.json();
        if (!orderResp.ok) throw new Error(orderResult.error || 'Erro ao criar protocolo');
        currentOrderId = orderResult.id;
        setOrderId(currentOrderId);
      }

      // 2. Gerar Pagamento baseado no método
      if (selectedMethod === 'pix') {
        const pResp = await fetch(`${API_V2}/generate-pix`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({ orderId: currentOrderId, customerData: form, total })
        });
        const pData = await pResp.json();
        if (!pResp.ok) throw new Error(pData.error || 'Erro ao gerar Pix');
        setPixData(pData);
      } else if (selectedMethod === 'boleto') {
        const bResp = await fetch(`${API_V2}/generate-boleto`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({ orderId: currentOrderId, customerData: form, total })
        });
        const bData = await bResp.json();
        if (!bResp.ok) throw new Error(bData.error || 'Erro ao gerar Boleto');
        setBoletoData(bData);
      } else if (selectedMethod === 'card') {
        const cResp = await fetch(`${API_V2}/generate-card`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            orderId: currentOrderId,
            customerData: form,
            total,
            creditCard: {
              holderName: cardForm.holder,
              number: cardForm.number.replace(/\s/g, ''),
              expiryMonth: cardForm.expiry.split('/')[0],
              expiryYear: '20' + cardForm.expiry.split('/')[1],
              ccv: cardForm.ccv
            },
            creditCardHolderInfo: {
              name: form.name, email: form.email,
              cpfCnpj: form.cpf.replace(/\D/g, ''),
              postalCode: "01001000", addressNumber: "SN",
              phone: form.phone.replace(/\D/g, '')
            },
            installmentCount: cardForm.installments
          })
        });
        if (!cResp.ok) {
           const cData = await cResp.json();
           throw new Error(cData.error || 'Pagamento recusado');
        }
        setPixConfirmed(true);
      }
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
      // Redireciona para cadastro forçado com dados preenchidos
      const params = new URLSearchParams({
        mode: 'signup',
        redirect: '/meus-ingressos',
        email: form.email,
        name: form.name,
        paid: 'true'
      });
      navigate(`/login?${params.toString()}`);
    }
  };

  if (pixConfirmed) {
    return (
      <TacticalSuccessModal 
        isOpen={true}
        onClose={handleFinish}
        message="PAGAMENTO CONFIRMADO. Seus itens já foram processados. Como você é um novo operador, finalize seu cadastro para acessar seu painel."
      />
    );
  }

  // Trava de Carrinho Vazio
  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full p-8 bg-red-500/10 border border-red-500/20 text-center space-y-6">
           <div className="text-6xl animate-bounce">⚠️</div>
           <h1 className="text-2xl font-black italic tracking-tighter text-red-500 uppercase leading-none">CARRINHO VAZIO</h1>
           <p className="text-[10px] font-black tracking-[0.2em] text-white/60 uppercase leading-relaxed">
             MENSAGEM TÁTICA: ADICIONE EQUIPAMENTOS AO CARRINHO ANTES DE PROSSEGUIR COM A OPERAÇÃO DE CHECKOUT.
           </p>
           <button 
            onClick={() => navigate('/')}
            className="w-full bg-red-500 text-white font-black py-4 text-[10px] tracking-[0.3em] uppercase hover:bg-white hover:text-black transition-all"
           >
             ← VOLTAR AO ARSENAL
           </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pt-24 pb-12 px-4 font-sans selection:bg-primary selection:text-black">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER TÁTICO */}
        <div className="mb-12 text-center lg:text-left">
          <h1 className="text-4xl lg:text-6xl font-black italic tracking-tighter text-primary uppercase leading-tight">
            FINALIZAR <span className="text-white">OPERAÇÃO</span>
          </h1>
        </div>

        {/* STEPPER DINÂMICO */}
        <div className="mb-12 flex bg-white/[0.03] border border-white/5 rounded-sm overflow-hidden text-[10px] font-black tracking-widest uppercase">
           <div className={`flex-1 py-4 px-6 flex items-center justify-center gap-2 border-r border-white/5 ${step === 'dados' ? 'text-primary' : 'text-primary/40'}`}>
              <span className="text-sm">✓</span> IDENTIFICAÇÃO
           </div>
           <div className={`flex-1 py-4 px-6 flex items-center justify-center gap-2 border-r border-white/5 ${step === 'pagamento' ? 'bg-primary text-black' : 'text-white/20'}`}>
              03 PAGAMENTO
           </div>
           <div className="flex-1 py-4 px-6 flex items-center justify-center gap-2 text-white/10">
              04 FINALIZAÇÃO
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* COLUNA ESQUERDA: FLUXO PRINCIPAL */}
          <div className="lg:col-span-8 space-y-8">
            
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 flex items-center gap-3 animate-shake">
                <span className="text-xl">⚠️</span>
                <span className="text-[10px] font-black tracking-widest uppercase">{error}</span>
              </div>
            )}

            {step === 'dados' ? (
              <div className="bg-white/[0.02] border border-white/5 p-8 lg:p-12">
                 <h2 className="text-xl font-black italic tracking-tight text-white mb-8 border-l-4 border-primary pl-4">PROTOCOLOS DE IDENTIDADE</h2>
                 <form onSubmit={handleNextToPayment} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="space-y-2">
                          <label className="text-[9px] font-black text-white/40 tracking-widest uppercase">Nome Completo</label>
                          <input 
                            required 
                            value={form.name}
                            onChange={e => setForm({...form, name: e.target.value})}
                            className="w-full bg-white/[0.03] border border-white/10 px-4 py-4 text-sm font-medium outline-none focus:border-primary transition-all rounded-sm"
                          />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[9px] font-black text-white/40 tracking-widest uppercase">CPF Operacional</label>
                          <input 
                            required 
                            placeholder="000.000.000-00"
                            value={form.cpf}
                            onChange={e => setForm({...form, cpf: e.target.value})}
                            className="w-full bg-white/[0.03] border border-white/10 px-4 py-4 text-sm font-medium outline-none focus:border-primary transition-all rounded-sm"
                          />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[9px] font-black text-white/40 tracking-widest uppercase">E-mail de Contato</label>
                          <input 
                            required 
                            type="email"
                            value={form.email}
                            onChange={e => setForm({...form, email: e.target.value})}
                            className="w-full bg-white/[0.03] border border-white/10 px-4 py-4 text-sm font-medium outline-none focus:border-primary transition-all rounded-sm"
                          />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[9px] font-black text-white/40 tracking-widest uppercase">WhatsApp (Opcional)</label>
                          <input 
                            placeholder="(00) 00000-0000"
                            value={form.phone}
                            onChange={e => setForm({...form, phone: e.target.value})}
                            className="w-full bg-white/[0.03] border border-white/10 px-4 py-4 text-sm font-medium outline-none focus:border-primary transition-all rounded-sm"
                          />
                       </div>
                    </div>
                    <button type="submit" className="w-full bg-primary hover:bg-white text-black font-black py-5 text-xs tracking-[0.3em] uppercase transition-all mt-8">
                       AVANÇAR PARA PAGAMENTO →
                    </button>
                 </form>
              </div>
            ) : (
              <div className="space-y-6">
                 <h2 className="text-xl font-black italic tracking-tight text-white mb-8 border-l-4 border-primary pl-4 uppercase">Configuração de Pagamento</h2>
                 
                 {/* MÉTODOS ESTILO ACORDEÃO */}
                 <div className="space-y-4">
                    
                    {/* PIX CONTAINER */}
                    <div className={`border ${selectedMethod === 'pix' ? 'border-primary' : 'border-white/10'} bg-white/[0.02] overflow-hidden transition-all duration-300`}>
                       <button 
                        onClick={() => setSelectedMethod('pix')}
                        className="w-full p-6 flex items-center justify-between text-left group"
                       >
                          <div className="flex items-center gap-6">
                             <span className="text-2xl font-black italic tracking-tighter text-[#00E5FF] group-hover:scale-110 transition-transform">PIX</span>
                             <div>
                                <h3 className="text-xs font-black tracking-widest uppercase text-white">Pix Instantâneo</h3>
                                <p className="text-[9px] font-bold text-[#00E5FF]/60 tracking-widest uppercase mt-1">Pagou, liberou!</p>
                             </div>
                          </div>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedMethod === 'pix' ? 'border-primary' : 'border-white/20'}`}>
                             {selectedMethod === 'pix' && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                          </div>
                       </button>

                       {selectedMethod === 'pix' && (
                          <div className="px-6 pb-8 animate-in slide-in-from-top-4 duration-300">
                             {pixData ? (
                               <div className="pt-6 border-t border-white/5 flex flex-col items-center">
                                  <div className="bg-white p-4 rounded-sm mb-6">
                                    <img src={`data:image/png;base64,${pixData.qrCodeBase64}`} alt="QR Code" className="w-48 h-48" />
                                  </div>
                                  <div className="w-full bg-black/40 border border-white/10 p-4 flex gap-4 items-center">
                                    <input readOnly value={pixData.qrCode} className="flex-1 bg-transparent text-[10px] font-mono text-white/50 outline-none truncate" />
                                    <button onClick={() => { navigator.clipboard.writeText(pixData.qrCode); alert("Copiado!"); }} className="bg-primary text-black text-[10px] font-black px-4 py-2 hover:bg-white transition-colors">COPIAR</button>
                                  </div>
                                  <div className="mt-8 flex items-center justify-center gap-3 animate-pulse">
                                     <div className="w-2 h-2 rounded-full bg-[#00E5FF]" />
                                     <span className="text-[10px] font-black tracking-widest text-[#00E5FF]/80 uppercase">Aguardando confirmação tática...</span>
                                  </div>
                               </div>
                             ) : (
                               <div className="pt-6 border-t border-white/5 space-y-6">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                     <div className="p-4 bg-white/[0.03] border border-white/5 flex flex-col gap-2">
                                        <span className="text-lg">⚡</span>
                                        <span className="text-[9px] font-black uppercase text-white/60">Aprovação Imediata</span>
                                     </div>
                                     <div className="p-4 bg-white/[0.03] border border-white/5 flex flex-col gap-2">
                                        <span className="text-lg">🛡️</span>
                                        <span className="text-[9px] font-black uppercase text-white/60">Zero Taxas</span>
                                     </div>
                                  </div>
                                  <button 
                                    onClick={handleProcessOrder}
                                    disabled={processing}
                                    className="w-full bg-primary text-black font-black py-5 text-xs tracking-[0.3em] uppercase hover:bg-white transition-all disabled:opacity-50"
                                  >
                                    {processing ? 'GERANDO PROTOCOLO...' : `PAGAR AGORA - R$ ${total.toFixed(2)}`}
                                  </button>
                               </div>
                             )}
                          </div>
                       )}
                    </div>

                    {/* CARD CONTAINER */}
                    <div className={`border ${selectedMethod === 'card' ? 'border-primary' : 'border-white/10'} bg-white/[0.02] overflow-hidden transition-all duration-300`}>
                       <button 
                        onClick={() => setSelectedMethod('card')}
                        className="w-full p-6 flex items-center justify-between text-left"
                       >
                          <div className="flex items-center gap-6">
                             <span className="text-2xl">💳</span>
                             <div>
                                <h3 className="text-xs font-black tracking-widest uppercase text-white">Cartão de Crédito</h3>
                                <p className="text-[9px] font-bold text-white/30 tracking-widest uppercase mt-1">Até 12x com juros reduzidos</p>
                             </div>
                          </div>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedMethod === 'card' ? 'border-primary' : 'border-white/20'}`}>
                             {selectedMethod === 'card' && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                          </div>
                       </button>

                       {selectedMethod === 'card' && (
                          <div className="px-6 pb-8 animate-in slide-in-from-top-4 duration-300">
                             <div className="pt-6 border-t border-white/5 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                   <input required placeholder="NÚMERO DO CARTÃO" value={cardForm.number} onChange={e => setCardForm({...cardForm, number: e.target.value})} className="col-span-1 md:col-span-2 bg-black/40 border border-white/10 px-4 py-4 text-xs font-mono outline-none focus:border-primary transition-all" />
                                   <input required placeholder="NOME NO CARTÃO" value={cardForm.holder} onChange={e => setCardForm({...cardForm, holder: e.target.value})} className="bg-black/40 border border-white/10 px-4 py-4 text-xs font-mono outline-none focus:border-primary transition-all" />
                                   <div className="flex gap-2">
                                      <input required placeholder="MM/AA" value={cardForm.expiry} onChange={e => setCardForm({...cardForm, expiry: e.target.value})} className="bg-black/40 border border-white/10 px-4 py-4 text-xs font-mono outline-none focus:border-primary transition-all flex-1" />
                                      <input required placeholder="CVV" value={cardForm.ccv} onChange={e => setCardForm({...cardForm, ccv: e.target.value})} className="bg-black/40 border border-white/10 px-4 py-4 text-xs font-mono outline-none focus:border-primary transition-all flex-1" />
                                   </div>
                                </div>
                                <select 
                                  value={cardForm.installments} 
                                  onChange={e => setCardForm({...cardForm, installments: parseInt(e.target.value)})}
                                  className="w-full bg-black/40 border border-white/10 px-4 py-4 text-xs font-mono outline-none focus:border-primary transition-all"
                                >
                                   {[1,2,3,4,5,6,10,12].map(i => (
                                     <option key={i} value={i} className="bg-neutral-900 border-none">{i}x de R$ {(total * (i > 1 ? 1.05 : 1) / i).toFixed(2)}</option>
                                   ))}
                                </select>
                                <button 
                                  onClick={handleProcessOrder}
                                  disabled={processing}
                                  className="w-full bg-primary text-black font-black py-5 text-xs tracking-[0.3em] uppercase hover:bg-white transition-all disabled:opacity-50"
                                >
                                  {processing ? 'AUTORIZANDO OPERAÇÃO...' : `CONFIRMAR PAGAMENTO - R$ ${total.toFixed(2)}`}
                                </button>
                             </div>
                          </div>
                       )}
                    </div>

                    {/* BOLETO CONTAINER */}
                    <div className={`border ${selectedMethod === 'boleto' ? 'border-primary' : 'border-white/10'} bg-white/[0.02] overflow-hidden transition-all duration-300`}>
                       <button 
                        onClick={() => setSelectedMethod('boleto')}
                        className="w-full p-6 flex items-center justify-between text-left"
                       >
                          <div className="flex items-center gap-6">
                             <span className="text-2xl">📄</span>
                             <div>
                                <h3 className="text-xs font-black tracking-widest uppercase text-white">Boleto Bancário</h3>
                                <p className="text-[9px] font-bold text-white/30 tracking-widest uppercase mt-1">Vencimento em 3 dias úteis</p>
                             </div>
                          </div>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedMethod === 'boleto' ? 'border-primary' : 'border-white/20'}`}>
                             {selectedMethod === 'boleto' && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                          </div>
                       </button>

                       {selectedMethod === 'boleto' && (
                          <div className="px-6 pb-8 animate-in slide-in-from-top-4 duration-300">
                             <div className="pt-6 border-t border-white/5 space-y-6">
                                {boletoData ? (
                                  <div className="space-y-4">
                                     <div className="bg-black/40 border border-white/10 p-6 text-center">
                                        <p className="text-[10px] font-mono text-white/80 break-all mb-4">{boletoData.identificationField}</p>
                                        <a href={boletoData.bankSlipUrl} target="_blank" rel="noreferrer" className="inline-block bg-primary text-black px-8 py-3 text-[10px] font-black uppercase">VISUALIZAR PDF</a>
                                     </div>
                                  </div>
                                ) : (
                                  <button 
                                    onClick={handleProcessOrder}
                                    disabled={processing}
                                    className="w-full bg-primary text-black font-black py-5 text-xs tracking-[0.3em] uppercase transition-all disabled:opacity-50 hover:bg-white"
                                  >
                                    {processing ? 'EMITINDO...' : 'GERAR BOLETO'}
                                  </button>
                                )}
                             </div>
                          </div>
                       )}
                    </div>

                 </div>

                 <button 
                  onClick={() => setStep('dados')}
                  className="text-[10px] font-black text-white/40 hover:text-primary transition-colors tracking-widest uppercase flex items-center gap-2"
                 >
                   ← REVISAR DADOS DE IDENTIDADE
                 </button>
              </div>
            )}
          </div>

          {/* COLUNA DIREITA: RESUMO DA OPERAÇÃO */}
          <div className="lg:col-span-4 sticky top-32">
             <div className="bg-white/[0.02] border border-white/5 p-8">
                <h2 className="text-sm font-black italic tracking-widest text-[#FFB800] uppercase mb-8 border-b border-white/5 pb-4">RESUMO DA OPERAÇÃO</h2>
                
                <div className="space-y-4 mb-12">
                   {items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center group">
                         <div className="flex flex-col">
                            <span className="text-[10px] font-black text-white group-hover:text-primary transition-colors uppercase leading-none">{item.product.name}</span>
                            <span className="text-[8px] font-bold text-white/20 uppercase tracking-widest mt-1">Qtde: {item.quantity}</span>
                         </div>
                         <span className="text-[10px] font-black italic text-white/60 uppercase">R$ {(item.product.price * item.quantity).toFixed(2)}</span>
                      </div>
                   ))}
                </div>

                <div className="border-t border-white/5 pt-8 space-y-4">
                   <div className="flex justify-between items-center opacity-40">
                      <span className="text-[10px] font-black tracking-widest uppercase">Subtotal</span>
                      <span className="text-[10px] font-black tracking-widest uppercase italic font-mono">R$ {total.toFixed(2)}</span>
                   </div>
                   <div className="flex justify-between items-center text-primary pt-2 border-t border-white/5 border-dashed">
                      <span className="text-xs font-black tracking-[0.2em] uppercase">TOTAL FINAL</span>
                      <span className="text-2xl font-black tracking-tighter italic">R$ {total.toFixed(2)}</span>
                   </div>
                </div>

                <div className="mt-12 space-y-2 opacity-20">
                   <p className="text-[8px] font-black tracking-[0.3em] uppercase text-center leading-relaxed">Operação segura • Criptografia militar Ativa</p>
                </div>
             </div>
          </div>

        </div>

        <div className="mt-20 pt-10 border-t border-white/5 text-center">
           <p className="text-[9px] font-black text-white/10 tracking-[0.5em] uppercase">CRYSTAL ARMSTRONG • TACTICAL CHECKOUT V2 • 2026</p>
        </div>

      </div>
    </div>
  );
}
