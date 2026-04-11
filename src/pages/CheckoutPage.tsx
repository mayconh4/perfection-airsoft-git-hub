import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * CHECKOUT PHOENIX V4 - SMART FLOW
 * 2 etapas para ingressos/drops · 3 etapas para equipamentos
 */

const API_V2 = "https://seewdqetyolfmqsiyban.supabase.co/functions/v1/asaas-checkout-v2";

// ─── Pricing constants ─────────────────────────────────────────────
// PIX = preço base do produto (ex: R$3.630)
// Cartão 1x = R$3.720 (spread fixo definido pelo lojista)
// CARD_SPREAD = 3720/3630 → aplica proporcionalmente a qualquer produto
const CARD_SPREAD = 3720 / 3630; // ≈ 1.0248

const INSTALLMENT_RATES: Record<number, number> = {
  1: 1.000, 2: 1.050, 3: 1.070, 4: 1.090,  5: 1.110,
  6: 1.130, 7: 1.150, 8: 1.170, 9: 1.190, 10: 1.210,
  11: 1.230, 12: 1.250,
};

// Preço PIX → base cartão → + juros do plano
function calcInstallment(pixTotal: number, n: number) {
  const cardBase = pixTotal * CARD_SPREAD; // ex: 3630 → 3720
  const withInterest = cardBase * (INSTALLMENT_RATES[n] ?? 1);
  return { perInstallment: withInterest / n, totalFinal: withInterest, cardBase };
}
// ──────────────────────────────────────────────────────────────────

type Step = 'dados' | 'endereco' | 'pagamento';

export function CheckoutPage() {
  const { items, total, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Detecta se há produto físico no carrinho
  const isPhysical = useMemo(
    () => items.some(i => i.product?.brand !== 'TICKET' && i.product?.brand !== 'DROP'),
    [items]
  );

  // Fluxo: 2 etapas (tickets/drops) ou 3 (físicos)
  const STEPS: Step[] = isPhysical ? ['dados', 'endereco', 'pagamento'] : ['dados', 'pagamento'];
  const STEP_LABELS: Record<Step, string> = {
    dados: 'Identificação',
    endereco: 'Entrega',
    pagamento: 'Pagamento',
  };

  const [step, setStep] = useState<Step>('dados');
  const [method, setMethod] = useState<'pix' | 'card' | 'boleto' | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<any>(null);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);

  const [form, setForm] = useState(() => {
    const saved = localStorage.getItem('tactical_p_data');
    return saved
      ? JSON.parse(saved)
      : { name: '', cpf: '', email: user?.email || '', phone: '', cep: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '' };
  });

  const [cardForm, setCardForm] = useState({ number: '', holder: '', expiry: '', ccv: '', installments: 1 });
  const [cardConfirmed, setCardConfirmed] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState(false);

  useEffect(() => {
    localStorage.setItem('tactical_p_data', JSON.stringify(form));
  }, [form]);

  // Realtime listener de pagamento confirmado
  useEffect(() => {
    if (!order?.id || isConfirmed) return;
    const channel = supabase
      .channel(`order-status-${order.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${order.id}` },
        (payload) => {
          if (payload.new.status === 'pago' || payload.new.pix_confirmado) setIsConfirmed(true);
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [order?.id, isConfirmed]);

  // ViaCEP — máscara + validação + autocomplete
  const handleCepChange = async (raw: string) => {
    // Aceita apenas dígitos e hífen, aplica máscara 00000-000
    const digits = raw.replace(/\D/g, '').slice(0, 8);
    const masked = digits.length > 5 ? digits.slice(0, 5) + '-' + digits.slice(5) : digits;
    setForm((f: any) => ({ ...f, cep: masked }));
    setCepError(false);

    if (digits.length === 8) {
      setCepLoading(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
        const data = await res.json();
        if (data.erro) {
          setCepError(true);
        } else {
          setForm((f: any) => ({
            ...f,
            street: data.logradouro || f.street,
            neighborhood: data.bairro || f.neighborhood,
            city: data.localidade || f.city,
            state: data.uf || f.state,
          }));
        }
      } catch { setCepError(true); }
      finally { setCepLoading(false); }
    } else if (digits.length > 0 && digits.length < 8) {
      // Incompleto mas usuário já digitou algo — não marca erro ainda
      setCepError(false);
    }
  };

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 'dados') {
      if (!form.name || !form.cpf || !form.email) return setError('Preencha todos os campos obrigatórios.');
      setError(null);
      setStep(isPhysical ? 'endereco' : 'pagamento');
    } else if (step === 'endereco') {
      if (cepError) return setError('CEP inválido. Verifique e tente novamente.');
      if (!form.cep || form.cep.replace(/\D/g,'').length < 8) return setError('Informe um CEP válido com 8 dígitos.');
      if (!form.street || !form.number) return setError('Informe o endereço completo.');
      setError(null);
      setStep('pagamento');
    }
  };

  const generatePayment = async (selectedMethod: 'pix' | 'card' | 'boleto') => {
    setMethod(selectedMethod);
    setProcessing(true);
    setError(null);
    try {
      // For card, charge the correct amount (PIX base + spread + any interest)
      const chargeTotal = selectedMethod === 'card'
        ? calcInstallment(total, cardForm.installments).totalFinal
        : total;

      let currentOrder = order;
      if (!currentOrder) {
        const oResp = await fetch(`${API_V2}/create-order`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerData: form,
            total: chargeTotal,
            items: items.map(i => ({ id: i.product.id, name: i.product.name, quantity: i.quantity, price: i.product.price }))
          })
        });
        currentOrder = await oResp.json();
        if (!oResp.ok) throw new Error(currentOrder.error || 'Erro no protocolo do pedido');
        setOrder(currentOrder);
      }
      const pResp = await fetch(`${API_V2}/generate-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: currentOrder.id,
          method: selectedMethod,
          customerData: form,
          total: chargeTotal,
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
              postalCode: form.cep?.replace(/\D/g, '') || '01001000',
              addressNumber: form.number || 'SN',
              phone: form.phone.replace(/\D/g, '')
            }
          } : null,
          installments: cardForm.installments
        })
      });
      const pData = await pResp.json();
      if (!pResp.ok) throw new Error('Não foi possível processar o pagamento. Verifique os dados e tente novamente.');
      setPaymentData(pData);
      if (selectedMethod === 'card') setCardConfirmed(true);
    } catch (err: any) {
      // Nunca expõe erros internos ao cliente
      const raw = err.message || '';
      const isInternal = /gateway|asaas|supabase|function|fetch|network|500|502|503/i.test(raw);
      setError(isInternal ? 'Ocorreu um erro ao processar seu pagamento. Tente novamente ou escolha outro método.' : raw);
    } finally {
      setProcessing(false);
    }
  };

  const stepIndex = STEPS.indexOf(step);

  return (
    <div className="min-h-screen bg-[#050505] text-white pt-28 pb-20 px-4 overflow-hidden relative">
      <div className="absolute inset-0 pointer-events-none opacity-5">
        <div className="h-full w-full" style={{ backgroundImage: 'linear-gradient(rgba(255,184,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,184,0,0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">

        {/* SECURITY TRUST BAR */}
        <div className="mb-8 bg-green-950/60 border border-green-500/20 px-5 py-3 flex flex-wrap items-center justify-center gap-4 md:gap-8">
          {[
            { icon: 'lock', label: 'Conexão SSL 256-bit' },
            { icon: 'verified_user', label: 'Pagamento PCI DSS' },
            { icon: 'encrypted', label: 'Dados Criptografados' },
            { icon: 'shield_with_heart', label: 'Compra 100% Protegida' },
          ].map((b, i) => (
            <React.Fragment key={b.icon}>
              {i > 0 && <div className="hidden md:block w-px h-4 bg-green-500/20" />}
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-green-400 text-lg">{b.icon}</span>
                <span className="text-[9px] font-black uppercase tracking-widest text-green-400">{b.label}</span>
              </div>
            </React.Fragment>
          ))}
        </div>

        {/* HEADER */}
        <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
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

          {/* PAINEL PRINCIPAL */}
          <div className="lg:col-span-2 space-y-6">

            {/* STEPPER — alinhado com o conteúdo */}
            <div className="flex items-center gap-0">
              {STEPS.map((s, i) => (
                <React.Fragment key={s}>
                  <div className={`flex items-center gap-2 px-4 py-2 border transition-all ${
                    s === step
                      ? 'border-primary bg-primary/10 text-primary'
                      : i < stepIndex
                      ? 'border-green-500/30 bg-green-500/5 text-green-400'
                      : 'border-white/10 text-white/20'
                  }`}>
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black ${
                      i < stepIndex ? 'bg-green-500 text-black' : s === step ? 'bg-primary text-black' : 'bg-white/10'
                    }`}>
                      {i < stepIndex ? '✓' : String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="text-[9px] font-black uppercase tracking-widest hidden sm:block">{STEP_LABELS[s]}</span>
                  </div>
                  {i < STEPS.length - 1 && <div className={`h-px flex-1 ${i < stepIndex ? 'bg-green-500/30' : 'bg-white/5'}`} />}
                </React.Fragment>
              ))}
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 px-4 py-3 text-red-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                <span className="material-symbols-outlined text-base">warning</span>
                {error}
              </div>
            )}

            {/* ETAPA 1: DADOS PESSOAIS */}
            <AnimatePresence mode="wait">
              {step === 'dados' && (
                <motion.section key="dados" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                  <StepHeader num="01" title="Protocolo de Identidade" />
                  <div className="bg-white/[0.03] border border-white/10 p-8">
                    <form onSubmit={handleNextStep} autoComplete="on" className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <Input label="Nome Completo *" name="name" autoComplete="name" value={form.name} onChange={v => setForm({...form, name: v})} />
                      <Input label="CPF *" name="cpf" autoComplete="off" value={form.cpf} onChange={v => setForm({...form, cpf: v})} placeholder="000.000.000-00" />
                      <Input label="E-mail *" name="email" autoComplete="email" value={form.email} onChange={v => setForm({...form, email: v})} type="email" />
                      <Input label="WhatsApp" name="tel" autoComplete="tel" value={form.phone} onChange={v => setForm({...form, phone: v})} placeholder="(00) 00000-0000" />
                      <button type="submit" className="col-span-1 md:col-span-2 bg-primary text-black font-black py-4 uppercase tracking-[0.2em] text-xs hover:bg-amber-300 transition-all mt-2">
                        {isPhysical ? 'Próximo: Endereço →' : 'Próximo: Pagamento →'}
                      </button>
                    </form>
                  </div>

                </motion.section>
              )}

              {/* ETAPA 2: ENDEREÇO (só físicos) */}
              {step === 'endereco' && isPhysical && (
                <motion.section key="endereco" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                  <StepHeader num="02" title="Endereço de Entrega" />
                  <div className="bg-white/[0.03] border border-white/10 p-8">
                    <form onSubmit={handleNextStep} autoComplete="on" className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="relative">
                        <Input
                          label={cepLoading ? 'CEP — buscando...' : cepError ? 'CEP inválido' : 'CEP *'}
                          name="postal-code"
                          autoComplete="postal-code"
                          value={form.cep}
                          onChange={handleCepChange}
                          placeholder="00000-000"
                          className={cepError ? 'border-red-500 focus:border-red-500 text-red-400' : ''}
                        />
                        {cepLoading && <div className="absolute right-3 top-9 w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />}
                        {cepError && !cepLoading && <span className="absolute right-3 top-9 material-symbols-outlined text-red-500 text-base">error</span>}
                      </div>
                      <Input label="Número *" name="address-line2" autoComplete="address-line2" value={form.number} onChange={v => setForm({...form, number: v})} placeholder="123" />
                      <Input label="Rua" name="address-line1" autoComplete="address-line1" value={form.street} onChange={v => setForm({...form, street: v})} placeholder="Preenchido pelo CEP" />
                      <Input label="Complemento" name="address-level3" autoComplete="address-level3" value={form.complement} onChange={v => setForm({...form, complement: v})} placeholder="Apto, bloco..." />
                      <Input label="Bairro" name="address-level4" autoComplete="address-level4" value={form.neighborhood} onChange={v => setForm({...form, neighborhood: v})} />
                      <Input label="Cidade" name="address-level2" autoComplete="address-level2" value={form.city} onChange={v => setForm({...form, city: v})} />

                      <div className="col-span-1 md:col-span-2 flex gap-3 mt-2">
                        <button type="button" onClick={() => setStep('dados')} className="flex-none border border-white/10 text-white/40 font-black py-4 px-6 uppercase text-xs hover:border-white/30 transition-all">
                          ← Voltar
                        </button>
                        <button type="submit" className="flex-1 bg-primary text-black font-black py-4 uppercase tracking-[0.2em] text-xs hover:bg-amber-300 transition-all">
                          Próximo: Pagamento →
                        </button>
                      </div>
                    </form>
                  </div>
                </motion.section>
              )}

              {/* ETAPA PAGAMENTO */}
              {step === 'pagamento' && (
                <motion.section key="pagamento" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-6">
                  <div className="flex items-center justify-between">
                    <StepHeader num={isPhysical ? '03' : '02'} title="Arsenal de Pagamento" />
                    <button onClick={() => setStep(isPhysical ? 'endereco' : 'dados')} className="text-[9px] text-white/30 uppercase tracking-widest hover:text-white transition-all">
                      ← Voltar
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <PaymentOption active={method === 'pix'} onClick={() => generatePayment('pix')} title="Pix" desc={`R$ ${total.toFixed(2)} — Melhor preço`} icon="⚡" />
                    <PaymentOption active={method === 'card'} onClick={() => setMethod('card')} title="Cartão" desc={`Até 6x sem juros`} icon="💳" />
                    <PaymentOption active={method === 'boleto'} onClick={() => generatePayment('boleto')} title="Boleto" desc="3 dias úteis" icon="📄" />
                  </div>

                  {/* CARD FORM — sempre no DOM para o Chrome detectar e oferecer autofill */}
                  <form
                    autoComplete="on"
                    onSubmit={e => { e.preventDefault(); generatePayment('card'); }}
                    style={{ display: method === 'card' && !cardConfirmed && !processing && !error ? 'block' : 'none' }}
                    className="bg-white/[0.03] border border-white/10 p-8 space-y-4 text-left"
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-white/5">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-green-400 text-base">lock</span>
                        <span className="text-[9px] font-black uppercase tracking-widest text-green-400">Ambiente Seguro — SSL 256-bit</span>
                      </div>
                      <div className="flex items-center gap-2 opacity-60">
                        <div className="bg-white px-2 py-0.5 text-[8px] font-black text-blue-800 tracking-widest">VISA</div>
                        <div className="bg-[#EB001B] px-1.5 py-0.5 rounded-full w-5 h-5 -mr-2.5 opacity-90" />
                        <div className="bg-[#F79E1B] px-1.5 py-0.5 rounded-full w-5 h-5 opacity-90" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <Input label="Número do Cartão" id="cc-number" name="cc-number" autoComplete="cc-number" value={cardForm.number} onChange={v => setCardForm({...cardForm, number: v})} type="tel" placeholder="0000 0000 0000 0000" />
                      </div>
                      <Input label="Nome no Cartão" id="cc-name" name="cc-name" autoComplete="cc-name" value={cardForm.holder} onChange={v => setCardForm({...cardForm, holder: v.toUpperCase()})} className="uppercase" />
                      <div className="grid grid-cols-2 gap-3">
                        <Input label="Validade" id="cc-exp" name="cc-exp" autoComplete="cc-exp" value={cardForm.expiry} onChange={v => {
                          const digits = v.replace(/\D/g, '').slice(0, 4);
                          const masked = digits.length > 2 ? digits.slice(0,2) + '/' + digits.slice(2) : digits;
                          setCardForm({...cardForm, expiry: masked});
                        }} type="tel" placeholder="MM/AA" />
                        <Input label="CVV 🔒" id="cc-csc" name="cc-csc" autoComplete="cc-csc" value={cardForm.ccv} onChange={v => setCardForm({...cardForm, ccv: v})} type="tel" placeholder="•••" />
                      </div>
                    </div>
                    <InstallmentSelect total={total} value={cardForm.installments} onChange={v => setCardForm({...cardForm, installments: v})} />
                    <div className="flex items-center justify-center gap-2 py-1">
                      <span className="material-symbols-outlined text-green-400 text-base">shield</span>
                      <span className="text-[10px] font-black uppercase tracking-widest text-green-400">Compra Segura</span>
                    </div>
                    <button type="submit" className="w-full bg-primary text-black font-black py-4 uppercase text-xs tracking-widest flex items-center justify-center gap-2 hover:bg-amber-300 active:scale-[0.98] transition-all">
                      <span className="material-symbols-outlined text-base">lock</span>
                      Confirmar Pagamento Seguro
                    </button>
                  </form>

                  {/* PAINEL DINÂMICO — PIX, Boleto, loading, erro, confirmação */}
                  <div className={`bg-white/[0.03] border border-white/10 p-8 min-h-[280px] flex flex-col items-center justify-center text-center ${
                    method === 'card' && !cardConfirmed && !processing && !error ? 'hidden' : ''
                  }`}>
                    {processing ? (
                      <div className="space-y-4">
                        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                        <p className="text-[10px] font-black tracking-widest text-primary uppercase">Processando pagamento...</p>
                      </div>
                    ) : error ? (
                      <div className="text-red-500 space-y-4">
                        <span className="text-4xl">⚠️</span>
                        <p className="font-black uppercase text-xs tracking-widest">{error}</p>
                        <button onClick={() => setError(null)} className="text-[10px] underline uppercase">Tentar outro método</button>
                      </div>
                    ) : cardConfirmed ? (
                      <ConfirmationBlock clearCart={clearCart} navigate={navigate} isPhysical={isPhysical} />
                    ) : method === 'pix' && paymentData ? (
                      isConfirmed ? <ConfirmationBlock clearCart={clearCart} navigate={navigate} isPhysical={isPhysical} /> : (
                        <div className="space-y-6 w-full">
                          <div className="bg-white p-4 inline-block rounded-sm">
                            <img src={`data:image/png;base64,${paymentData.qrCodeBase64}`} alt="QR Code" className="w-40 h-40" />
                          </div>
                          <div className="w-full max-w-sm mx-auto bg-black border border-white/10 p-3 flex gap-2">
                            <input readOnly value={paymentData.qrCode} className="bg-transparent text-[9px] font-mono text-white/40 outline-none flex-1 truncate" />
                            <button onClick={() => navigator.clipboard.writeText(paymentData.qrCode)} className="bg-primary text-black text-[9px] font-black px-4">COPIAR</button>
                          </div>
                          <div className="flex items-center justify-center gap-2 animate-pulse">
                            <div className="w-2 h-2 bg-primary rounded-full" />
                            <span className="text-[9px] font-black tracking-[0.3em] text-primary uppercase">Aguardando pagamento...</span>
                          </div>
                        </div>
                      )
                    ) : method === 'boleto' && paymentData ? (
                      isConfirmed ? <ConfirmationBlock clearCart={clearCart} navigate={navigate} isPhysical={isPhysical} /> : (
                        <div className="space-y-6">
                          <p className="text-xs font-black uppercase text-white/60">Boleto gerado com sucesso</p>
                          <div className="bg-black/50 p-4 border border-white/5 font-mono text-[10px] break-all">{paymentData.identificationField}</div>
                          <a href={paymentData.bankSlipUrl} target="_blank" rel="noopener noreferrer" className="inline-block bg-primary text-black font-black px-10 py-4 uppercase text-[10px] tracking-widest">Abrir PDF</a>
                        </div>
                      )
                    ) : (
                      <p className="text-xs font-black uppercase text-white/20 tracking-widest leading-relaxed">Selecione um método acima para<br />iniciar a autorização</p>
                    )}
                  </div>
                </motion.section>
              )}
            </AnimatePresence>
          </div>

          {/* RESUMO */}
          <aside className="lg:col-span-1">
            <div className="bg-white/[0.02] border border-white/5 p-8 backdrop-blur-xl relative overflow-hidden sticky top-28">
              <div className="absolute top-0 right-0 p-2 text-[8px] font-mono text-primary/30 uppercase tracking-tighter">REF: {order?.id?.slice(0, 8) || 'PENDING'}</div>
              <h3 className="text-[10px] font-black tracking-[0.4em] text-primary uppercase mb-8 border-b border-primary/20 pb-4">Sumário da Carga</h3>
              <div className="space-y-6 mb-12">
                {items.map((item, i) => (
                  <div key={i} className="flex justify-between items-start gap-3">
                    {item.product?.image_url && (
                      <img src={item.product.image_url} alt={item.product.name} className="w-10 h-10 object-cover rounded-sm shrink-0 opacity-70" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black uppercase text-white mb-0.5 truncate">{item.product.name}</p>
                      <p className="text-[8px] font-bold text-white/30 uppercase">Qtd: {item.quantity}</p>
                    </div>
                    <span className="text-[10px] font-mono text-white/60 shrink-0">R$ {(item.product.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-3 pt-6 border-t border-white/5">
                {isPhysical && (
                  <>
                    <div className="flex justify-between text-[10px] font-bold text-white/40 uppercase">
                      <span>Frete</span>
                      <span>Calculado no envio</span>
                    </div>
                    <div className="flex justify-between text-[10px] font-bold text-white/40 uppercase">
                      <span>Prazo estimado</span>
                      <span>~20 dias úteis</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between items-center pt-3 border-t border-white/5">
                  <div>
                    <span className="text-[8px] font-bold text-green-400/80 uppercase block">⚡ PIX / À vista</span>
                    <span className="text-xl font-black italic text-primary">R$ {total.toFixed(2)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[8px] font-bold text-white/30 uppercase block">💳 Cartão 1x</span>
                    <span className="text-sm font-black text-white/50">R$ {(total * CARD_SPREAD).toFixed(2)}</span>
                  </div>
                </div>
              </div>
              <div className="mt-8 pt-6 border-t border-white/5 space-y-3">
                {[
                  { icon: 'lock', label: 'Checkout 100% Seguro' },
                  { icon: 'verified_user', label: 'Pagamento Certificado' },
                  { icon: 'encrypted', label: 'Criptografia SSL 256-bit' },
                  { icon: 'shield_with_heart', label: 'Dados 100% Protegidos' },
                ].map(b => (
                  <div key={b.icon} className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-green-400 text-sm">{b.icon}</span>
                    <span className="text-[8px] font-black uppercase tracking-widest text-green-400/80">{b.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function InstallmentSelect({ total, value, onChange }: { total: number; value: number; onChange: (v: number) => void }) {
  const selected = calcInstallment(total, value);
  return (
    <div className="space-y-1">
      <select
        className="w-full bg-black/50 border border-white/10 p-4 text-xs font-black uppercase outline-none focus:border-primary"
        value={value}
        onChange={e => onChange(parseInt(e.target.value))}
      >
        {Array.from({ length: 12 }, (_, i) => i + 1).map(n => {
          const { perInstallment, totalFinal } = calcInstallment(total, n);
          const interestPct = ((INSTALLMENT_RATES[n] ?? 1) - 1) * 100;
          return (
            <option key={n} value={n} className="bg-[#111] text-white">
              {n}x de R$ {perInstallment.toFixed(2)}{n > 1 ? ` — Total R$ ${totalFinal.toFixed(2)} (+${interestPct.toFixed(1)}%)` : ' — Sem juros'}
            </option>
          );
        })}
      </select>
      {/* Linha de resumo abaixo do select */}
      <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-white/40 px-1">
        <span>{value}x de R$ {selected.perInstallment.toFixed(2)}</span>
        <span>Total: R$ {selected.totalFinal.toFixed(2)}</span>
      </div>
    </div>
  );
}


// ─── Sub-components ───────────────────────────────────────────────

function StepHeader({ num, title }: { num: string; title: string }) {
  return (
    <div className="flex items-center gap-4 mb-6">
      <div className="w-8 h-8 bg-primary text-black flex items-center justify-center font-black rounded-full text-xs">{num}</div>
      <h2 className="text-xl font-black italic uppercase tracking-tight">{title}</h2>
    </div>
  );
}

function ConfirmationBlock({ clearCart, navigate, isPhysical }: { clearCart: () => void; navigate: (path: string) => void; isPhysical: boolean }) {
  return (
    <div className="w-full flex flex-col items-center gap-5 py-6">
      <div className="w-14 h-14 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center">
        <span className="material-symbols-outlined text-green-400 text-3xl">check_circle</span>
      </div>
      <div className="text-center space-y-1">
        <p className="text-sm font-black text-green-400 uppercase tracking-widest">Pagamento Confirmado</p>
        <p className="text-[10px] text-white/40 uppercase tracking-wider">{isPhysical ? 'Seu pedido está sendo preparado' : 'Seus bilhetes estão disponíveis'}</p>
      </div>
      {!isPhysical && (
        <button onClick={() => { clearCart(); navigate('/meus-ingressos'); }} className="bg-primary text-black text-[9px] font-black uppercase tracking-widest px-8 py-3 hover:bg-amber-300 transition-all">
          Ver Meus Bilhetes
        </button>
      )}
      <button onClick={() => { clearCart(); navigate('/'); }} className="bg-white/5 border border-white/10 text-white/60 text-[9px] font-black uppercase tracking-widest px-8 py-3 hover:text-white transition-all">
        Voltar à Loja
      </button>
    </div>
  );
}

function Input({ label, value, onChange, type = 'text', placeholder = '', autoComplete, name, id, className = '' }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; autoComplete?: string; name?: string; id?: string; className?: string;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id || name} className="text-[9px] font-black text-white/40 tracking-widest uppercase">{label}</label>
      <input
        id={id || name} type={type} name={name} autoComplete={autoComplete} value={value}
        onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className={`w-full bg-black/60 border border-white/10 px-4 py-4 text-xs font-sans outline-none focus:border-primary transition-all rounded-sm placeholder:text-white/5 ${className}`}
      />
    </div>
  );
}

function PaymentOption({ active, onClick, title, desc, icon }: { active: boolean; onClick: () => void; title: string; desc: string; icon: string }) {
  return (
    <button onClick={onClick} className={`p-6 border text-left transition-all duration-300 relative overflow-hidden group ${active ? 'bg-primary border-primary' : 'bg-white/[0.02] border-white/10 hover:border-white/30'}`}>
      <div className={`text-2xl mb-4 group-hover:scale-110 transition-transform ${active ? 'grayscale-0' : 'grayscale'}`}>{icon}</div>
      <div className={`text-xs font-black uppercase tracking-widest ${active ? 'text-black' : 'text-white'}`}>{title}</div>
      <div className={`text-[8px] font-black uppercase tracking-tighter mt-1 ${active ? 'text-black/60' : 'text-white/30'}`}>{desc}</div>
      {active && <div className="absolute top-0 right-0 w-8 h-8 bg-black/10 flex items-center justify-center text-[10px]">✔</div>}
    </button>
  );
}
