import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useCreateOrder } from '../hooks/useOrders';
import { useShipping } from '../hooks/useShipping';
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
  const { items, total, selectedShipping, clearCart, setSelectedShipping } = useCart();
  const { lookupCep, calculateShipping, loading: shippingLoading } = useShipping();
  const { user } = useAuth();
  const { createOrder } = useCreateOrder();
  const navigate = useNavigate();

  // Estados
  const [step, setStep] = useState(0); 
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [paymentData, setPaymentData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
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
        const address = await lookupCep(cleanCep);
        if (address && !address.error) {
          setForm(prev => ({
            ...prev,
            street: address.street || prev.street,
            district: address.district || prev.district,
            city: address.city || prev.city,
            state: address.state || prev.state
          }));
          // Também já dispara o cálculo de frete
          await calculateShipping(cleanCep);
        } else if (address?.error) {
          setError(address.error);
        }
        setProcessing(false);
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
    setError(null);
    if (items.length === 0) return;

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
            district: isDigitalOnly ? '-' : form.district,
            cep: isDigitalOnly ? '00000-000' : form.cep,
            city: isDigitalOnly ? 'Online' : form.city,
            shipping_method: isDigitalOnly ? 'Entrega Digital' : selectedShipping?.name,
            shipping_price: isDigitalOnly ? 0 : selectedShipping?.price
          },
          currentUserId || null
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
        const err = await response.json();
        throw new Error(err.error || 'Erro no processamento do pagamento.');
      }

      const payment = await response.json();
      setPaymentData(payment);
      setPaymentMethod(method);

      if (method === 'credit_card' && (payment.status === 'CONFIRMED' || payment.status === 'RECEIVED')) {
        await clearCart();
        navigate(`/sucesso/${payment.order_id}`);
      } else {
        setStep(3); // Mostra Boleto ou PIX
      }

    } catch (err: any) {
      if (err.message.includes('Erro 307')) {
        setError('Erro 307: Não foi possível processar o pagamento no momento.');
      } else {
        setError(err.message);
      }
    } finally {
      setProcessing(false);
    }
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
              />
            </div>
          )}

          {step === 3 && paymentData && (
            <div className="bg-surface/30 border border-primary/20 p-8 text-center space-y-6 max-w-2xl mx-auto rounded-lg backdrop-blur-md">
              {paymentMethod === 'pix' ? (
                <>
                  <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">PIX Gerado!</h2>
                  <div className="flex justify-center p-4 bg-white rounded-xl w-fit mx-auto shadow-xl">
                    <img src={`data:image/png;base64,${paymentData.qr_code_base64}`} alt="QR PIX" className="w-48 h-48" />
                  </div>
                  <div className="space-y-3 max-w-sm mx-auto">
                    <p className="text-[9px] font-black tracking-widest text-slate-500 uppercase">Pix Copia e Cola</p>
                    <div className="flex gap-2">
                      <input readOnly value={paymentData.qr_code} className="flex-1 bg-black/40 border border-white/10 px-3 py-2 text-[10px] font-mono text-white/50 truncate rounded" />
                      <button onClick={() => { navigator.clipboard.writeText(paymentData.qr_code); alert('Copiado!'); }} className="px-4 py-2 bg-primary text-black font-black uppercase text-[10px] rounded">Copiar</button>
                    </div>
                  </div>
                </>
              ) : paymentMethod === 'boleto' ? (
                <>
                  <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">Boleto Gerado!</h2>
                  <div className="bg-black/40 p-6 border border-white/10 rounded-xl space-y-4">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Linha Digitável</p>
                    <div className="flex flex-col gap-3">
                      <input readOnly value={paymentData.identificationField} className="w-full bg-black/60 border border-white/10 px-4 py-3 text-xs font-mono text-primary text-center rounded" />
                      <div className="flex gap-3">
                        <button onClick={() => { navigator.clipboard.writeText(paymentData.identificationField); alert('Código copiado!'); }} 
                          className="flex-1 bg-white/5 hover:bg-white/10 text-white font-black py-4 uppercase text-[10px] tracking-widest transition-colors rounded">
                          Copiar Código
                        </button>
                        <a href={paymentData.bankSlipUrl} target="_blank" rel="noreferrer"
                          className="flex-1 bg-primary text-black font-black py-4 uppercase text-[10px] tracking-widest transition-colors rounded flex items-center justify-center gap-2">
                          <span className="material-symbols-outlined text-sm">download</span> Imprimir PDF
                        </a>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-10">
                  <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">Processando...</h2>
                  <p className="text-slate-500 uppercase tracking-widest text-xs mt-2">Verificando status da transação</p>
                </div>
              )}
              
              <div className="pt-6 border-t border-white/5 text-[10px] text-slate-500 font-bold uppercase tracking-widest italic">
                Aguardando confirmação do sistema Asaas
              </div>
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
    </div>
  );
}
