import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useCreateOrder } from '../hooks/useOrders';
import { useShipping } from '../hooks/useShipping';
import { formatPrice } from '../types/database';
import { DynamicCheckoutAccordion } from '../components/DynamicCheckoutAccordion';
import { TacticalSuccessModal } from '../components/TacticalSuccessModal';
import { supabase } from '../lib/supabase';

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
  const { lookupCep, calculateShipping } = useShipping();
  const { user } = useAuth();
  const { createOrder } = useCreateOrder();
  const navigate = useNavigate();

  // Estados
  const [step, setStep] = useState(0); 
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [paymentData, setPaymentData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  
  // Estados para Modal de Sucesso Tático
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [form, setForm] = useState({
    name: '', cpf: '', email: user?.email || '', phone: '',
    street: '', number: '', complement: '', district: '', city: '', state: '', cep: '',
    password: ''
  });

  const isPureRaffle = items.length > 0 && items.some((i: any) => i.product?.brand === 'DROP' || i.product?.category?.slug === 'rifas');
  const isPureTicket = items.length > 0 && items.some((i: any) => 
    i.product?.brand === 'TICKET' || 
    i.metadata?.type === 'ticket' || 
    i.product?.name?.toLowerCase().includes('ingresso') ||
    i.product?.name?.toLowerCase().includes('ticket')
  );
  const isDigitalOnly = isPureRaffle || isPureTicket;
  const isGuestFlow = isDigitalOnly;

  const grandTotal = total + (isDigitalOnly ? 0 : (selectedShipping?.price || 0));

  const [memory, setMemory] = useState<Record<string, string[]>>(() => {
    const saved = localStorage.getItem('operator_memory');
    return saved ? JSON.parse(saved) : { name: [], cpf: [], email: [], phone: [] };
  });

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const newForm = { ...form, [name]: value };
    setForm(newForm);

    // Auto-preenchimento de CEP
    if (name === 'cep') {
      const cleanCep = value.replace(/\D/g, '');
      if (cleanCep.length === 8) {
        setProcessing(true);
        try {
          const address = await lookupCep(cleanCep);
          if (address && !address.error) {
            setForm(prev => ({
              ...prev,
              street: address.street || prev.street,
              district: address.district || prev.district,
              city: address.city || prev.city,
              state: address.state || prev.state
            }));
            await calculateShipping(cleanCep);
          } else if (address?.error) {
            setError(address.error);
          }
        } catch (err) {
          console.error('[CEP] Erro ao buscar dados:', err);
          setError('Erro ao validar CEP. Verifique sua conexão.');
        } finally {
          setProcessing(false);
        }
      }
    }
  };

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 0) {
      const newMemory = { ...memory };
      ['name', 'cpf', 'email', 'phone'].forEach(key => {
        const val = (form as any)[key];
        if (val && !newMemory[key].includes(val)) {
          newMemory[key] = [...newMemory[key], val].slice(-5);
        }
      });
      setMemory(newMemory);
      localStorage.setItem('operator_memory', JSON.stringify(newMemory));
      if (isDigitalOnly) { setStep(2); return; }
    }
    setStep(s => s + 1);
  };

  const handleSubmit = async (method: string, cardMeta?: any) => {
    console.log(`[Checkout] handleSubmit iniciado para o método: ${method}`);
    setError(null);
    if (items.length === 0) {
      console.warn('[Checkout] Carrinho vazio, abortando handleSubmit');
      return;
    }

    const cpfDigits = form.cpf.replace(/\D/g, '');
    if (cpfDigits.length !== 11) {
      setError('CPF inválido. Informe 11 dígitos.');
      return;
    }

    setProcessing(true);
    try {
      let currentUserId = user?.id;
      let orderId = '';
      
      // Criar pedido se não for guest
      if (!isGuestFlow) {
        if (!currentUserId && !isDigitalOnly) {
           setError('Por favor, faça login ou preencha a identificação completa.');
           setProcessing(false);
           return;
        }

        const order = await createOrder(
          { name: form.name, cpf: form.cpf, email: form.email, phone: form.phone, payment_method: method },
          {
            street: isDigitalOnly ? 'Digital' : `${form.street}, ${form.number}`,
            complement: isDigitalOnly ? '-' : form.complement,
            district: isDigitalOnly ? '-' : form.district,
            cep: isDigitalOnly ? '00000-000' : form.cep,
            city: isDigitalOnly ? 'Online' : form.city,
            state: isDigitalOnly ? 'UF' : form.state,
            shipping_method: isDigitalOnly ? 'Entrega Digital' : selectedShipping?.name,
            shipping_price: isDigitalOnly ? 0 : selectedShipping?.price
          },
          currentUserId || undefined
        );

        if (!order) throw new Error('Falha ao registrar pedido.');
        orderId = order.id;
      }

      // Payload para Asaas
      const payload: any = {
        orderId: isGuestFlow ? 'GUEST_NEW' : orderId,
        isGuest: isGuestFlow,
        total: grandTotal,
        paymentMethod: method,
        customerData: { 
          name: form.name, 
          email: form.email || `op_${cpfDigits}@perfectionairsoft.com.br`, 
          cpf: form.cpf, 
          phone: form.phone 
        },
        items: items.map((i: any) => ({
          product_id: i.product_id,
          product_name: i.product?.name,
          product_price: i.product?.price,
          quantity: i.quantity,
          metadata: i.metadata
        }))
      };

      if (method === 'credit_card' && cardMeta) {
        const [expMonth, expYear] = cardMeta.expiry.split('/');
        payload.creditCard = {
          holderName: cardMeta.name,
          number: cardMeta.number.replace(/\s/g, ''),
          expiryMonth: expMonth,
          expiryYear: expYear.length === 2 ? `20${expYear}` : expYear,
          ccv: cardMeta.cvv
        };
        payload.creditCardHolderInfo = {
          name: form.name,
          email: form.email,
          cpfCnpj: cpfDigits,
          postalCode: form.cep.replace(/\D/g, '') || '00000000',
          addressNumber: form.number || '0',
          phone: form.phone.replace(/\D/g, '')
        };
        payload.installmentCount = Number(cardMeta.installments);
      }

      const response = await fetch('https://seewdqetyolfmqsiyban.supabase.co/functions/v1/asaas-payment', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error('[Checkout] Erro na resposta do pagamento:', errText);
        try {
          const errJson = JSON.parse(errText);
          throw new Error(errJson.error || 'Erro no processamento do pagamento.');
        } catch {
          throw new Error(`Erro ${response.status}: Falha na comunicação com o servidor de pagamentos.`);
        }
      }

      const payment = await response.json();
      console.log('[Checkout] Resposta do pagamento recebida:', payment);
      setPaymentData(payment);
      setPaymentMethod(method);

      // No cartao confirmado, vai direto. No PIX/Boleto, permanece no Accordion
      if (method === 'credit_card' && (payment.status === 'CONFIRMED' || payment.status === 'RECEIVED')) {
        await clearCart();
        navigate(`/sucesso/${payment.order_id}`);
      }

    } catch (err: any) {
      if (err.message.includes('Erro 307')) {
        setError('Erro 307: Não foi possível processar o pagamento no momento.');
        alert('Erro 307: Não foi possível processar o pagamento no momento.');
      } else {
        setError(err.message);
        alert('Falha no Pagamento: ' + err.message);
      }
    } finally {
      setProcessing(false);
    }
  };

  // Efeito de Polling & Realtime para detecção de pagamento aprovado
  useEffect(() => {
    let interval: any;
    let subscription: any;

    const orderId = paymentData?.order_id;
    const asaasId = paymentData?.asaas_id;
    const isPaymentActive = !!(paymentData && (orderId || asaasId));

    if (isPaymentActive && !showSuccessModal) {
      console.log('[Checkout] Iniciando monitoramento tático. Order:', orderId, 'Asaas:', asaasId);

      // 1. REALTIME SUBSCRIPTION (Preferencial)
      // Escuta mudanças na tabela 'orders' para o ID específico do pedido
      if (orderId) {
        subscription = supabase
          .channel(`order-updates-${orderId}`)
          .on('postgres_changes', { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'orders', 
            filter: `id=eq.${orderId}` 
          }, (payload) => {
            console.log('[Checkout] Mudança detectada via Realtime:', payload.new.status);
            if (payload.new.status === 'pago' || payload.new.status === 'confirmed') {
              setSuccessMessage('Pix confirmado');
              setShowSuccessModal(true);
              clearCart();
            }
          })
          .subscribe();
      }
      
      // 2. POLLING FALLBACK (A cada 4 segundos)
      interval = setInterval(async () => {
        try {
          // Tenta verificar via Edge Function (mais robusto para integrações externas)
          if (asaasId) {
            const { data, error } = await supabase.functions.invoke('asaas-payment', {
              body: { action: 'CHECK_STATUS', asaasId: asaasId }
            });

            if (!error && (data?.status === 'pago' || data?.success)) {
              console.log('[Checkout] PAGAMENTO CONFIRMADO via Polling!');
              setSuccessMessage('Pix confirmado');
              setShowSuccessModal(true);
              clearCart();
              clearInterval(interval);
              return;
            }
          }

          // Fallback: Verifica direto na tabela se o status mudou (caso o webhook já tenha batido)
          if (orderId) {
             const { data: order } = await supabase
              .from('orders')
              .select('status')
              .eq('id', orderId)
              .single();
            
            if (order?.status === 'pago' || order?.status === 'confirmed') {
              console.log('[Checkout] PAGAMENTO CONFIRMADO via DB Direct!');
              setSuccessMessage('Pix confirmado');
              setShowSuccessModal(true);
              clearCart();
              clearInterval(interval);
            }
          }
        } catch (err) {
          console.warn('[Checkout] Erro no ciclo de polling:', err);
        }
      }, 4000);
    }

    return () => {
      if (interval) clearInterval(interval);
      if (subscription) supabase.removeChannel(subscription);
    };
  }, [step, paymentData, showSuccessModal, supabase]);

  const handleModalClose = () => {
    setShowSuccessModal(false);
    navigate('/'); // Redireciona para home ou painel após confirmar
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-4 mb-8">
        <div className="h-px flex-1 bg-primary/10"></div>
        <span className="text-primary text-xs font-black tracking-[0.3em] uppercase">Módulo de Checkout</span>
        <div className="h-px flex-1 bg-primary/10"></div>
      </div>
      
      <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tighter uppercase mb-10 italic">
        Finalizar <span className="text-primary">Operação</span>
      </h1>

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
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-3">
          <span className="material-symbols-outlined text-sm">warning</span>
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {step === 0 && (
            <form onSubmit={handleNext} className="bg-surface/30 border border-white/5 p-8 space-y-6">
              <h3 className="text-[10px] font-black tracking-[0.3em] text-primary uppercase flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">person_filled</span> Identificação
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <InputField name="name" label="Nome Completo" placeholder="Nome do Dono da Rifa" className="sm:col-span-2" value={form.name} onChange={handleChange} />
                <InputField name="cpf" label="CPF" placeholder="000.000.000-00" value={form.cpf} onChange={handleChange} />
                <InputField name="phone" label="WhatsApp" placeholder="(00) 00000-0000" type="tel" value={form.phone} onChange={handleChange} />
                <InputField name="email" label="E-mail" placeholder="email@exemplo.com" type="email" className="sm:col-span-2" value={form.email} onChange={handleChange} />
              </div>
              <button type="submit" className="w-full bg-primary text-black font-black py-5 uppercase tracking-[0.2em] hover:bg-white transition-all text-sm">
                Seguir para Pagamento →
              </button>
            </form>
          )}

          {step === 1 && (
            <form onSubmit={handleNext} className="bg-surface/30 border border-white/5 p-8 space-y-6">
              <h3 className="text-[10px] font-black tracking-[0.3em] text-primary uppercase flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">location_on</span> Endereço de Entrega
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <InputField name="cep" label="CEP" placeholder="00000-000" value={form.cep} onChange={handleChange} />
                <InputField name="street" label="Rua / Logradouro" placeholder="Av. Principal" value={form.street} onChange={handleChange} />
                <InputField name="number" label="Número" placeholder="123" value={form.number} onChange={handleChange} />
                <InputField name="complement" label="Complemento" placeholder="Apto, Fundos, etc." required={false} value={form.complement} onChange={handleChange} />
                <InputField name="district" label="Bairro" placeholder="Centro" value={form.district} onChange={handleChange} />
                <InputField name="city" label="Cidade" placeholder="Cidade" value={form.city} onChange={handleChange} />
                <InputField name="state" label="Estado" placeholder="UF" value={form.state} onChange={handleChange} />
              </div>
              <button type="submit" className="w-full bg-primary text-black font-black py-5 uppercase tracking-[0.2em] hover:bg-white transition-all text-sm">
                Seguir para Pagamento →
              </button>
            </form>
          )}

          {step === 2 && (
            <div className="bg-surface/30 border border-white/5 p-8">
              <DynamicCheckoutAccordion
                amount={grandTotal}
                loading={processing}
                pixOnly={false}
                onCommitPayment={handleSubmit}
                paymentData={paymentData}
                activeMethod={paymentData ? paymentMethod : undefined}
              />
            </div>
          )}
        </div>

        {/* Resumo */}
        <div className="bg-surface/30 border border-white/5 p-6 h-fit sticky top-24">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-primary mb-6">Resumo da Operação</h3>
          <div className="space-y-4 mb-6">
            {items.map(i => (
              <div key={i.id} className="flex justify-between items-center gap-4">
                <span className="text-[10px] text-white/70 uppercase truncate max-w-[150px]">{i.product?.name}</span>
                <span className="font-mono text-[10px] text-primary font-black">x{i.quantity}</span>
                <span className="font-mono text-[10px] text-white/50">{formatPrice(i.product?.price * i.quantity, true)}</span>
              </div>
            ))}
          </div>
          <div className="pt-6 border-t border-white/10 flex justify-between items-end">
             <span className="text-[10px] font-black text-white/40 uppercase tracking-widest italic">Total Final</span>
             <span className="text-3xl font-black text-primary font-mono tracking-tighter italic">{formatPrice(grandTotal, true)}</span>
          </div>
        </div>
      </div>
      {/* Modal de Sucesso Tático */}
      <TacticalSuccessModal 
        isOpen={showSuccessModal}
        message={successMessage}
        onClose={handleModalClose}
      />
    </div>
  );
}
