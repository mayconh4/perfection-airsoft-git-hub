import { Link } from 'react-router-dom';
import { useProducts } from '../hooks/useProducts';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../types/database';
import { ProductImageSlider } from '../components/ProductImageSlider';
import { SEO } from '../components/SEO';

function shortName(name: string, words = 4): string {
  return name.split(' ').slice(0, words).join(' ');
}
function restName(name: string, words = 4): string {
  const parts = name.split(' ');
  return parts.length > words ? parts.slice(words).join(' ') : '';
}

export function HomePage() {
  const { products, loading } = useProducts();
  const { addItem } = useCart();
  
  // Pegamos apenas os 4 primeiros para as "Ofertas da Semana" como no mockup
  const featured = products.slice(0, 4);

  return (
    <>
      <SEO />
      <div className="flex flex-col">
      {/* Hero Section - Elite Operator */}
      <section className="relative h-[600px] w-full flex items-center overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 z-0">
          <img src="/hero-bg.png" alt="Tactical Operator" className="w-full h-full object-cover object-center scale-110 animate-pulse-slow opacity-60" />
          <div className="absolute inset-0 bg-gradient-to-r from-background-dark via-background-dark/40 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-transparent to-transparent"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 w-full">
          <div className="max-w-2xl space-y-6">
            <div className="flex items-center gap-4">
              <div className="h-[2px] w-12 bg-primary"></div>
              <span className="text-primary font-black tracking-[0.4em] text-[10px] uppercase">Lançamento de Equipamentos</span>
            </div>
            
            <h1 className="text-6xl sm:text-8xl font-black text-white leading-tight tracking-tighter uppercase italic">
              FORJA DO <br />
              <span className="text-primary drop-shadow-[0_0_20px_rgba(255,193,7,0.5)]">OPERADOR</span>
            </h1>
            
            <p className="text-white/40 text-sm sm:text-lg leading-relaxed uppercase tracking-[0.1em] font-medium max-w-lg italic">
              Customização de nível militar. Monte seu loadout com as peças de precisão mais avançadas do mercado global.
            </p>

            <div className="flex flex-wrap gap-4 pt-4">
              <button className="bg-primary text-black font-black py-4 px-10 uppercase tracking-widest text-xs hover:bg-white transition-all shadow-[0_0_30px_rgba(255,193,7,0.3)] flex items-center gap-3">
                Montar Agora <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
              <button className="border border-white/20 text-white font-black py-4 px-10 uppercase tracking-widest text-xs hover:bg-white/10 transition-all backdrop-blur-sm">
                Ver Detalhes
              </button>
            </div>
          </div>
        </div>

        {/* Hero Metrics (Bottom Right) */}
        <div className="absolute bottom-12 right-12 hidden lg:flex gap-12 text-right">
          <div>
            <span className="block text-[8px] font-bold text-white/30 uppercase tracking-[0.3em] mb-1">Status do Servidor</span>
            <span className="text-primary font-black text-xs tracking-widest uppercase italic">Conectado [BRA-01]</span>
          </div>
          <div>
            <span className="block text-[8px] font-bold text-white/30 uppercase tracking-[0.3em] mb-1">Latência</span>
            <span className="text-primary font-black text-xs tracking-widest uppercase italic font-mono">12ms</span>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 lg:px-8 w-full py-20 space-y-32">
        {/* Categorias Principais */}
        <section>
          <div className="flex items-center gap-4 mb-12">
            <h3 className="text-xs font-black tracking-[0.4em] text-white/30 uppercase italic">Categorias Principais</h3>
            <div className="h-[1px] flex-1 bg-white/5"></div>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {[
              { label: 'Sniper de Precisão', slug: 'snipers', icon: 'gps_fixed', count: 'EXTREME' },
              { label: 'Equipamento Tático', slug: 'equipamentos', icon: 'shield', count: 'GEAR' },
            ].map((cat, i) => (
              <Link to={`/categoria/${cat.slug}`} key={i} className={`group relative aspect-square border border-white/5 bg-surface/30 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-primary transition-all overflow-hidden`}>
                <span className="absolute top-2 right-3 text-[8px] font-black text-white/20 tracking-widest group-hover:text-primary transition-colors">{cat.count}</span>
                <span className={`material-symbols-outlined text-4xl text-white/20 group-hover:text-primary group-hover:scale-110 transition-all duration-500`}>
                  {cat.icon}
                </span>
                <span className={`text-[10px] font-black tracking-[0.3em] uppercase text-white/40 group-hover:text-white transition-colors`}>
                  {cat.label}
                </span>
                {/* HUD Corner Decor */}
                <div className="absolute bottom-0 right-0 w-2 h-2 border-r border-b border-primary scale-0 group-hover:scale-100 transition-transform"></div>
              </Link>
            ))}
          </div>
        </section>

        {/* Weekly Ops */}
        <section>
          <div className="flex items-center justify-between gap-4 mb-12">
            <div>
              <span className="text-[9px] font-black tracking-[0.5em] text-primary uppercase">Operações Semanais</span>
              <h2 className="text-4xl font-black text-white tracking-tighter uppercase italic mt-1">Ofertas da Semana</h2>
            </div>
            <Link to="/produtos" className="text-[10px] font-black text-white/30 hover:text-primary tracking-widest uppercase transition-colors flex items-center gap-2">
              Ver Todo o Arsenal <span className="material-symbols-outlined text-sm">arrow_outward</span>
            </Link>
          </div>

          {loading ? (
            <div className="py-32 flex flex-col items-center gap-4 opacity-30">
              <div className="w-12 h-[2px] bg-primary animate-pulse"></div>
              <span className="text-[10px] font-black tracking-[0.5em] text-white uppercase animate-pulse">Analisando Arsenal...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {featured.map(p => (
                <div key={p.id} className="group bg-surface/20 border border-white/5 hover:border-primary/40 transition-all overflow-hidden shadow-2xl">
                  {/* Thumbnail */}
                  <Link to={`/produto/${p.id}`} className="block">
                    <ProductImageSlider 
                      mainImage={p.image_url}
                      images={p.images}
                      alt={p.name}
                      wrapperClassName="relative aspect-square bg-white flex items-center justify-center p-4 overflow-hidden"
                      imgClassName="w-full h-full object-contain relative z-10 transition-all duration-700"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>
                      <div className="absolute top-0 left-0 bg-primary text-black text-[9px] font-black px-3 py-1.5 uppercase tracking-widest z-20">20% OFF</div>
                    </ProductImageSlider>
                  </Link>

                  {/* Info */}
                  <div className="p-6 space-y-4">
                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-primary tracking-[0.2em] uppercase">{p.brand}</span>
                      <Link to={`/produto/${p.id}`}>
                        <h4 className="text-lg font-black text-white hover:text-primary leading-tight uppercase tracking-tight italic relative group/name transition-colors">
                          <div className="truncate">{shortName(p.name)}</div>
                          {restName(p.name) && (
                            <div className="absolute left-0 top-full mt-1 w-[120%] z-30 opacity-0 group-hover/name:opacity-100 transition-opacity duration-200 pointer-events-none drop-shadow-2xl"
                                  style={{ fontSize: '0.65em', fontWeight: 400, color: '#cbd5e1', textTransform: 'none', lineHeight: 1.4, fontStyle: 'normal', backgroundColor: '#000', padding: '8px 12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                              {restName(p.name)}
                            </div>
                          )}
                        </h4>
                      </Link>
                    </div>

                    <div className="flex items-baseline gap-3">
                      <span className="text-2xl font-black text-white tracking-tighter italic">{formatPrice(p.price)}</span>
                      <span className="text-[10px] font-bold text-white/20 line-through tracking-widest uppercase italic">{formatPrice(p.price * 1.25)}</span>
                    </div>

                    <button onClick={() => addItem(p.id)}
                            className="w-full border border-primary/20 hover:bg-primary hover:text-black transition-all text-primary font-black py-4 uppercase tracking-[0.2em] text-[10px] italic">
                      Adicionar ao Kit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Newsletter Intelligence */}
        <section className="bg-surface/40 border border-white/5 p-12 lg:p-20 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <span className="material-symbols-outlined text-9xl">info</span>
          </div>
          
          <div className="max-w-2xl relative z-10 space-y-8">
            <div>
              <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter">Receba Inteligência Tática</h2>
              <p className="text-white/40 text-sm tracking-widest uppercase mt-4 leading-relaxed">Assine nossa newsletter para receber alertas de novos drops, códigos de desconto exclusivos e guias de manutenção.</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <input className="flex-1 bg-black/40 border border-white/10 p-4 text-xs font-bold text-white tracking-widest uppercase focus:border-primary transition-colors outline-none" 
                     placeholder="ENDEREÇO DE E-MAIL // [EMAIL]" type="email"/>
              <button className="bg-primary text-black font-black px-12 py-4 uppercase tracking-[0.3em] text-[10px] hover:bg-white transition-colors">
                Assinar
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
    </>
  );
}
