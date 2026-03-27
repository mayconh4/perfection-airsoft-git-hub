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
    <div className="px-4 sm:px-6 lg:px-8 py-20 text-center">
      <span className="material-symbols-outlined text-primary text-5xl mb-4 block">lock</span>
      <p className="text-xl font-bold uppercase tracking-widest mb-4">Acesso Restrito</p>
      <Link to="/login" className="bg-primary text-background-dark font-bold py-3 px-8 uppercase tracking-widest inline-block">Fazer Login</Link>
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
        <div className="text-center py-20 text-primary animate-pulse uppercase tracking-widest">Carregando...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-20">
          <span className="material-symbols-outlined text-slate-600 text-6xl mb-4 block">favorite</span>
          <p className="text-slate-500 uppercase tracking-widest mb-6">Nenhum item favoritado</p>
          <Link to="/" className="bg-primary text-background-dark font-bold py-3 px-8 uppercase tracking-widest inline-block">Explorar Arsenal</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {items.map(item => (
            <div key={item.id} className="bg-surface/50 border border-border-tactical group hover:border-primary transition-all duration-300 relative">
              <button onClick={() => toggleWishlist(item.product_id)} className="absolute top-3 right-3 z-10 text-red-500 hover:text-red-400">
                <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>favorite</span>
              </button>
              <Link to={`/produto/${item.product_id}`}>
                <div className="aspect-square overflow-hidden bg-surface">
                  <img className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" src={item.product?.image_url || ''} alt={item.product?.name}/>
                </div>
                <div className="p-4 space-y-2">
                  <span className="text-[10px] font-bold text-primary tracking-[0.15em] uppercase">{item.product?.brand}</span>
                  <h4 className="text-sm font-bold tracking-tight text-slate-100 uppercase leading-tight">{item.product?.name}</h4>
                  <div className="text-lg font-bold text-primary tracking-tighter">{formatPrice(item.product?.price || 0)}</div>
                </div>
              </Link>
              <div className="px-4 pb-4">
                <button onClick={() => addItem(item.product_id)}
                        className="w-full flex items-center justify-center gap-2 bg-primary text-background-dark font-bold text-xs tracking-widest uppercase py-3 hover:bg-white transition-colors">
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
