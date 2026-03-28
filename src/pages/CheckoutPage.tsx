import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useCreateOrder } from '../hooks/useOrders';
import { formatPrice } from '../types/database';

const STEPS = ['Operador', 'Endereço', 'Pagamento'];

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
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: '', cpf: '', email: user?.email || '', phone: '',
    street: '', number: '', complement: '', district: '', city: '', state: '', cep: '',
    password: ''
  });
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [paymentData, setPaymentData] = useState<{qr_code?: string, qr_code_base64?: string, checkout_url?: string} | null>(null);
  const navigate = useNavigate();
  const onlyRaffles = items.every(i => i.product?.brand === 'DROP');
  const [error, setError] = useState<string | null>(null);

  const grandTotal = total + (selectedShipping?.price || 0);

  const [memory, setMemory] = useState<Record<string, string[]>>(() => {
    const saved = localStorage.getItem('operator_memory');
    return saved ? JSON.parse(saved) : { name: [], cpf: [], email: [], phone: [] };
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Salvar memória do operador
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
    }

    // Se for só rifa, pula o endereço (Step 1) e vai pro pagamento (Step 2)
    if (step === 0 && onlyRaffles) {
      setStep(2);
    } else if (step < 2) {
      setStep(s => s + 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (items.length === 0) return;

    try {
      let currentUserId = user?.id;

      // Se não estiver logado, cria conta primeiro
      if (!currentUserId) {
        if (!form.password || form.password.length < 6) {
          setError('Crie uma senha de ao menos 6 caracteres.');
          return;
        }
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: { data: { full_name: form.name } }
        });

        if (signUpError) {
          setError(`Erro ao criar conta: ${signUpError.message}`);
          return;
        }
        currentUserId = signUpData.user?.id;
      }

      if (!currentUserId) {
        setError('Falha ao identificar usuário.');
        return;
      }

      const order = await createOrder(
        { name: form.name, cpf: form.cpf, email: form.email, phone: form.phone, payment_method: paymentMethod },
        {
          street: onlyRaffles ? 'Digital/Rifa' : `${form.street}, ${form.number}${form.complement ? ' - ' + form.complement : ''}`,
          district: onlyRaffles ? 'Digital' : form.district,
          cep: onlyRaffles ? '00000-000' : form.cep,
          city: onlyRaffles ? 'Online' : `${form.city} - ${form.state}`,
          shipping_method: onlyRaffles ? 'Entrega Digital' : selectedShipping?.name,
          shipping_company: onlyRaffles ? 'DROP' : selectedShipping?.company,
          shipping_price: onlyRaffles ? 0 : selectedShipping?.price
        },
        currentUserId
      );

      if (!order) {
        setError('Erro ao processar pedido no banco de dados. Tente novamente.');
        return;
      }

      // [FRONTEND SPECIALIST] Chamada para Edge Function (PIX Automático)
      const functionUrl = `https://seewdqetyolfmqsiyban.supabase.co/functions/v1/mercadopago-payment?t=${Date.now()}`;
      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          total: grandTotal,
          paymentMethod,
          customerData: {
            name: form.name,
            email: form.email,
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
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        setError('Servidor MP indisponível: ' + (errData.error || response.statusText));
        return;
      }

      const payment = await response.json();

      if (payment.checkout_url) {
        window.location.href = payment.checkout_url;
        return;
      }

      if (payment.qr_code) {
        setPaymentData(payment);
        setStep(3);
        await clearCart();
        return;
      }

      if (payment.error) {
        setError('Erro no Mercado Pago: ' + payment.error);
      } else {
        await clearCart();
        navigate(`/sucesso/${order.id}`);
      }
    } catch (err: any) {
      console.error('Erro no pagamento:', err);
      setError('Ocorreu um erro inesperado: ' + err.message);
    }
  };


  if (items.length === 0) return (
    <div className="px-4 sm:px-6 lg:px-8 py-20 text-center">
      <p className="text-slate-500 uppercase tracking-widest mb-4 text-sm">Carrinho vazio</p>
      <Link to="/" className="bg-primary text-background-dark font-black py-4 px-10 uppercase tracking-widest inline-block">Explorar Arsenal</Link>
    </div>
  );

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="h-px flex-1 bg-primary/10"></div>
        <span className="text-primary text-xs font-black tracking-[0.3em] uppercase">Finalização</span>
        <div className="h-px flex-1 bg-primary/10"></div>
      </div>
      <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tighter uppercase mb-10 italic">
        Finalizar <span className="text-primary">Transação</span>
      </h1>

      {/* Step Indicator */}
      <div className="flex items-center gap-0 mb-10 border border-white/5 overflow-hidden">
        {STEPS.map((s, i) => (
          (onlyRaffles && i === 1) ? null : (
            <div key={s} className={`flex-1 py-3 text-center text-[9px] font-black uppercase tracking-[0.2em] transition-colors border-r border-white/5 last:border-0 ${i === step ? 'bg-primary text-black' : i < step ? 'bg-primary/10 text-primary' : 'text-white/20 bg-black/20'
              }`}>
              <span className="mr-2 font-mono">{i < step ? '✓' : `0${i + 1}`}</span>{s}
            </div>
          )
        ))}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-black uppercase tracking-widest flex items-center gap-3">
          <span className="material-symbols-outlined text-sm">error</span>
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {/* Step 0 — Operador */}
          {step === 0 && (
            <form onSubmit={handleNext} className="bg-surface/30 border border-white/5 p-6 space-y-4">
              <h3 className="text-[10px] font-black tracking-[0.2em] text-primary uppercase mb-2">Dados do Operador</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField name="name" label="Nome Completo" placeholder="Nome completo" className="sm:col-span-2" value={form.name} onChange={handleChange} list="list-name" />
                <InputField name="cpf" label="CPF" placeholder="000.000.000-00" value={form.cpf} onChange={handleChange} list="list-cpf" />
                <InputField name="phone" label="Telefone / WhatsApp" placeholder="(00) 00000-0000" type="tel" value={form.phone} onChange={handleChange} list="list-phone" />
                <InputField name="email" label="E-mail" placeholder="email@exemplo.com" type="email" className="sm:col-span-2" value={form.email} onChange={handleChange} list="list-email" />
              </div>

              {/* Datalists for memory suggestions */}
              {Object.entries(memory).map(([key, values]) => (
                <datalist key={key} id={`list-${key}`}>
                  {values.map(val => <option key={val} value={val} />)}
                </datalist>
              ))}

              <button type="submit" className="w-full bg-primary text-black font-black py-4 uppercase tracking-[0.2em] hover:bg-white transition-all mt-4 text-sm">
                Próximo: Endereço →
              </button>
            </form>
          )}

          {/* Step 1 — Endereço */}
          {step === 1 && (
            <form onSubmit={handleNext} className="bg-surface/30 border border-white/5 p-6 space-y-4">
              <h3 className="text-[10px] font-black tracking-[0.2em] text-primary uppercase mb-2">Endereço de Entrega</h3>
              <div className="grid grid-cols-1 sm:grid-cols-6 gap-4">
                <InputField name="cep" label="CEP" placeholder="00000-000" className="sm:col-span-2" value={form.cep} onChange={handleChange}/>
                <InputField name="street" label="Rua / Av." placeholder="Rua Principal" className="sm:col-span-4" value={form.street} onChange={handleChange}/>
                <InputField name="number" label="Número" placeholder="123" className="sm:col-span-2" value={form.number} onChange={handleChange}/>
                <InputField name="complement" label="Complemento" placeholder="Apto 4B" className="sm:col-span-2" required={false} value={form.complement} onChange={handleChange}/>
                <InputField name="district" label="Bairro" placeholder="Centro" className="sm:col-span-2" value={form.district} onChange={handleChange}/>
                <InputField name="city" label="Cidade" placeholder="São Paulo" className="sm:col-span-4" value={form.city} onChange={handleChange}/>
                <InputField name="state" label="UF" placeholder="SP" className="sm:col-span-2" value={form.state} onChange={handleChange}/>
              </div>
              <div className="flex gap-3 mt-4">
                <button type="button" onClick={() => setStep(0)} className="px-6 py-4 border border-white/10 text-white/40 hover:text-white font-black uppercase tracking-widest text-xs transition-colors">
                  ← Voltar
                </button>
                <button type="submit" className="flex-1 bg-primary text-black font-black py-4 uppercase tracking-[0.2em] hover:bg-white transition-all text-sm">
                  Próximo: Pagamento →
                </button>
              </div>
            </form>
          )}

          {/* Step 2 — Pagamento */}
          {step === 2 && (
            <form onSubmit={handleSubmit} className="bg-surface/30 border border-white/5 p-6 space-y-4">
              <h3 className="text-[10px] font-black tracking-[0.2em] text-primary uppercase mb-2">Forma de Pagamento</h3>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'pix', label: 'PIX', icon: 'qr_code_2' },
                  { id: 'cartao', label: 'Cartão', icon: 'credit_card' },
                  { id: 'boleto', label: 'Boleto', icon: 'receipt_long' },
                ].map(m => (
                  <label key={m.id} className={`border p-4 cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${paymentMethod === m.id ? 'border-primary bg-primary/10' : 'border-white/10 bg-background-dark/50 hover:border-primary/30'
                    }`}>
                    <input type="radio" name="paymentMethod" value={m.id} checked={paymentMethod === m.id} onChange={e => setPaymentMethod(e.target.value)} className="hidden" />
                    <span className="material-symbols-outlined text-2xl text-slate-300">{m.icon}</span>
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-300">{m.label}</span>
                  </label>
                ))}
              </div>

              {paymentMethod === 'pix' && (
                <div className="p-4 border border-dashed border-primary/30 text-center bg-primary/5">
                  <span className="material-symbols-outlined text-primary text-3xl mb-2 block">qr_code_2</span>
                  <p className="text-xs text-slate-400 uppercase tracking-widest">O QR Code PIX será gerado ao confirmar o pedido.</p>
                </div>
              )}
              {paymentMethod === 'cartao' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                  <InputField name="card_number" label="Número do Cartão" placeholder="0000 0000 0000 0000" className="sm:col-span-2" required={false} value={(form as any).card_number || ''} onChange={handleChange} />
                  <InputField name="card_expiry" label="Validade" placeholder="MM/AA" required={false} value={(form as any).card_expiry || ''} onChange={handleChange} />
                  <InputField name="card_cvv" label="CVV" placeholder="123" required={false} value={(form as any).card_cvv || ''} onChange={handleChange} />
                </div>
              )}
              {paymentMethod === 'boleto' && (
                <div className="p-4 border border-dashed border-primary/30 text-center bg-primary/5">
                  <p className="text-xs text-slate-400 uppercase tracking-widest">O boleto será enviado ao seu e-mail após a confirmação.</p>
                </div>
              )}

              {!user && (
                <div className="p-6 bg-primary/5 border border-primary/20 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-primary text-xl">identity_platform</span>
                    <h4 className="text-[10px] font-black tracking-widest text-primary uppercase">Criação de Conta de Operador</h4>
                  </div>
                  <p className="text-[10px] text-white/40 uppercase tracking-widest leading-relaxed">Defina uma senha para acompanhar seu pedido e acessar o painel de inteligência.</p>
                  <InputField name="password" label="Criar Senha" type="password" placeholder="Mínimo 6 caracteres" value={form.password} onChange={handleChange} />
                </div>
              )}

              <div className="flex gap-3 mt-4">
                <button type="button" onClick={() => setStep(1)} className="px-6 py-4 border border-white/10 text-white/40 hover:text-white font-black uppercase tracking-widest text-xs transition-colors">
                  ← Voltar
                </button>
                <button type="submit" disabled={creating}
                  className="flex-1 bg-primary text-black font-black py-4 uppercase tracking-[0.2em] hover:bg-white transition-all disabled:opacity-50 text-sm flex items-center justify-center gap-2">
                  {creating ? 'Processando...' : 'Confirmar Pedido'}
                  {!creating && <span className="material-symbols-outlined text-sm">arrow_forward</span>}
                </button>
              </div>
            </form>
          )}

          {/* Step 3 — Pagamento PIX */}
          {step === 3 && paymentData && (
            <div className="bg-surface/30 border border-primary/20 p-8 text-center space-y-6">
              <div className="flex justify-center">
                <div className="bg-white p-4 rounded-xl shadow-2xl">
                  <img src={`data:image/png;base64,${paymentData.qr_code_base64}`} alt="QR Code PIX" className="w-64 h-64 mx-auto" />
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-xl font-black text-primary uppercase italic tracking-tighter">Pague com PIX</h3>
                <p className="text-xs text-slate-400 uppercase tracking-widest">Escaneie o QR Code acima para finalizar sua compra.</p>
              </div>

              <div className="bg-black/40 p-4 border border-white/5 space-y-3">
                <p className="text-[10px] font-black tracking-[0.2em] text-slate-500 uppercase">Copia e Cola</p>
                <div className="flex gap-2">
                  <input readOnly value={paymentData.qr_code} className="flex-1 bg-background-dark border border-white/10 px-4 py-3 text-[10px] font-mono text-white/60 truncate outline-none focus:border-primary/50 transition-colors" />
                  <button onClick={() => {
                    navigator.clipboard.writeText(paymentData.qr_code || '');
                    alert('Código copiado!');
                  }} className="px-6 py-3 bg-primary text-black font-black uppercase text-[10px] tracking-widest hover:bg-white transition-all">
                    Copiar
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-white/5">
                <button onClick={() => navigate('/')} className="text-[10px] font-black text-primary uppercase tracking-[0.3em] hover:text-white transition-colors">
                  ← Voltar para a Loja
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Summary Sidebar */}
        <div className="bg-surface/30 border border-white/5 p-6 lg:sticky lg:top-24 self-start">
          <h3 className="text-[10px] font-black tracking-[0.2em] text-primary uppercase mb-5">Resumo do Pedido</h3>
          <div className="space-y-3 mb-5">
            {items.map(i => (
              <div key={i.id} className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white flex-shrink-0 p-1">
                  <img src={i.product?.image_url || ''} alt={i.product?.name} className="w-full h-full object-contain" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-black uppercase leading-tight truncate">{i.product?.name}</p>
                  <p className="text-[9px] text-slate-500">x{i.quantity}</p>
                </div>
                <span className="text-xs font-mono font-black">
                  {formatPrice((i.product?.price || 0) * i.quantity, i.product?.brand === 'DROP')}
                </span>
              </div>
            ))}
          </div>
          <div className="border-t border-white/5 pt-4 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500 uppercase tracking-wider">Subtotal</span>
              <span className="font-mono">{formatPrice(total, true)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500 uppercase tracking-wider">Frete</span>
              <span className="font-mono">{selectedShipping ? formatPrice(selectedShipping.price, true) : '—'}</span>
            </div>
            <div className="flex justify-between font-black text-lg border-t border-white/5 pt-2 mt-2">
              <span className="uppercase text-sm">Total</span>
              <span className="text-primary font-mono">{formatPrice(grandTotal, true)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
