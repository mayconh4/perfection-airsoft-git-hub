import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useCreateOrder } from '../hooks/useOrders';
import { formatPrice } from '../types/database';

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
  const { createOrder, creating } = useCreateOrder();
  const navigate = useNavigate();

  // Estados
  const [step, setStep] = useState(0); 
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [paymentData, setPaymentData] = useState<{ qr_code?: string; qr_code_base64?: string; checkout_url?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '', cpf: '', email: user?.email || '', phone: '',
    street: '', number: '', complement: '', district: '', city: '', state: '', cep: '',
    password: ''
  });

  const isPureRaffle = items.length > 0 && items.every(i => i.product?.brand === 'DROP');
  const grandTotal = total + (isPureRaffle ? 0 : (selectedShipping?.price || 0));

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

      // Se for RIFA PURO, pula endereço direto pro pagamento
      if (isPureRaffle) {
        setStep(2);
        return;
      }
    }
    setStep(s => s + 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (items.length === 0) return;

    try {
      let currentUserId = user?.id;

      // Se não estiver logado
      if (!currentUserId) {
        let signUpEmail = form.email;
        let signUpPass = form.password;

        if (isPureRaffle) {
          // Geração Silenciosa (Shadow Account) para Rifas
          signUpEmail = `${form.cpf.replace(/\D/g, '')}@perfectionairsoft.com.br`;
          signUpPass = `pa${form.cpf.replace(/\D/g, '').slice(-6)}`;
        } else {
          // Exige senha e email para produtos
          if (!signUpEmail || !signUpPass || signUpPass.length < 6) {
            setError('Identificação completa necessária (E-mail e Senha de 6 dígitos) para prosseguir.');
            return;
          }
        }

        let { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: signUpEmail,
          password: signUpPass,
          options: { data: { full_name: form.name, phone: form.phone, cpf: form.cpf, is_shadow: isPureRaffle } }
        });

        if (signUpError && signUpError.message.includes('already registered') && isPureRaffle) {
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: signUpEmail,
            password: signUpPass
          });
          
          if (!signInError) {
            currentUserId = signInData.user?.id;
          } else {
            setError('CPF já cadastrado com outra senha. Por favor, faça login.');
            return;
          }
        } else if (signUpError) {
          setError(`Erro na identificação: ${signUpError.message}`);
          return;
        } else {
          currentUserId = signUpData.user?.id;
        }
      }

      if (!currentUserId) {
        setError('Falha na autenticação do operador.');
        return;
      }

      const order = await createOrder(
        { name: form.name, cpf: form.cpf, email: isPureRaffle ? '' : form.email, phone: form.phone, payment_method: paymentMethod },
        {
          street: isPureRaffle ? 'Digital' : `${form.street}, ${form.number}${form.complement ? ' - ' + form.complement : ''}`,
          district: isPureRaffle ? '-' : form.district,
          cep: isPureRaffle ? '00000-000' : form.cep,
          city: isPureRaffle ? 'Online' : `${form.city} - ${form.state}`,
          shipping_method: isPureRaffle ? 'Entrega Digital' : selectedShipping?.name,
          shipping_company: isPureRaffle ? 'DROP' : selectedShipping?.company,
          shipping_price: isPureRaffle ? 0 : selectedShipping?.price
        },
        currentUserId
      );

      if (!order) {
        setError('Erro ao criar registro do pedido. Tente novamente.');
        return;
      }

      // MP Call
      const functionUrl = `https://seewdqetyolfmqsiyban.supabase.co/functions/v1/mercadopago-payment?t=${Date.now()}`;
      const mpEmail = isPureRaffle ? `${form.cpf.replace(/\D/g, '')}@perfectionairsoft.com.br` : form.email;

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          total: grandTotal,
          paymentMethod,
          customerData: { name: form.name, email: mpEmail, cpf: form.cpf, phone: form.phone },
          items: items.map((i: any) => ({
            product_id: i.product_id,
            product_name: i.product?.name,
            product_price: i.product?.price,
            quantity: i.quantity,
            metadata: i.metadata
          }))
        })
      });

      if (!response.ok) {
        setError('Gateway de pagamento indisponível temporariamente.');
        return;
      }

      const payment = await response.json();

      if (payment.qr_code) {
        setPaymentData(payment);
        setStep(3);
        await clearCart();
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
        navigate(`/sucesso/${order.id}`);
      }
    } catch (err: any) {
      console.error('Erro no checkout:', err);
      setError('Erro inesperado: ' + err.message);
    }
  };

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
          (isPureRaffle && i === 1) ? null : (
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
                
                {!isPureRaffle && (
                  <>
                    <InputField name="email" label="E-mail de Confirmação" placeholder="email@exemplo.com" type="email" className="sm:col-span-2" value={form.email} onChange={handleChange} list="list-email" />
                    {!user && (
                      <div className="sm:col-span-2 pt-2">
                        <InputField name="password" label="Definir Senha de Acesso" type="password" placeholder="Mínimo 6 caracteres" value={form.password} onChange={handleChange} />
                      </div>
                    )}
                  </>
                )}
              </div>

              {Object.entries(memory).map(([key, values]) => (
                <datalist key={key} id={`list-${key}`}>
                  {values.map(val => <option key={val} value={val} />)}
                </datalist>
              ))}

              <button type="submit" className="w-full bg-primary text-black font-black py-5 uppercase tracking-[0.2em] hover:bg-white transition-all text-sm shadow-[0_10px_30px_rgba(255,193,7,0.1)]">
                {isPureRaffle ? 'Ir para Pagamento PIX →' : 'Próximo: Endereço →'}
              </button>
            </form>
          )}

          {/* Step 1 — Endereço (Só para produtos) */}
          {step === 1 && !isPureRaffle && (
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
            <form onSubmit={handleSubmit} className="bg-surface/30 border border-white/5 p-8 space-y-8">
              <h3 className="text-[10px] font-black tracking-[0.3em] text-primary uppercase flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">payments</span> Checkout Seguro Mercado Pago
              </h3>
              
              <div className="grid grid-cols-3 gap-4">
                {[
                  { id: 'pix', label: 'PIX (Instantâneo)', icon: 'qr_code_2' },
                  { id: 'cartao', label: 'Cartão de Crédito', icon: 'credit_card' },
                  { id: 'boleto', label: 'Boleto Bancário', icon: 'receipt_long' },
                ].map(m => (
                  <label key={m.id} className={`border p-5 cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${paymentMethod === m.id ? 'border-primary bg-primary/10' : 'border-white/10 bg-black/40 hover:border-primary/30'
                    }`}>
                    <input type="radio" name="paymentMethod" value={m.id} checked={paymentMethod === m.id} onChange={e => setPaymentMethod(e.target.value)} className="hidden" />
                    <span className={`material-symbols-outlined text-3xl ${paymentMethod === m.id ? 'text-primary' : 'text-slate-600'}`}>{m.icon}</span>
                    <span className="text-[8px] font-black uppercase tracking-widest text-center text-slate-300">{m.label}</span>
                  </label>
                ))}
              </div>

              {paymentMethod === 'pix' && (
                <div className="p-5 border border-dashed border-primary/30 bg-primary/5 rounded flex items-center gap-4 text-left">
                  <span className="material-symbols-outlined text-primary text-3xl">bolt</span>
                  <div>
                    <p className="text-[10px] font-black text-white uppercase tracking-widest mb-1">Pagamento Instantâneo</p>
                    <p className="text-[9px] text-white/30 uppercase tracking-widest leading-relaxed">Liberação imediata dos seus tickets de rifa após a confirmação.</p>
                  </div>
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setStep(isPureRaffle ? 0 : 1)} className="px-8 py-5 border border-white/10 text-white/40 hover:text-white font-black uppercase tracking-widest text-[10px] transition-colors">
                  ← Voltar
                </button>
                <button type="submit" disabled={creating} className="flex-1 bg-primary text-black font-black py-5 uppercase tracking-[0.2em] hover:bg-white transition-all disabled:opacity-50 text-sm shadow-[0_10px_40px_rgba(255,193,7,0.2)]">
                  {creating ? 'Gerando Pagamento...' : 'Finalizar Pedido Agora'}
                </button>
              </div>
            </form>
          )}

          {/* Step 3 — PIX QR Code */}
          {step === 3 && paymentData && (
            <div className="bg-surface/30 border border-primary/20 p-12 text-center space-y-8 backdrop-blur-md">
              <div className="space-y-2">
                <span className="text-secondary text-[10px] font-black uppercase tracking-[0.5em] animate-pulse italic">Aguardando Pagamento</span>
                <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter">Seu PIX foi Gerado!</h2>
              </div>

              <div className="flex justify-center">
                <div className="bg-white p-6 rounded-3xl shadow-[0_0_60px_rgba(255,193,7,0.3)] border-[8px] border-primary/50">
                  <img src={`data:image/png;base64,${paymentData.qr_code_base64}`} alt="QR PIX" className="w-64 h-64" />
                </div>
              </div>
              
              <div className="bg-black/50 p-6 border border-white/10 space-y-4 max-w-md mx-auto rounded-lg">
                <p className="text-[10px] font-black tracking-widest text-slate-500 uppercase">Pix Copia e Cola</p>
                <div className="flex gap-2">
                  <input readOnly value={paymentData.qr_code} className="flex-1 bg-background-dark border border-white/10 px-4 py-4 text-[10px] font-mono text-white/40 truncate outline-none rounded" />
                  <button onClick={() => {
                    navigator.clipboard.writeText(paymentData.qr_code || '');
                    alert('PIX Copiado com Sucesso!');
                  }} className="px-6 py-4 bg-primary text-black font-black uppercase text-[10px] tracking-widest hover:bg-white transition-all rounded">
                    Copiar
                  </button>
                </div>
              </div>

              <div className="pt-8 border-t border-white/10 space-y-4">
                <p className="text-[10px] text-white/40 uppercase tracking-widest italic font-bold">Após pagar, seus itens aparecerão no seu painel de operador.</p>
                <button onClick={() => navigate('/dashboard')} className="px-10 py-5 border-2 border-primary text-primary font-black uppercase tracking-[0.4em] text-[10px] hover:bg-primary hover:text-black transition-all rounded-full outline-offset-4">
                  Acessar Meu Painel →
                </button>
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
                  <div className="w-12 h-12 bg-white flex-shrink-0 p-1 border border-white/5 group-hover:border-primary/50 transition-colors">
                    <img src={i.product?.image_url || ''} alt={i.product?.name} className="w-full h-full object-contain" />
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
                <p className="text-[9px] text-white/40 uppercase tracking-widest leading-relaxed">Como todos seus itens são digitais (Rifas), o envio é instantâneo via sistema sem necessidade de endereço físico.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
