import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useProduct } from '../hooks/useProducts';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../hooks/useWishlist';
import { useAuth } from '../context/AuthContext';
import { formatPrice } from '../types/database';
import { SEO } from '../components/SEO';

export function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<'descricao' | 'especificacoes'>('descricao');
  const { product, loading } = useProduct(id || '');
  const { addItem } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { user } = useAuth();

  if (loading) return <div className="py-20 text-center text-primary animate-pulse uppercase tracking-widest">Carregando produto...</div>;
  if (!product) return <div className="py-20 text-center text-slate-500 uppercase tracking-widest">Produto não encontrado</div>;

  const specs = product.specs ? Object.entries(product.specs) : [];

  return (
    <>
      <SEO 
        title={product.name} 
        description={product.description || undefined} 
        image={product.image_url || undefined} 
      />
      <div className="px-4 sm:px-6 lg:px-8 py-6">
      <nav className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.15em] mb-8 text-primary/70 flex-wrap">
        <Link to="/" className="hover:text-primary transition-colors">Arsenal</Link>
        <span className="material-symbols-outlined text-[12px]">chevron_right</span>
        <Link to={`/categoria/${(product.category as any)?.slug || ''}`} className="hover:text-primary transition-colors">{(product.category as any)?.label || 'Categoria'}</Link>
        <span className="material-symbols-outlined text-[12px]">chevron_right</span>
        <span className="text-slate-100">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 mb-16">
        <div className="relative aspect-square bg-white border border-primary/20 p-4 sm:p-8 flex items-center justify-center overflow-hidden">
          <img alt={product.name} className="w-full h-full object-contain drop-shadow-md" src={product.image_url || ''}/>
        </div>

        <div className="flex flex-col">
          <span className="text-xs font-bold tracking-[0.3em] text-primary uppercase mb-2">{product.brand}</span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4 text-slate-100 uppercase">{product.name}</h1>
          <div className="flex items-center gap-3 mb-6 flex-wrap">
            <span className="text-2xl sm:text-3xl font-mono text-slate-100">{formatPrice(product.price)}</span>
            {product.old_price && <span className="text-sm text-slate-500 line-through">{formatPrice(product.old_price)}</span>}
            
            <div className="flex gap-2">
              <span className="bg-slate-800 text-slate-300 text-[10px] font-bold px-3 py-1 border border-slate-700 uppercase tracking-widest leading-none flex items-center">{product.system || 'N/A'}</span>
              <span className={`text-[10px] font-bold px-3 py-1 border uppercase tracking-widest leading-none flex items-center ${product.condition === 'usado' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' : 'bg-primary/10 text-primary border-primary/20'}`}>
                {product.condition === 'novo' ? 'Novo' : 'Seminovo'}
              </span>
              {product.badge && <span className="bg-primary text-background-dark text-[10px] font-black px-2 py-1 uppercase tracking-widest leading-none flex items-center">{product.badge}</span>}
            </div>
          </div>

          <div className="flex items-center gap-3 py-3 px-4 bg-primary/5 border-l-2 border-primary mb-6">
            <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span></span>
            <span className="text-xs font-bold tracking-[0.15em] text-primary uppercase">{product.stock > 0 ? `EM ESTOQUE (${product.stock} unid.)` : 'ESGOTADO'}</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <button
                    onClick={async () => {
                      await addItem(product.id);
                    }}
                    disabled={product.stock === 0}
                    className="flex-1 bg-primary hover:bg-primary/90 text-background-dark font-bold py-4 px-8 flex items-center justify-center gap-3 transition-all active:scale-[0.98] uppercase tracking-widest text-sm disabled:opacity-50">
              <span className="material-symbols-outlined">add_shopping_cart</span> Adicionar ao Kit
            </button>
            <button onClick={() => user ? toggleWishlist(product.id) : alert('Faça login primeiro')}
                    className={`flex-1 border font-bold py-4 px-8 flex items-center justify-center gap-3 transition-colors uppercase tracking-widest text-sm ${isInWishlist(product.id) ? 'border-red-500 text-red-500' : 'border-primary/40 hover:border-primary text-primary'}`}>
              <span className="material-symbols-outlined" style={isInWishlist(product.id) ? {fontVariationSettings: "'FILL' 1"} : {}}>favorite</span>
              {isInWishlist(product.id) ? 'Favoritado' : 'Favoritos'}
            </button>
          </div>

          {/* WhatsApp Quick Order */}
          <a 
            href={`https://wa.me/5511999999999?text=${encodeURIComponent(`Olá Perfection! Tenho interesse no produto *${product.name}* (${window.location.href}). Poderia me dar mais detalhes?`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-[#25D366]/10 border border-[#25D366]/30 text-[#25D366] font-black py-4 px-8 flex items-center justify-center gap-3 hover:bg-[#25D366] hover:text-white transition-all uppercase tracking-[0.2em] text-xs mb-8"
          >
            <svg viewBox="0 0 24 24" className="size-5 fill-current" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
            Tirar Dúvidas via WhatsApp
          </a>
        </div>
      </div>

      {/* Tabs Container */}
      <div className="mb-16">
        <div className="flex border-b border-primary/20 mb-6 overflow-x-auto min-w-full">
          <button 
            onClick={() => setActiveTab('descricao')}
            className={`px-6 sm:px-8 py-4 font-bold uppercase tracking-[0.15em] text-xs sm:text-sm transition-colors relative whitespace-nowrap ${activeTab === 'descricao' ? 'text-primary' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Descrição Operacional
            {activeTab === 'descricao' && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-primary"></div>}
          </button>
          
          {specs.length > 0 && (
            <button 
              onClick={() => setActiveTab('especificacoes')}
              className={`px-6 sm:px-8 py-4 font-bold uppercase tracking-[0.15em] text-xs sm:text-sm transition-colors relative whitespace-nowrap ${activeTab === 'especificacoes' ? 'text-primary' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Briefing Técnico
              {activeTab === 'especificacoes' && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-primary"></div>}
            </button>
          )}
        </div>

        {/* Tab Content */}
        <div className="min-h-[200px]">
          {activeTab === 'descricao' && (
            <div className="animate-in fade-in slide-in-from-bottom-2">
              {product.description ? (
                <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{product.description}</p>
              ) : (
                <p className="text-slate-500 text-sm uppercase tracking-widest italic">Nenhuma descrição operacional disponível para este item.</p>
              )}
            </div>
          )}

          {activeTab === 'especificacoes' && specs.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-primary/10 border border-primary/20 animate-in fade-in slide-in-from-bottom-2">
              {specs.map(([label, value]) => (
                <div key={label} className="flex items-center justify-between p-4 bg-background-dark hover:bg-surface transition-colors">
                  <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">{label.replace(/_/g, ' ')}</span>
                  <span className="text-sm font-mono text-slate-100">{String(value)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
