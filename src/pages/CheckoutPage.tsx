import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useCreateOrder } from '../hooks/useOrders';
import { formatPrice } from '../types/database';
import { DynamicCheckoutAccordion } from '../components/DynamicCheckoutAccordion';

const STEPS = ['Identificação', 'Endereço', 'Pagamento', 'Finalização'];

interface InputFieldProps {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  className?: string;
  required?: boolean;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  list?: string;
}

const InputField = ({ name, label, type = 'text', placeholder = '', className = '', required = true, value, onChange, list }: InputFieldProps) => (
  <div className={className}>
    <label className="block text-[9px] font-black text-slate-500 mb-1.5 tracking-[0.2em] uppercase">{label}</label>
    <input name={name} type={type} required={required} value={value} onChange={onChange} placeholder={placeholder} list={list}
      className="w-full bg-background-dark border border-white/10 text-white px-4 py-3 text-xs tracking-wide outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 placeholder:text-white/15 transition-colors"/>
  </div>
);

export function CheckoutPage() {
  const { items, total, selectedShipping, clearCart } = useCart();
  const { user } = useAuth();
  const { createOrder } = useCreateOrder();
  const navigate = useNavigate();

  // Estados
  const [step, setStep] = useState(0); 
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [paymentData, setPaymentData] = useState<{ qr_code?: string; qr_code_base64?: string; checkout_url?: string; order_id?: string; asaas_id?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false); // controle local do botão
  const [validatingStatus, setValidatingStatus] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'success' | 'expired'>('pending');
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutos em segundos
  const [pollCount, setPollCount] = useState(0);
  const [form, setForm] = useState({
    name: '', cpf: '', email: user?.email || '', phone: '',
    street: '', number: '', complement: '', district: '', city: '', state: '', cep: '',
    password: ''
  });

  const isPureRaffle = items.length > 0 && items.some(i => i.product?.brand === 'DROP' || i.product?.category?.slug === 'rifas');
  const isPureTicket = items.length > 0 && items.some(i => 
    i.product?.brand === 'TICKET' || 
    i.metadata?.type === 'ticket' || 
    i.product?.name?.toLowerCase().includes('ingresso') ||
    i.product?.name?.toLowerCase().includes('ticket')
  );
  // Rifas e tickets: sem endereço, sem frete, gateway Asaas
  const isDigitalOnly = isPureRaffle || isPureTicket;
  const isGuestFlow = isDigitalOnly; // <--- Habilita fluxo rápido para tickets

  // Taxas absorvidas pelo organizador (cliente paga valor nominal)
  const serviceFee = 0;
  const grandTotal = total + (isDigitalOnly ? 0 : (selectedShipping?.price || 0));

  const [memory, setMemory] = useState<Record<string, string[]>>(() => {
    const saved = localStorage.getItem('operator_memory');
    return saved ? JSON.parse(saved) : { name: [], cpf: [], email: [], phone: [] };
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 0) {
       // Salvar memória do operador
      const newMemory = { ...memory };
      ['name', 'cpf', 'email', 'phone'].forEach(key => {
        const val = (form as any)[key];
        if (val && !newMemory[key].includes(val)) {
          newMemory[key] = [...newMemory[key], val].slice(-5);
        }
      });
      setMemory(newMemory);
      localStorage.setItem('operator_memory', JSON.stringify(newMemory));

      // Rifas e TICKETS pulam endereço, vão direto ao pagamento
      if (isDigitalOnly) {
        setStep(2);
        return;
      }
    }
    setStep(s => s + 1);
  };

  const handleSubmit = async (e: React.FormEvent, methodOverride?: string) => {
    e.preventDefault();
    setError(null);
    if (items.length === 0) return;

    // Valida CPF mínimo (sandbox Asaas rejeita CPFs inválidos)
    const cpfDigits = form.cpf.replace(/\D/g, '');
    if (cpfDigits.length !== 11) {
      setError('CPF inválido. Informe um CPF com 11 dígitos válidos.');
      return;
    }

    setProcessing(true);
    const methodToUse = methodOverride || paymentMethod;

    try {
      let currentUserId = user?.id;

      // Se não for fluxo de convidado e não estiver logado, tenta identificar
      if (!currentUserId && !isGuestFlow) {
        let signUpEmail = form.email;
        let signUpPass = form.password;

        // Identificação Completa para Produtos Físicos
        if (!signUpEmail || !signUpPass || signUpPass.length < 6) {
          setError('Identificação completa necessária (E-mail e Senha) para produtos físicos.');
          return;
        }

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: signUpEmail,
          password: signUpPass,
          options: { data: { full_name: form.name, phone: form.phone, cpf: form.cpf } }
        });

        if (signUpError) {
          if (signUpError.message.includes('already registered')) {
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email: signUpEmail, password: signUpPass });
            if (!signInError) currentUserId = signInData.user?.id;
            else { setError('E-mail já cadastrado com outra senha. Faça login.'); return; }
          } else {
            setError(`Erro na identificação: ${signUpError.message}`);
            return;
          }
        } else {
          currentUserId = signUpData.user?.id;
        }
      }

      // [GUEST TÁTICO] Se for rifa/ticket e não logado, o pedido é criado via Edge Function
      let orderId = '';
      if (!isGuestFlow) {
        if (!currentUserId) { setError('Falha na autenticação do operador.'); return; }

        const order = await createOrder(
          { name: form.name, cpf: form.cpf, email: form.email, phone: form.phone, payment_method: methodToUse },
          {
            street: isDigitalOnly ? 'Digital' : `${form.street}, ${form.number}${form.complement ? ' - ' + form.complement : ''}`,
            district: isDigitalOnly ? '-' : form.district,
            cep: isDigitalOnly ? '00000-000' : form.cep,
            city: isDigitalOnly ? 'Online' : `${form.city} - ${form.state}`,
            shipping_method: isDigitalOnly ? 'Entrega Digital' : selectedShipping?.name,
            shipping_company: isDigitalOnly ? 'DIGITAL' : selectedShipping?.company,
            shipping_price: isDigitalOnly ? 0 : selectedShipping?.price
          },
          currentUserId
        );

        if (!order) {
          setError('Erro ao criar registro do pedido no banco de dados.');
          return;
        }
        orderId = order.id;
      }

      // [ROTEAMENTO] Escolha do Motor de Pagamento
      // Rifas e Tickets → Asaas | Produtos físicos → MercadoPago
      const motorPath = isDigitalOnly ? 'asaas-payment' : 'mercadopago-payment';
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://seewdqetyolfmqsiyban.supabase.co';
      const functionUrl = `${supabaseUrl}/functions/v1/${motorPath}?t=${Date.now()}`;
      
      const payload = {
        orderId: isGuestFlow ? 'GUEST_NEW' : orderId,
        isGuest: isGuestFlow,
        total: grandTotal,
        subtotal: total,
        serviceFee: serviceFee,
        paymentMethod: methodToUse,
        customerData: { 
          name: form.name, 
          email: form.email || (isGuestFlow ? `op_${form.cpf.replace(/\D/g, '')}@perfectionairsoft.com.br` : user?.email), 
          cpf: form.cpf, 
          phone: form.phone 
        },
        items: items.map((i: any) => ({
          product_id: i.product_id,
          product_name: i.product?.name,
          product_price: i.product?.price,
          quantity: i.quantity,
          metadata: {
            ...(i.metadata || {}),
            brand: i.product?.brand,
          }
        }))
      };

      console.log(`[CHECKOUT] Iniciando Protocolo de Pagamento via ${motorPath}`);
      console.log(`[CHECKOUT] URL de Destino: ${functionUrl}`);
      console.log(`[CHECKOUT] Payload Tático:`, payload);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

      const response = await fetch(functionUrl, {
        method: 'POST',
        signal: controller.signal,
        headers: { 
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify(payload)
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMessage = `DIFICULDADE TÁTICA NA CONEXÃO (${response.status})`;
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = `ERRO OPERACIONAL: ${errorData.error.toUpperCase()} (${response.status})`;
          }
        } catch (e) {
          const errorText = await response.text();
          console.error('[CHECKOUT] Erro Bruto no Servidor:', errorText);
        }
        
        setError(`${errorMessage}. POR FAVOR, TENTE NOVAMENTE OU CONTATE O SUPORTE.`);
        setProcessing(false);
        return;
      }

      const payment = await response.json();

      if (payment.qr_code) {
        setPaymentData(payment);
        setStep(3);
        // Não limpamos o carrinho aqui para o resumo lateral não zerar
        return;
      }

      if (payment.checkout_url) {
        window.location.href = payment.checkout_url;
        return;
      }

      if (payment.error) {
        setError('Mercado Pago: ' + payment.error);
      } else {
        await clearCart();
        navigate(`/sucesso/${payment.order_id || orderId}`);
      }
    } catch (err: any) {
      console.error('Erro no checkout:', err);
      if (err.name === 'AbortError') {
        setError('TEMPO ESGOTADO. A conexão com o servidor demorou demais. Tente novamente.');
      } else {
        setError('Erro inesperado: ' + err.message);
      }
    } finally {
      setProcessing(false);
    }
  };

  // --- CRONÔMETRO DE 5 MINUTOS ---
  useEffect(() => {
    if (step !== 3 || paymentStatus !== 'pending' || timeLeft <= 0) {
      if (timeLeft === 0 && paymentStatus === 'pending') {
        setPaymentStatus('expired');
      }
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [step, paymentStatus, timeLeft]);

  // Função para forçar a verificação do pagamento
  const handleVerifyPayment = async (silent = false) => {
    if (!paymentData?.asaas_id || validatingStatus || paymentStatus === 'expired') return;
    
    if (!silent) setValidatingStatus(true);
    setError(null);
    
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://seewdqetyolfmqsiyban.supabase.co';
      const response = await fetch(`${supabaseUrl}/functions/v1/asaas-payment`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          action: 'CHECK_STATUS',
          asaasId: paymentData.asaas_id
        })
      });

      const data = await response.json();
      
      if (data.status === 'pago') {
        const orderId = data.orderId || paymentData.order_id;
        clearCart();
        setPaymentStatus('success');
        navigate(`/success?order_id=${orderId}`);
      } else if (!silent) {
        setError('Aguarde o processamento... Se seu pedido não ficar ativo em 5 minutos, contate o suporte');
      }
    } catch (err: any) {
      console.error('Erro ao verificar pagamento:', err);
      if (!silent) setError('Falha na comunicação com o servidor de validação.');
    } finally {
      if (!silent) setValidatingStatus(false);
    }
  };

  // Monitoramento Híbrido do Status de Pagamento (Realtime + Polling)
  useEffect(() => {
    if (step === 3 && paymentData?.order_id) {
      console.log('[SISTEMA TÁTICO] Iniciando monitoramento híbrido para pedido:', paymentData.order_id);
      
      // 1. CANAL REALTIME (Instantâneo)
      const channel = supabase
        .channel(`order_status_${paymentData.order_id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'orders',
            filter: `id=eq.${paymentData.order_id}`
          },
          (payload) => {
            console.log('[REALTIME] Alteração de status detectada:', payload.new.status);
            if (payload.new.status === 'pago') {
              clearCart();
              setPaymentStatus('success');
              navigate(`/success?order_id=${paymentData.order_id}`);
            }
          }
        )
        .subscribe();

      // 2. RADAR DE BACKUP (Polling agressivo a cada 3 segundos)
      let pollCount = 0;
      const pollInterval = setInterval(async () => {
        pollCount++;
        try {
          const { data, error } = await supabase
            .from('orders')
            .select('status')
            .eq('id', paymentData.order_id)
            .single();
          
          if (!error && data?.status === 'pago') {
            console.log('[POLLING] Pagamento detectado via radar de backup!');
            clearInterval(pollInterval);
            clearCart();
            setPaymentStatus('success');
            navigate(`/success?order_id=${paymentData.order_id}`);
            return;
          }

          // [AUTOMAÇÃO TÁTICA] Se passarem 6 segundos (3 ciclos de 2s) e ainda estiver pendente, 
          // o próprio sistema tenta uma verificação forçada via API.
          if (pollCount % 3 === 0 && !validatingStatus) {
             console.log('[POLLING] Forçando verificação via API (CHECK_STATUS)...');
             handleVerifyPayment(true);
          }
        } catch (err) {
          console.error('[POLLING] Falha no radar de backup:', err);
        }
      }, 2000); // Polling agressivo a cada 2 segundos

      return () => {
        supabase.removeChannel(channel);
        clearInterval(pollInterval);
      };
    }
  }, [step, paymentData, navigate, clearCart, validatingStatus]); // Adicionada dependência de validatingStatus

  if (items.length === 0 && step !== 3) return (
    <div className="px-4 sm:px-6 lg:px-8 py-20 text-center">
      <p className="text-slate-500 uppercase tracking-widest mb-4 text-sm">Carrinho vazio</p>
      <Link to="/" className="bg-primary text-background-dark font-black py-4 px-10 uppercase tracking-widest inline-block transition-all hover:bg-white">Explorar Arsenal</Link>
    </div>
  );

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="h-px flex-1 bg-primary/10"></div>
        <span className="text-primary text-xs font-black tracking-[0.3em] uppercase">Módulo de Checkout</span>
        <div className="h-px flex-1 bg-primary/10"></div>
      </div>
      <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tighter uppercase mb-10 italic">
        Finalizar <span className="text-primary">Operação</span>
      </h1>

      {/* Step Indicator */}
      <div className="flex items-center gap-0 mb-10 border border-white/5 overflow-hidden max-w-4xl">
        {STEPS.map((s, i) => (
          (isDigitalOnly && i === 1) ? null : (
            <div key={s} className={`flex-1 py-3 text-center text-[9px] font-black uppercase tracking-[0.2em] transition-colors border-r border-white/5 last:border-0 ${
              (i === step) ? 'bg-primary text-black' : (i < step) ? 'bg-primary/20 text-primary' : 'text-white/20 bg-black/20'
            }`}>
              <span className="mr-2 font-mono">{i < step ? '✓' : `0${i + 1}`}</span>{s}
            </div>
          )
        ))}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-3 shadow-[0_0_20px_rgba(239,68,68,0.1)]">
          <span className="material-symbols-outlined text-sm">warning</span>
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {/* Step 0 — Identificação */}
          {step === 0 && (
            <form onSubmit={handleNext} className="bg-surface/30 border border-white/5 p-8 space-y-6">
              <h3 className="text-[10px] font-black tracking-[0.3em] text-primary uppercase flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">person_filled</span> Identificação do Operador
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <InputField name="name" label="Nome Completo" placeholder="Nome do Dono da Rifa/Produto" className="sm:col-span-2" value={form.name} onChange={handleChange} list="list-name" />
                <InputField name="cpf" label="CPF (Faturamento)" placeholder="000.000.000-00" value={form.cpf} onChange={handleChange} list="list-cpf" />
                <InputField name="phone" label="WhatsApp para Resultados" placeholder="(00) 00000-0000" type="tel" value={form.phone} onChange={handleChange} list="list-phone" />
                
                <>
                  <InputField name="email" label="E-mail de Confirmação" placeholder="email@exemplo.com" type="email" className="sm:col-span-2" value={form.email} onChange={handleChange} list="list-email" />
                  {/* Campo de senha: apenas para usuários NÃO logados comprando produtos FÍSICOS */}
                  {!user && !isDigitalOnly && (
                    <div className="sm:col-span-2 pt-2">
                      <InputField name="password" label="Definir Senha de Acesso" type="password" placeholder="Mínimo 6 caracteres" value={form.password} onChange={handleChange} />
                    </div>
                  )}
                </>
              </div>

              {Object.entries(memory).map(([key, values]) => (
                <datalist key={key} id={`list-${key}`}>
                  {values.map(val => <option key={val} value={val} />)}
                </datalist>
              ))}

              <button type="submit" className="w-full bg-primary text-black font-black py-5 uppercase tracking-[0.2em] hover:bg-white transition-all text-sm shadow-[0_10px_30px_rgba(255,193,7,0.1)]">
                {isPureTicket ? 'Ir para Pagamento PIX →' : isPureRaffle ? 'Ir para Pagamento PIX →' : 'Próximo: Endereço →'}
              </button>
            </form>
          )}

          {/* Step 1 — Endereço (Só para produtos) */}
          {step === 1 && !isDigitalOnly && (
            <form onSubmit={handleNext} className="bg-surface/30 border border-white/5 p-8 space-y-6">
              <h3 className="text-[10px] font-black tracking-[0.3em] text-primary uppercase flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">location_on</span> Endereço de Despacho
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-6 gap-4">
                <InputField name="cep" label="CEP" placeholder="00000-000" className="sm:col-span-2" value={form.cep} onChange={handleChange}/>
                <InputField name="street" label="Logradouro" placeholder="Rua / Avenida" className="sm:col-span-4" value={form.street} onChange={handleChange}/>
                <InputField name="number" label="Nº" placeholder="123" className="sm:col-span-2" value={form.number} onChange={handleChange}/>
                <InputField name="complement" label="Compl." placeholder="Apto/Sala" className="sm:col-span-2" required={false} value={form.complement} onChange={handleChange}/>
                <InputField name="district" label="Bairro" placeholder="Ex: Centro" className="sm:col-span-2" value={form.district} onChange={handleChange}/>
                <InputField name="city" label="Cidade" className="sm:col-span-4" value={form.city} onChange={handleChange}/>
                <InputField name="state" label="UF" className="sm:col-span-2" value={form.state} onChange={handleChange}/>
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setStep(0)} className="px-8 py-5 border border-white/10 text-white/40 hover:text-white font-black uppercase tracking-widest text-[10px] transition-colors">
                  ← Voltar
                </button>
                <button type="submit" className="flex-1 bg-primary text-black font-black py-5 uppercase tracking-[0.2em] hover:bg-white transition-all text-sm">
                  Continuar para Pagamento →
                </button>
              </div>
            </form>
          )}

          {/* Step 2 — Pagamento */}
          {step === 2 && (
            <div className="bg-surface/30 border border-white/5 p-8 space-y-8">
              <DynamicCheckoutAccordion
                amount={grandTotal}
                loading={processing}
                pixOnly={isDigitalOnly}
                onCommitPayment={(method) => {
                  setPaymentMethod(method);
                  const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
                  handleSubmit(fakeEvent, method);
                }}
              />
              
              <div className="flex gap-4 pt-4 border-t border-white/5">
                <button type="button" onClick={() => setStep(isDigitalOnly ? 0 : 1)} className="px-8 py-5 border border-white/10 text-white/40 hover:text-white font-black uppercase tracking-widest text-[10px] transition-colors w-full sm:w-auto">
                  ← Voltar
                </button>
              </div>
            </div>
          )}

          {/* Step 3 — PIX QR Code */}
          {step === 3 && paymentData && (
            <div className="bg-surface/30 border border-primary/20 p-6 text-center space-y-6 backdrop-blur-md max-w-2xl mx-auto relative overflow-hidden">
              <div className="space-y-1">
                <span className="text-secondary text-[8px] font-black uppercase tracking-[0.3em] animate-pulse italic">Aguardando Pagamento</span>
                <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">Protocolo PIX Ativo</h2>
              </div>

              {/* Countdown HUD */}
              <div className="flex justify-between items-center bg-black/40 border border-white/5 p-4 rounded-sm">
                <div className="text-left">
                  <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest block font-mono">Expiração da Reserva</span>
                  <div className="flex items-center gap-2">
                    <span className={`size-2 rounded-full ${timeLeft > 60 ? 'bg-primary animate-pulse' : 'bg-red-500 animate-ping'}`}></span>
                    <span className="text-xl font-black text-white font-mono italic">
                      {Math.floor(timeLeft / 60).toString().padStart(2, '0')}:{(timeLeft % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest block font-mono">Estado Atual</span>
                  <span className={`text-[10px] font-black italic tracking-widest uppercase ${paymentStatus === 'expired' ? 'text-red-500' : 'text-emerald-500'}`}>
                    {paymentStatus === 'expired' ? 'MIS-EXPIRED' : 'OPERACIONAL'}
                  </span>
                </div>
              </div>

              <div className="flex justify-center py-2 relative">
                <div className="bg-white p-4 rounded-2xl shadow-[0_0_40px_rgba(255,193,7,0.2)] border-[4px] border-primary/30 relative">
                  <img src={`data:image/png;base64,${paymentData.qr_code_base64}`} alt="QR PIX" className="w-48 h-48 md:w-64 md:h-64" />
                  
                  {/* Expired Overlay */}
                  {paymentStatus === 'expired' && (
                    <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500 rounded-xl">
                      <span className="material-symbols-outlined text-red-500 text-6xl mb-4">timer_off</span>
                      <h3 className="text-lg font-black text-white uppercase italic tracking-tighter mb-2">Reserva Expirada</h3>
                      <button 
                        onClick={() => window.location.reload()}
                        className="px-6 py-3 bg-red-500 text-white font-black text-[10px] uppercase tracking-widest hover:bg-white hover:text-red-500 transition-all italic rounded"
                      >
                        REINICIAR
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="bg-black/50 p-4 border border-white/10 space-y-2 max-w-sm mx-auto rounded-lg">
                <p className="text-[8px] font-black tracking-widest text-slate-500 uppercase">Pix Copia e Cola</p>
                <div className="flex gap-2">
                  <input readOnly value={paymentData.qr_code} className="flex-1 bg-background-dark border border-white/10 px-3 py-2 text-[9px] font-mono text-white/40 truncate outline-none rounded" />
                  <button 
                    disabled={paymentStatus === 'expired'}
                    onClick={() => {
                      navigator.clipboard.writeText(paymentData.qr_code || '');
                      alert('PIX Copiado com Sucesso!');
                    }} 
                    className="px-4 py-2 bg-primary text-black font-black uppercase text-[9px] tracking-widest hover:bg-white transition-all rounded disabled:opacity-20"
                  >
                    Copiar
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 space-y-4">
                <div className="flex flex-col items-center gap-3 py-4 bg-black/40 border border-primary/20 rounded-xl shadow-[inset_0_0_15px_rgba(255,193,7,0.03)] selection:bg-primary/20">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 border-[3px] border-primary/10 border-t-primary rounded-full animate-spin"></div>
                    <p className="text-[9px] text-primary font-black uppercase tracking-[0.2em] animate-pulse">RADAR DE CONFIRMAÇÃO ATIVO</p>
                  </div>
                  <p className="text-[8px] text-white/30 font-black uppercase tracking-widest">Aguardando sinal da rede bancária...</p>
                </div>

                <div className="space-y-3 pt-2">
                  <button 
                    onClick={() => handleVerifyPayment()} 
                    disabled={validatingStatus || paymentStatus === 'expired'}
                    className="text-[9px] text-white/20 hover:text-primary font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2 mx-auto disabled:opacity-0"
                  >
                    {validatingStatus ? 'ESCANEANDO REDE...' : 'PROBLEMAS COM O RADAR? CLIQUE PARA FORÇAR VERIFICAÇÃO'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Summary */}
        <div className="space-y-6">
          <div className="bg-surface/30 border border-white/5 p-6 backdrop-blur-sm sticky top-24">
            <h3 className="text-[10px] font-black tracking-[0.2em] text-primary uppercase mb-6 border-b border-white/5 pb-4">Itens Selecionados</h3>
            <div className="space-y-4 mb-6 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
              {items.map(i => (
                <div key={i.id} className="flex items-center gap-4 group">
                  <div className="w-12 h-12 bg-white flex-shrink-0 p-1 border border-white/5 group-hover:border-primary/50 transition-colors flex items-center justify-center overflow-hidden">
                    { (i.metadata?.event_image || i.product?.image_url) ? (
                      <img 
                        src={i.metadata?.event_image || i.product?.image_url || ''} 
                        alt={i.product?.name} 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <span className="material-symbols-outlined text-slate-300">image_not_supported</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-tight truncate text-white/80">{i.product?.name}</p>
                    <p className="text-[9px] text-slate-500 font-bold italic tracking-widest">QTD: {i.quantity} / {i.product?.brand === 'DROP' ? 'DROPS' : 'UNIT'}</p>
                  </div>
                  <span className="text-xs font-mono font-black text-primary italic">
                    {formatPrice((i.product?.price || 0) * i.quantity, i.product?.brand === 'DROP')}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-6 border-t border-white/10 space-y-4">
              <div className="flex justify-between text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em]">
                <span>Logística</span>
                <span className="font-mono text-white/50">{isPureRaffle ? 'FRETE GRÁTIS' : (selectedShipping ? formatPrice(selectedShipping.price, true) : 'Calculado no Próximo Passo')}</span>
              </div>
                <div className="flex justify-between text-[11px] font-bold text-slate-500/40 uppercase tracking-[0.2em] italic">
                  <span>Proteção ao Comprador</span>
                  <span className="font-mono">ATIVADA</span>
                </div>
              <div className="flex justify-between items-end pt-4 bg-primary/5 p-4 rounded-lg border border-primary/10">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/50 italic">Total a Investir</span>
                <span className="text-3xl font-black text-primary font-mono tracking-tighter italic">{formatPrice(grandTotal, true)}</span>
              </div>
            </div>

            {isPureRaffle && (
              <div className="mt-6 p-4 bg-secondary/5 border border-secondary/20 rounded">
                <div className="flex items-center gap-2 mb-2 text-secondary">
                   <span className="material-symbols-outlined text-sm">flash_on</span>
                   <span className="text-[9px] font-black uppercase tracking-widest">Fluxo Expresso DROP</span>
                </div>
                <p className="text-[9px] text-white/40 uppercase tracking-widest leading-relaxed">Faça o registro em nosso site para preencher as credenciais de envio. Boa sorte!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
