import { Link } from 'react-router-dom';
import { useWishlist } from '../hooks/useWishlist';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { formatPrice } from '../types/database';

export function WishlistPage() {
  const { items, loading, toggleWishlist } = useWishlist();
  const { addItem } = useCart();
  const { user } = useAuth();

  if (!user) return (
    <div className="px-4 sm:px-6 lg:px-8 py-24 flex flex-col items-center gap-6 text-center">
      <div className="relative">
        <span className="material-symbols-outlined text-6xl text-primary/30 block" style={{fontVariationSettings: "'FILL' 1"}}>lock</span>
        <div className="absolute inset-0 bg-primary/10 blur-2xl rounded-full pointer-events-none"></div>
      </div>
      <div className="space-y-2">
        <p className="text-xl font-black uppercase tracking-[0.2em] text-white">Acesso Restrito</p>
        <p className="text-[10px] text-white/40 uppercase tracking-widest">Faça login para acessar seus favoritos</p>
      </div>
      <Link to="/login" className="bg-primary text-background-dark font-black py-4 px-10 uppercase tracking-widest hover:bg-amber-300 active:scale-[0.98] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
        Fazer Login
      </Link>
    </div>
  );

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-2 mb-8">
        <div className="h-1 w-12 bg-primary"></div>
        <span className="text-primary text-xs font-black tracking-widest uppercase">Loadouts Salvos</span>
      </div>
      <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tighter uppercase mb-8">Wishlist ({items.length})</h1>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-surface/50 border border-border-tactical animate-pulse">
              <div className="aspect-square bg-white/5"></div>
              <div className="p-4 space-y-3">
                <div className="h-2 bg-white/5 w-1/4"></div>
                <div className="h-4 bg-white/5 w-3/4"></div>
                <div className="h-5 bg-primary/10 w-1/3"></div>
                <div className="h-10 bg-primary/10 w-full mt-2"></div>
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="py-24 flex flex-col items-center gap-6 text-center border border-white/5 bg-surface/10">
          <span className="material-symbols-outlined text-6xl text-white/10" style={{fontVariationSettings: "'FILL' 1"}}>favorite</span>
          <div className="space-y-2">
            <p className="text-sm font-black text-white/30 uppercase tracking-[0.3em]">Nenhum item favoritado</p>
            <p className="text-[10px] text-white/20 uppercase tracking-widest">Salve equipamentos para comprar depois</p>
          </div>
          <Link to="/" className="bg-primary/10 border border-primary/30 text-primary text-[10px] font-black uppercase tracking-widest px-6 py-3 hover:bg-primary hover:text-black transition-all">
            Explorar Arsenal
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {items.map(item => (
            <div key={item.id} className="bg-surface/50 border border-border-tactical group hover:border-primary hover:shadow-[0_0_25px_rgba(255,193,7,0.07)] transition-all duration-300 relative">
              <button
                onClick={() => toggleWishlist(item.product_id)}
                aria-label={`Remover ${item.product?.name || 'item'} dos favoritos`}
                className="absolute top-3 right-3 z-10 text-red-500 hover:text-red-400 hover:scale-110 active:scale-95 transition-all p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded-sm"
              >
                <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>favorite</span>
              </button>
              <Link to={`/produto/${item.product?.slug || item.product_id}`} aria-label={`Ver ${item.product?.name || 'produto'}`}>
                <div className="aspect-square overflow-hidden bg-surface">
                  <img className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-500" src={item.product?.image_url || ''} alt={item.product?.name}/>
                </div>
                <div className="p-4 space-y-2">
                  <span className="text-[10px] font-bold text-primary tracking-[0.15em] uppercase">{item.product?.brand}</span>
                  <h4 className="text-sm font-bold tracking-tight text-slate-100 uppercase leading-tight group-hover:text-primary transition-colors">{item.product?.name}</h4>
                  <div className="text-lg font-bold text-primary tracking-tighter">{formatPrice(item.product?.price || 0)}</div>
                </div>
              </Link>
              <div className="px-4 pb-4">
                <button
                  onClick={() => addItem(item.product_id)}
                  aria-label={`Adicionar ${item.product?.name || 'item'} ao carrinho`}
                  className="w-full flex items-center justify-center gap-2 bg-primary text-background-dark font-bold text-xs tracking-widest uppercase py-3 hover:bg-amber-300 active:scale-[0.98] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background-dark"
                >
                  <span className="material-symbols-outlined text-sm">add</span> Adicionar ao Kit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
