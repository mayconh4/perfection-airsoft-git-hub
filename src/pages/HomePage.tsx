import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useProducts } from '../hooks/useProducts';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../types/database';
import { ProductImageSlider } from '../components/ProductImageSlider';
import { SEO } from '../components/SEO';
import { supabase } from '../lib/supabase';

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
  const [currentSlide, setCurrentSlide] = useState(0);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [subscribeStatus, setSubscribeStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail) return;
    setSubscribeStatus('loading');
    
    try {
      const { error } = await supabase
        .from('newsletters')
        .insert([{ email: newsletterEmail }]);
        
      if (error) throw error;
      setSubscribeStatus('success');
      setNewsletterEmail('');
      setTimeout(() => setSubscribeStatus('idle'), 5000);
    } catch (err) {
      console.error('Newsletter error:', err);
      setSubscribeStatus('error');
      setTimeout(() => setSubscribeStatus('idle'), 5000);
    }
  };
  
  const slides = [
    /* {
      id: 'forge',
      subtitle: "Lançamento de Equipamentos",
      title: "FORJA DO <br /><span className='text-primary'>OPERADOR</span>",
      description: "Customização de nível militar. Monte seu loadout com as peças de precisão mais avançadas do mercado global.",
      buttonText: "Montar Agora",
      link: "/produtos",
      image: "/assets/forge-banner.png",
      accent: "text-primary",
      glow: "shadow-[0_0_30px_rgba(255,193,7,0.3)]"
    }, */
    {
      id: 'drop',
      subtitle: "COMUNIDADE TÁTICA",
      title: "MAIS QUE UM JOGO, <br /><span className='text-blue-500'>UMA MISSÃO</span>",
      description: "Conectamos operadores, campos e entusiastas em uma rede de elite. A irmandade que se forja no campo, consolidada no Hub.",
      buttonText: "Iniciar Protocolo",
      link: "/drop/criar",
      image: "/assets/drop-banner.png",
      accent: "text-blue-500",
      glow: "shadow-[0_0_30px_rgba(59,130,246,0.3)]"
    },
    {
      id: 'field',
      subtitle: "COORDENADAS ATIVAS",
      title: "CONECTE SUA <br /><span className='text-green-500'>EQUIPE</span>",
      description: "Mapa tático completo de campos e missões. Organize seu esquadrão, gerencie ingressos e domine o território nacional.",
      buttonText: "Recrutar Campo",
      link: "/eventos",
      image: "/assets/field-banner.png",
      accent: "text-green-500",
      glow: "shadow-[0_0_30px_rgba(34,197,94,0.3)]"
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [slides.length]);

  // Pegamos apenas os 4 primeiros para as "Ofertas da Semana" como no mockup
  const featured = products.slice(0, 4);

  return (
    <>
      <SEO />
      <div className="flex flex-col">
      {/* Hero Section - Elite Operator Carousel */}
      <section className="relative min-h-[450px] lg:h-[500px] w-full flex items-center overflow-hidden border-b border-white/5 bg-background-dark">
        {slides.map((slide, index) => (
          <div 
            key={slide.id}
            className={`absolute inset-0 transition-all duration-1000 ease-in-out ${index === currentSlide ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
          >
            <div className="absolute inset-0 z-0">
              <img src={slide.image} alt={slide.subtitle} className={`w-full h-full object-cover object-center transition-transform duration-[6000ms] ease-linear ${index === currentSlide ? 'scale-110' : 'scale-100'} opacity-60`} />
              <div className={`absolute inset-0 bg-gradient-to-r from-background-dark via-transparent to-background-dark/20`}></div>
              <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-transparent to-transparent"></div>
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 h-full flex flex-col lg:flex-row lg:items-start lg:justify-between pt-12 lg:pt-20 w-full">
              {/* Headline Block - Left Side */}
              <div className={`max-w-2xl space-y-4 lg:space-y-6 transition-all duration-700 delay-300 ${index === currentSlide ? 'translate-x-0 opacity-100' : '-translate-x-12 opacity-0'}`}>
                <div className="flex items-center gap-4">
                  <div className={`h-[2px] w-8 lg:w-12 transition-colors duration-500 ${slide.accent === 'text-primary' ? 'bg-primary' : slide.accent === 'text-blue-500' ? 'bg-blue-500' : 'bg-green-500'}`}></div>
                  <span className={`font-black tracking-[0.4em] text-[8px] lg:text-[10px] uppercase ${slide.accent}`}>{slide.subtitle}</span>
                </div>
                
                <h1 
                  className="text-4xl sm:text-5xl lg:text-7xl font-black text-white leading-tight tracking-tighter uppercase italic"
                  dangerouslySetInnerHTML={{ __html: slide.title }}
                />
                
                <p className="text-white/40 text-[10px] lg:text-sm leading-relaxed uppercase tracking-[0.1em] font-medium max-w-lg italic">
                  {slide.description}
                </p>
              </div>

              {/* Action Buttons - Right Side */}
              <div className={`flex flex-wrap lg:flex-col gap-3 lg:gap-4 pt-6 lg:pt-0 lg:items-end lg:mt-6 transition-all duration-700 delay-500 ${index === currentSlide ? 'translate-x-0 opacity-100' : 'translate-x-12 opacity-0'}`}>
                <Link 
                  to={slide.link}
                  className={`text-black font-black py-3 lg:py-4 px-6 lg:px-10 uppercase tracking-widest text-[9px] lg:text-xs hover:bg-white transition-all flex items-center gap-3 w-full lg:w-[240px] justify-center ${slide.accent === 'text-primary' ? 'bg-primary shadow-[0_0_30px_rgba(255,193,7,0.3)]' : slide.accent === 'text-blue-500' ? 'bg-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.3)]' : 'bg-green-500 shadow-[0_0_30px_rgba(34,197,94,0.3)]'}`}
                >
                  {slide.buttonText} <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </Link>
              </div>
            </div>
          </div>
        ))}

        {/* Carousel Indicators */}
        <div className="absolute bottom-6 lg:bottom-10 left-6 lg:left-8 z-20 flex gap-2 lg:gap-3">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              className={`h-[3px] lg:h-1 transition-all duration-500 ${i === currentSlide ? 'w-8 lg:w-12 bg-primary' : 'w-2 lg:w-4 bg-white/10 hover:bg-white/30'}`}
            />
          ))}
        </div>

        {/* Hero Metrics (Bottom Right) */}
        <div className="absolute bottom-12 right-12 hidden lg:flex gap-12 text-right z-20">
          <div>
            <span className="block text-[8px] font-bold text-white/30 uppercase tracking-[0.3em] mb-1">Status do QG</span>
            <span className="text-primary font-black text-xs tracking-widest uppercase italic animate-pulse">Operação Ativa</span>
          </div>
          <div>
            <span className="block text-[8px] font-bold text-white/30 uppercase tracking-[0.3em] mb-1">Coordenadas</span>
            <span className="text-primary font-black text-xs tracking-widest uppercase italic font-mono">[18.91° S, 48.28° W]</span>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 lg:px-8 w-full py-20 space-y-32">

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

            <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-4">
              <input 
                className="flex-1 bg-black/40 border border-white/10 p-4 text-xs font-bold text-white tracking-widest uppercase focus:border-primary transition-colors outline-none disabled:opacity-50" 
                placeholder={subscribeStatus === 'success' ? "ARSENAL CADASTRADO!" : "ENDEREÇO DE E-MAIL // [EMAIL]"}
                type="email"
                required
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                disabled={subscribeStatus === 'loading' || subscribeStatus === 'success'}
              />
              <button 
                type="submit"
                disabled={subscribeStatus === 'loading' || subscribeStatus === 'success'}
                className={`bg-primary text-black font-black px-12 py-4 uppercase tracking-[0.3em] text-[10px] hover:bg-white transition-all flex items-center justify-center gap-2 min-w-[180px] disabled:opacity-50`}
              >
                {subscribeStatus === 'loading' ? (
                  <span className="size-4 border-2 border-black/20 border-t-black rounded-full animate-spin"></span>
                ) : subscribeStatus === 'success' ? (
                  <>CONCLUÍDO <span className="material-symbols-outlined text-sm">check</span></>
                ) : (
                  'Assinar'
                )}
              </button>
            </form>
            
            {subscribeStatus === 'error' && (
              <p className="text-red-500 text-[10px] font-black uppercase tracking-widest animate-pulse">Falha na extração. Tente outro canal.</p>
            )}
          </div>
        </section>

        {/* Featured Footer - Just a subtle HUD decoration */}
        <div className="pt-20 opacity-10 flex flex-col items-center gap-1">
          <div className="w-[1px] h-12 bg-primary"></div>
          <span className="text-[8px] font-black tracking-[0.5em] text-white uppercase italic">End of Tactical View</span>
        </div>
      </div>
    </div>
    </>
  );
}
