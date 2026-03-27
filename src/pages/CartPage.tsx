import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useShipping } from '../hooks/useShipping';
import { formatPrice } from '../types/database';

export function CartPage() {
  const { items, loading, total, removeItem, updateQuantity, itemCount, selectedShipping, setSelectedShipping } = useCart();
  const { user } = useAuth();
  const { options, loading: shippingLoading, error: shippingError, calculateShipping } = useShipping();
  const [cep, setCep] = useState('');

  const grandTotal = total + (selectedShipping?.price || 0);

  const formatCep = (value: string) => {
    const clean = value.replace(/\D/g, '').slice(0, 8);
    return clean.length > 5 ? `${clean.slice(0, 5)}-${clean.slice(5)}` : clean;
  };

  if (!user) return (
    <div className="px-4 sm:px-6 lg:px-8 py-20 text-center">
      <span className="material-symbols-outlined text-primary text-5xl mb-4 block">lock</span>
      <p className="text-xl font-black uppercase tracking-widest mb-4">Acesso Restrito</p>
      <p className="text-slate-400 mb-6 text-sm">Faça login para acessar seu carrinho</p>
      <Link to="/login" className="bg-primary text-background-dark font-black py-4 px-10 uppercase tracking-widest inline-block">Fazer Login</Link>
    </div>
  );

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="h-px flex-1 bg-primary/10"></div>
        <span className="text-primary text-xs font-black tracking-[0.3em] uppercase">Kit Operacional</span>
        <div className="h-px flex-1 bg-primary/10"></div>
      </div>
      <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tighter uppercase mb-10 italic">
        Carrinho <span className="text-primary">({itemCount})</span>
      </h1>

      {loading ? (
        <div className="text-center py-20 text-primary animate-pulse uppercase tracking-widest text-xs">Sincronizando Arsenal...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 border border-white/5 bg-surface/20">
          <span className="material-symbols-outlined text-slate-700 text-6xl mb-6 block">shopping_cart</span>
          <p className="text-slate-500 uppercase tracking-[0.3em] text-xs mb-8">Seu kit está vazio</p>
          <Link to="/" className="bg-primary text-background-dark font-black py-4 px-10 uppercase tracking-widest inline-block hover:bg-white transition-all">
            Explorar Arsenal
          </Link>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Items List */}
          <div className="flex-1 space-y-3">
            {items.map(item => (
              <div key={item.id} className="flex gap-4 bg-surface/30 border border-white/5 hover:border-primary/20 transition-colors p-4 group">
                <Link to={`/produto/${item.product_id}`} className="flex-shrink-0">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white flex items-center justify-center p-2 border border-primary/10">
                    <img src={item.product?.image_url || ''} alt={item.product?.name} className="w-full h-full object-contain"/>
                  </div>
                </Link>
                <div className="flex-1 min-w-0">
                  <span className="text-[9px] text-primary uppercase tracking-[0.2em] font-black">{item.product?.brand}</span>
                  <Link to={`/produto/${item.product_id}`}>
                    <h3 className="text-sm font-black uppercase leading-snug hover:text-primary transition-colors pr-8 mt-0.5">{item.product?.name}</h3>
                  </Link>
                  <p className="text-primary font-black text-base mt-2 font-mono">{formatPrice(item.product?.price || 0)}</p>
                  <div className="flex items-center gap-0 mt-3 border border-white/10 w-fit">
                    <button onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                      className="w-8 h-8 flex items-center justify-center text-white/50 hover:text-primary hover:bg-primary/10 transition-all text-lg font-black border-r border-white/10">−</button>
                    <span className="text-sm font-bold w-10 text-center font-mono">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                      className="w-8 h-8 flex items-center justify-center text-white/50 hover:text-primary hover:bg-primary/10 transition-all text-lg font-black border-l border-white/10">+</button>
                  </div>
                </div>
                <div className="flex flex-col items-end justify-between">
                  <button onClick={() => removeItem(item.product_id)}
                    className="text-white/20 hover:text-red-500 transition-colors p-1 opacity-0 group-hover:opacity-100">
                    <span className="material-symbols-outlined text-xl">delete</span>
                  </button>
                  <span className="text-sm font-black text-white font-mono">{formatPrice((item.product?.price || 0) * item.quantity)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Sidebar */}
          <div className="w-full lg:w-96 flex-shrink-0 space-y-4">
            {/* Shipping */}
            <div className="bg-surface/30 border border-white/5 p-6">
              <h3 className="text-[10px] font-black tracking-[0.2em] text-primary uppercase mb-5 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">local_shipping</span> Calcular Frete
              </h3>
              <div className="flex gap-2 mb-4">
                <input value={cep} onChange={e => setCep(formatCep(e.target.value))}
                  className="flex-1 bg-background-dark border border-white/10 text-white px-4 py-3 focus:ring-1 focus:ring-primary focus:border-primary text-xs tracking-widest outline-none placeholder:text-white/20 uppercase"
                  placeholder="00000-000" maxLength={9}/>
                <button onClick={() => calculateShipping(cep)} disabled={shippingLoading}
                  className="bg-primary text-black px-5 py-3 font-black text-xs uppercase tracking-widest hover:bg-white disabled:opacity-50 transition-all flex-shrink-0">
                  {shippingLoading ? '...' : 'OK'}
                </button>
              </div>

              {shippingError && <p className="text-red-400 text-[10px] uppercase tracking-widest mb-3">{shippingError}</p>}

              {options.length > 0 && (
                <div className="space-y-2">
                  {options.map(opt => (
                    <button key={opt.id} onClick={() => setSelectedShipping(opt)}
                      className={`w-full flex items-center justify-between p-3 border text-left transition-all ${
                        selectedShipping?.id === opt.id ? 'border-primary bg-primary/5' : 'border-white/5 hover:border-primary/30 bg-background-dark/50'
                      }`}>
                      <div className="flex items-center gap-3 min-w-0">
                        {opt.logo && <img src={opt.logo} alt={opt.company} className="w-8 h-8 object-contain flex-shrink-0 bg-white rounded p-0.5"/>}
                        <div>
                          <p className="text-xs font-black uppercase tracking-wide">{opt.company}</p>
                          <p className="text-[9px] text-slate-500 uppercase tracking-widest">{opt.name} • {opt.delivery_time} dia(s) útil(eis)</p>
                        </div>
                      </div>
                      <span className={`text-sm font-black flex-shrink-0 ml-2 font-mono ${selectedShipping?.id === opt.id ? 'text-primary' : ''}`}>
                        {formatPrice(opt.price)}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {options.length === 0 && !shippingError && !shippingLoading && (
                <p className="text-[9px] text-white/20 uppercase tracking-widest">Digite seu CEP para calcular o frete</p>
              )}
            </div>

            {/* Order Summary */}
            <div className="bg-surface/30 border border-white/5 p-6 lg:sticky lg:top-24">
              <h3 className="text-[10px] font-black tracking-[0.2em] text-primary uppercase mb-6">Resumo da Missão</h3>
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400 uppercase tracking-wider text-xs">Subtotal ({itemCount} itens)</span>
                  <span className="font-mono font-bold">{formatPrice(total)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400 uppercase tracking-wider text-xs">Frete</span>
                  <span className={`font-mono font-bold ${!selectedShipping ? 'text-primary text-xs' : ''}`}>
                    {selectedShipping ? formatPrice(selectedShipping.price) : 'A calcular'}
                  </span>
                </div>
                {selectedShipping && (
                  <div className="text-[9px] text-slate-600 uppercase tracking-widest text-right">
                    {selectedShipping.company} • {selectedShipping.delivery_time} dia(s)
                  </div>
                )}
                <div className="border-t border-primary/10 pt-4 flex justify-between font-black text-xl">
                  <span className="uppercase tracking-wider text-sm">Total</span>
                  <span className="text-primary font-mono">{formatPrice(grandTotal)}</span>
                </div>
              </div>
              <Link to="/checkout"
                className="w-full bg-primary text-background-dark font-black py-4 uppercase tracking-[0.2em] hover:bg-white transition-all block text-center text-sm shadow-[0_0_20px_rgba(255,193,7,0.15)]">
                Finalizar Transação →
              </Link>
              <Link to="/" className="block text-center mt-4 text-[10px] text-white/30 hover:text-white uppercase tracking-widest font-bold transition-colors">
                Continuar Explorando
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
