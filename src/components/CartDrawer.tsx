import { useCart } from '../context/CartContext';
import { Link } from 'react-router-dom';
import { formatPrice } from '../types/database';

export function CartDrawer() {
  const { isCartOpen, setIsCartOpen, items, total, removeItem, updateQuantity } = useCart();

  if (!isCartOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] transition-opacity" 
        onClick={() => setIsCartOpen(false)} 
      />
      
      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-full sm:w-[400px] bg-background-dark border-l border-primary/20 z-[101] flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        <div className="p-6 border-b border-primary/20 flex justify-between items-center bg-surface">
          <h2 className="text-base font-black text-white uppercase tracking-widest flex items-center gap-3">
            <span className="material-symbols-outlined text-primary text-2xl">shopping_cart</span>
            Seu Kit Tático
          </h2>
          <button onClick={() => setIsCartOpen(false)} className="text-white/50 hover:text-primary transition-colors p-2 -mr-2">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-background-dark">
          {items.length === 0 ? (
            <div className="text-center text-white/40 pt-10 uppercase tracking-[0.2em] font-bold text-xs">
              <span className="material-symbols-outlined text-4xl mb-4 opacity-50 block">remove_shopping_cart</span>
              Seu kit está vazio.
            </div>
          ) : (
            items.map(item => (
              <div key={item.id} className="flex gap-4 bg-surface/40 p-3 border border-white/5 relative group hover:border-primary/30 transition-colors">
                <Link to={`/produto/${item.product?.slug || item.product_id}`} onClick={() => setIsCartOpen(false)} className="size-20 bg-white flex items-center justify-center p-2 flex-shrink-0">
                  <img src={item.product?.image_url || ''} alt={item.product?.name} className="w-full h-full object-contain" />
                </Link>
                <div className="flex-1 flex flex-col justify-between py-1">
                  <div>
                    <Link to={`/produto/${item.product?.slug || item.product_id}`} onClick={() => setIsCartOpen(false)}>
                      <h4 className="text-[10px] font-black text-white leading-tight uppercase line-clamp-2 pr-6 mb-1 hover:text-primary transition-colors">
                        {item.product?.brand === 'DROP' ? <span className="text-primary mr-1">DROP:</span> : null}
                        {item.product?.name}
                      </h4>
                    </Link>
                    <span className="text-[10px] text-primary font-black">
                      {formatPrice(item.product?.price || 0, item.product?.brand === 'DROP')}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 bg-background-dark w-fit border border-white/10 rounded-sm">
                    <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="px-3 py-1 text-white/50 hover:text-primary transition-colors text-xs font-bold">-</button>
                    <span className="text-[10px] font-mono font-bold w-4 text-center">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="px-3 py-1 text-white/50 hover:text-primary transition-colors text-xs font-bold">+</button>
                  </div>
                  {item.metadata?.tickets && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {item.metadata.tickets.slice(0, 5).map((t: number) => (
                        <span key={t} className="bg-primary/10 text-primary text-[8px] font-black px-1 border border-primary/20">#{String(t).padStart(2, '0')}</span>
                      ))}
                      {item.metadata.tickets.length > 5 && (
                        <span className="text-[8px] text-white/30 font-black">+{item.metadata.tickets.length - 5}</span>
                      )}
                    </div>
                  )}
                </div>
                <button 
                  onClick={() => removeItem(item.id)} 
                  className="absolute top-2 right-2 text-white/40 hover:text-red-500 group-hover/item:opacity-100 transition-all bg-background-dark/80 p-2 rounded-sm"
                  title="Remover"
                >
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                </button>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="p-6 border-t border-primary/20 bg-surface shadow-[0_-10px_30px_rgba(0,0,0,0.5)] z-10">
            {/* Free shipping progress bar */}
            {total < 500 && (
              <div className="mb-5">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-white/40">
                    Frete grátis acima de R$&nbsp;500
                  </span>
                  <span className="text-[9px] font-black text-primary tracking-widest">
                    faltam {formatPrice(500 - total)}
                  </span>
                </div>
                <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-500"
                    style={{ width: `${Math.min((total / 500) * 100, 100)}%` }}
                  />
                </div>
              </div>
            )}
            {total >= 500 && (
              <div className="flex items-center gap-2 mb-5 py-2 px-3 bg-primary/10 border border-primary/20">
                <span className="material-symbols-outlined text-primary text-[16px]">local_shipping</span>
                <span className="text-[9px] font-black uppercase tracking-widest text-primary">
                  Frete grátis desbloqueado!
                </span>
              </div>
            )}
             <div className="flex justify-between items-center mb-6">
               <span className="text-xs font-bold uppercase text-white/50 tracking-widest">Subtotal:</span>
               <span className="text-xl font-mono text-primary font-black">{formatPrice(total, true)}</span>
             </div>
             <Link
               to="/checkout"
               onClick={() => setIsCartOpen(false)}
               className="w-full bg-primary text-black font-black uppercase tracking-[0.2em] py-4 flex items-center justify-center gap-2 hover:bg-white transition-all text-xs border border-primary hover:border-white shadow-[0_0_20px_rgba(255,193,7,0.15)]"
             >
               Finalizar Operação <span className="material-symbols-outlined text-sm">arrow_forward</span>
             </Link>
             <button
               onClick={() => setIsCartOpen(false)}
               className="w-full mt-3 text-[10px] text-white/40 hover:text-white uppercase tracking-widest font-bold transition-colors py-2"
             >
               Continuar Explorando
             </button>
          </div>
        )}
      </div>
    </>
  );
}
