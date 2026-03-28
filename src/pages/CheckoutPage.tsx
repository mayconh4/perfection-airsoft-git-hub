import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useCreateOrder } from '../hooks/useOrders';
import { formatPrice } from '../types/database';

const STEPS = ['Identificação & Pagamento', 'Finalização'];

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
  const [step, setStep] = useState(0); // 0 = Form, 3 = PIX Result
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [paymentData, setPaymentData] = useState<{ qr_code?: string; qr_code_base64?: string; checkout_url?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '', cpf: '', email: user?.email || '', phone: '',
    password: ''
  });

  const onlyRaffles = items.every(i => i.product?.brand === 'DROP');
  const grandTotal = total + (onlyRaffles ? 0 : (selectedShipping?.price || 0));

  const [memory, setMemory] = useState<Record<string, string[]>>(() => {
    const saved = localStorage.getItem('operator_memory');
    return saved ? JSON.parse(saved) : { name: [], cpf: [], email: [], phone: [] };
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (items.length === 0) return;

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

    try {
      let currentUserId = user?.id;

      // Se não estiver logado, cria conta primeiro
      if (!currentUserId) {
        if (!form.password || form.password.length < 6) {
          setError('Defina uma senha de no mínimo 6 caracteres para seu painel.');
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
        setError('Usuário não autenticado.');
        return;
      }

      const order = await createOrder(
        { name: form.name, cpf: form.cpf, email: form.email, phone: form.phone, payment_method: paymentMethod },
        {
          street: 'A preencher pós-confirmação',
          district: 'Digital',
          cep: '00000-000',
          city: 'Online',
          shipping_method: onlyRaffles ? 'Entrega Digital' : 'Pendente Endereço',
          shipping_company: 'Perfection Airsoft',
          shipping_price: onlyRaffles ? 0 : (selectedShipping?.price || 0)
        },
        currentUserId
      );

      if (!order) {
        setError('Falha ao registrar o pedido. Verifique os dados.');
        return;
      }

      // Chamada para Mercado Pago
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
        setError('Erro no processador de pagamentos: ' + (errData.error || response.statusText));
        return;
      }

      const payment = await response.json();

      if (payment.checkout_url) {
        window.location.href = payment.checkout_url;
        return;
      }

      if (payment.qr_code) {
        setPaymentData(payment);
        setStep(3); // Passo do PIX
        await clearCart();
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
      setError('Ocorreu um erro inesperado. Tente novamente.');
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
        <span className="text-primary text-xs font-black tracking-[0.3em] uppercase">Finalização</span>
        <div className="h-px flex-1 bg-primary/10"></div>
      </div>
      <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tighter uppercase mb-10 italic">
        Finalizar <span className="text-primary">Transação</span>
      </h1>

      {/* Step Indicator */}
      <div className="flex items-center gap-0 mb-10 border border-white/5 overflow-hidden max-w-2xl">
        {STEPS.map((s, i) => (
          <div key={s} className={`flex-1 py-3 text-center text-[9px] font-black uppercase tracking-[0.2em] transition-colors border-r border-white/5 last:border-0 ${
            (i === 0 && step === 0) || (i === 1 && step === 3) ? 'bg-primary text-black' : 'text-white/20 bg-black/20'
          }`}>
            <span className="mr-2 font-mono">{i === 1 && step === 3 ? '✓' : `0${i + 1}`}</span>{s}
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-3 animate-pulse">
          <span className="material-symbols-outlined text-sm">error</span>
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {step === 0 && (
            <form onSubmit={handleSubmit} className="bg-surface/30 border border-white/5 p-6 space-y-8">
              <div className="space-y-4">
                <h3 className="text-[10px] font-black tracking-[0.2em] text-primary uppercase flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">person</span> Dados de Identificação
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InputField name="name" label="Nome Completo" placeholder="Nome do Operador" className="sm:col-span-2" value={form.name} onChange={handleChange} list="list-name" />
                  <InputField name="cpf" label="CPF para Nota/PIX" placeholder="000.000.000-00" value={form.cpf} onChange={handleChange} list="list-cpf" />
                  <InputField name="phone" label="WhatsApp para Contato" placeholder="(00) 00000-0000" type="tel" value={form.phone} onChange={handleChange} list="list-phone" />
                  <InputField name="email" label="E-mail" placeholder="email@exemplo.com" type="email" className="sm:col-span-2" value={form.email} onChange={handleChange} list="list-email" />
                </div>
              </div>

              <div className="space-y-4 border-t border-white/5 pt-8">
                <h3 className="text-[10px] font-black tracking-[0.2em] text-primary uppercase flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">payments</span> Forma de Pagamento
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'pix', label: 'PIX', icon: 'qr_code_2' },
                    { id: 'cartao', label: 'Cartão', icon: 'credit_card' },
                    { id: 'boleto', label: 'Boleto', icon: 'receipt_long' },
                  ].map(m => (
                    <label key={m.id} className={`border p-4 cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${paymentMethod === m.id ? 'border-primary bg-primary/10 shadow-[0_0_20px_rgba(255,193,7,0.1)]' : 'border-white/10 bg-black/40 hover:border-primary/30'
                      }`}>
                      <input type="radio" name="paymentMethod" value={m.id} checked={paymentMethod === m.id} onChange={e => setPaymentMethod(e.target.value)} className="hidden" />
                      <span className={`material-symbols-outlined text-2xl ${paymentMethod === m.id ? 'text-primary' : 'text-slate-500'}`}>{m.icon}</span>
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-300">{m.label}</span>
                    </label>
                  ))}
                </div>

                {!user && (
                  <div className="mt-6 p-6 bg-primary/5 border border-primary/10 rounded-lg space-y-4">
                    <h4 className="text-[9px] font-black tracking-widest text-primary uppercase flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm">lock</span> Proteção de Acesso
                    </h4>
                    <p className="text-[9px] text-white/30 uppercase tracking-widest leading-relaxed">Crie uma senha de 6 dígitos para acompanhar seus itens e gerenciar sua conta.</p>
                    <InputField name="password" label="Senha do Painel" type="password" placeholder="Mínimo 6 caracteres" value={form.password} onChange={handleChange} />
                  </div>
                )}
              </div>

              {Object.entries(memory).map(([key, values]) => (
                <datalist key={key} id={`list-${key}`}>
                  {values.map(val => <option key={val} value={val} />)}
                </datalist>
              ))}

              <button type="submit" disabled={creating}
                className="w-full bg-primary text-black font-black py-5 uppercase tracking-[0.2em] hover:bg-white transition-all disabled:opacity-50 text-sm flex items-center justify-center gap-2 shadow-[0_15px_40px_rgba(255,193,7,0.15)]">
                {creating ? 'Processando Pedido...' : 'Finalizar e Gerar Pagamento →'}
              </button>
            </form>
          )}

          {step === 3 && paymentData && (
            <div className="bg-surface/30 border border-primary/20 p-10 text-center space-y-8 backdrop-blur-sm">
              <div className="space-y-2">
                <span className="text-primary text-[10px] font-black uppercase tracking-[0.4em]">Pagamento Seguro</span>
                <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">Escaneie o QR Code PIX</h3>
              </div>

              <div className="flex justify-center">
                <div className="bg-white p-6 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-4 border-primary">
                  <img src={`data:image/png;base64,${paymentData.qr_code_base64}`} alt="PIX" className="w-64 h-64" />
                </div>
              </div>
              
              <div className="bg-black/40 p-5 border border-white/5 space-y-4 max-w-md mx-auto">
                <p className="text-[9px] font-black tracking-[0.3em] text-slate-500 uppercase">Pix Copia e Cola</p>
                <div className="flex gap-2">
                  <input readOnly value={paymentData.qr_code} className="flex-1 bg-background-dark border border-white/10 px-4 py-3 text-[10px] font-mono text-white/50 truncate outline-none" />
                  <button onClick={() => {
                    navigator.clipboard.writeText(paymentData.qr_code || '');
                    alert('Código copiado!');
                  }} className="px-6 py-3 bg-primary text-black font-black uppercase text-[10px] tracking-widest hover:bg-white transition-all">
                    Copiar
                  </button>
                </div>
              </div>

              <div className="pt-8 border-t border-white/5 flex flex-col items-center gap-4">
                <p className="text-[9px] text-white/20 uppercase tracking-[0.2em] leading-relaxed max-w-xs">Após o pagamento, seu pedido será processado automaticamente.</p>
                <button onClick={() => navigate('/')} className="text-[10px] font-black text-primary uppercase tracking-[0.4em] hover:text-white transition-all">
                  ← Concluído
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="bg-surface/30 border border-white/5 p-6 lg:sticky lg:top-24 self-start space-y-6 backdrop-blur-sm">
          <h3 className="text-[10px] font-black tracking-[0.2em] text-primary uppercase border-b border-white/5 pb-4">Itens da Operação</h3>
          <div className="space-y-4">
            {items.map(i => (
              <div key={i.id} className="flex items-center gap-4 group">
                <div className="w-12 h-12 bg-white flex-shrink-0 p-1 border border-white/10 group-hover:border-primary/50 transition-colors">
                  <img src={i.product?.image_url || ''} alt={i.product?.name} className="w-full h-full object-contain" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-tight truncate text-white">{i.product?.name}</p>
                  <p className="text-[9px] text-slate-500 font-bold italic">MOD: DROP-UNIT / QTD: {i.quantity}</p>
                </div>
                <span className="text-xs font-mono font-black text-primary italic">
                  {formatPrice((i.product?.price || 0) * i.quantity, i.product?.brand === 'DROP')}
                </span>
              </div>
            ))}
          </div>
          
          <div className="pt-6 border-t border-white/10 space-y-3">
            <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              <span>Subtotal</span>
              <span className="font-mono text-white/60">{formatPrice(total, true)}</span>
            </div>
            {!onlyRaffles && (
              <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                <span>Frete Estimado</span>
                <span className="font-mono text-white/60">{selectedShipping ? formatPrice(selectedShipping.price, true) : 'Calculado Pós-Compra'}</span>
              </div>
            )}
            <div className="flex justify-between items-end pt-4">
              <span className="text-xs font-black uppercase tracking-[0.2em] text-white italic">Investimento Total</span>
              <span className="text-2xl font-black text-primary font-mono tracking-tighter">{formatPrice(grandTotal, true)}</span>
            </div>
          </div>

          <div className="p-4 bg-yellow-500/5 border border-yellow-500/10 space-y-2">
            <p className="text-[9px] text-yellow-500/80 font-black uppercase tracking-widest leading-relaxed">
              * Dados de entrega (para produtos físicos) serão solicitados via WhatsApp ou Painel após a confirmação do pagamento.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
