import { useParams, Link } from 'react-router-dom';
import { useProducts, useCategories } from '../hooks/useProducts';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../types/database';
import { ProductImageSlider } from '../components/ProductImageSlider';
import { SEO } from '../components/SEO';

/** Retorna as N primeiras palavras do nome */
function shortName(name: string, words = 4): string {
  return name.split(' ').slice(0, words).join(' ');
}

/** Restante do nome após as N primeiras palavras */
function restName(name: string, words = 4): string {
  const parts = name.split(' ');
  return parts.length > words ? parts.slice(words).join(' ') : '';
}

export function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const { products, loading } = useProducts(slug);
  const { categories } = useCategories();
  const { addItem } = useCart();
  const category = categories.find(c => c.slug === slug);

  return (
    <>
      <SEO 
        title={category?.label || slug} 
        description={category?.description || undefined} 
      />
      <div className="px-4 sm:px-6 lg:px-8 py-8">
      <section className="relative h-[200px] sm:h-[300px] flex items-end overflow-hidden rounded mb-8 border border-border-tactical">
        <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-background-dark/60 to-transparent"></div>
        <div className="relative w-full pb-6 px-6">
          <div className="border-l-4 border-primary pl-6">
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tighter text-slate-100 uppercase">{category?.label || slug}</h2>
            <p className="text-slate-400 text-sm uppercase tracking-wide mt-2">{category?.description || 'Encontre o equipamento ideal.'}</p>
          </div>
        </div>
      </section>

      <div className="flex flex-col lg:flex-row gap-8">
        <aside className="w-full lg:w-64 flex-shrink-0">
          <div className="lg:sticky lg:top-24 space-y-6">
            <h3 className="text-sm font-bold tracking-[0.15em] text-primary uppercase flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">filter_list</span> Filtrar Arsenal
            </h3>
            <div>
              <h4 className="text-xs font-bold tracking-widest text-slate-500 uppercase mb-3">SISTEMA</h4>
              <div className="space-y-2">
                {['AEG (Electric)','GBB (Gas Blowback)','HPA','Spring'].map(s => (
                  <label key={s} className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" className="w-4 h-4 border border-border-tactical bg-transparent text-primary focus:ring-primary rounded-sm"/>
                    <span className="text-xs tracking-widest uppercase group-hover:text-primary transition-colors">{s}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </aside>

        <div className="flex-1">
          <div className="flex items-center justify-between mb-6 pb-3 border-b border-border-tactical">
            <p className="text-[10px] tracking-widest text-slate-500 uppercase">{loading ? 'Carregando...' : `Exibindo ${products.length} resultados`}</p>
          </div>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-surface/50 border border-border-tactical animate-pulse">
                  <div className="aspect-square bg-white/5"></div>
                  <div className="p-4 sm:p-6 space-y-3">
                    <div className="h-2 bg-white/5 w-1/4"></div>
                    <div className="h-4 bg-white/5 w-3/4"></div>
                    <div className="h-6 bg-white/5 w-1/3 mt-2"></div>
                    <div className="h-10 bg-primary/10 w-full mt-3"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {products.length > 0 ? products.map(p => (
                <div key={p.id} className="bg-surface/50 border border-border-tactical group hover:border-primary hover:shadow-[0_0_25px_rgba(255,193,7,0.07)] transition-all duration-300">
                  <Link to={`/produto/${p.slug || p.id}`} aria-label={`Ver ${p.name}`}>
                    <ProductImageSlider
                      mainImage={p.image_url}
                      images={p.images}
                      alt={p.name}
                      wrapperClassName="relative aspect-square overflow-hidden bg-white p-4 cursor-pointer"
                      imgClassName="w-full h-full object-contain grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-500"
                    >
                      {p.badge && <div className="absolute top-2 right-2 bg-primary/10 text-primary text-[10px] font-bold px-2 py-1 uppercase tracking-widest border border-primary/20 z-20">{p.badge}</div>}
                    </ProductImageSlider>
                  </Link>
                  <div className="p-4 sm:p-6 space-y-2">
                    <span className="text-[10px] font-bold text-primary tracking-[0.15em] uppercase">{p.brand}</span>
                    <Link to={`/produto/${p.slug || p.id}`}>
                      <h4 className="text-sm sm:text-lg font-bold tracking-tight text-slate-100 uppercase leading-tight hover:text-primary transition-colors relative group/name">
                        <div className="truncate">{shortName(p.name)}</div>
                        {restName(p.name) && (
                          <div className="absolute left-0 top-full mt-1 w-full z-20 opacity-0 group-hover/name:opacity-100 transition-opacity duration-200 pointer-events-none drop-shadow-2xl"
                                style={{ fontSize: '0.65em', fontWeight: 400, color: '#cbd5e1', textTransform: 'none', lineHeight: 1.4, backgroundColor: '#0f172a', padding: '6px 10px', borderRadius: '4px', border: '1px solid #334155' }}>
                            {restName(p.name)}
                          </div>
                        )}
                      </h4>
                    </Link>
                    <div className="text-xl sm:text-2xl font-bold text-primary tracking-tighter pt-2">{formatPrice(p.price)}</div>
                    <button
                      onClick={() => addItem(p.id)}
                      aria-label={`Adicionar ${p.name} ao carrinho`}
                      className="w-full mt-3 flex items-center justify-center gap-2 bg-primary text-background-dark font-bold text-xs tracking-widest uppercase py-3 hover:bg-amber-300 active:scale-[0.98] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background-dark"
                    >
                      <span className="material-symbols-outlined text-sm">add</span> Adicionar ao Kit
                    </button>
                  </div>
                </div>
              )) : (
                <div className="col-span-full py-24 flex flex-col items-center gap-6 text-center">
                  <span className="material-symbols-outlined text-6xl text-white/10">inventory_2</span>
                  <div className="space-y-2">
                    <p className="text-sm font-black text-white/30 uppercase tracking-[0.3em]">Nenhum item encontrado</p>
                    <p className="text-[10px] text-white/20 uppercase tracking-widest">Esta categoria ainda não possui produtos disponíveis</p>
                  </div>
                  <Link to="/" className="bg-primary/10 border border-primary/30 text-primary text-[10px] font-black uppercase tracking-widest px-6 py-3 hover:bg-primary hover:text-black transition-all">
                    Voltar ao Arsenal
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
