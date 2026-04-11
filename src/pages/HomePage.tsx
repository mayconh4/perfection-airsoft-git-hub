import { useState, useEffect, useRef } from 'react';
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

export function HomePage() {
  const { products, loading } = useProducts();
  const { addItem } = useCart();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [subscribeStatus, setSubscribeStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [isHovered, setIsHovered] = useState(false);
  const bannerRef = useRef<HTMLDivElement>(null);

  const slides = [
    {
      id: 'drop',
      subtitle: "COMUNIDADE TÁTICA",
      title: "SOLICITE SEU <br /><span className='text-blue-500'>DROP EXCLUSIVO</span>",
      description: "Equipamentos de elite e drops limitados para quem domina o jogo.",
      buttonText: "Solicitar Drop",
      link: "/drop/criar",
      image: "/assets/drop-banner.png",
      accent: "text-blue-500",
      accentBg: "bg-blue-500",
      shadow: "shadow-[0_0_40px_rgba(59,130,246,0.4)]"
    },
    {
      id: 'field',
      subtitle: "COORDENADAS ATIVAS",
      title: "CADASTRE SEU <br /><span className='text-green-500'>CAMPO DE BATALHA</span>",
      description: "Conecte seu campo à maior rede de operadores do país.",
      buttonText: "Cadastrar Campo",
      link: "/eventos",
      image: "/images/field-banner.jpg",
      accent: "text-green-500",
      accentBg: "bg-green-500",
      shadow: "shadow-[0_0_40px_rgba(34,197,94,0.4)]"
    },
    {
      id: 'mission',
      subtitle: "OPERAÇÕES ESPECIAIS",
      title: "CRIE SUA PRÓPRIA <br /><span className='text-orange-500'>MISSÃO TÁTICA</span>",
      description: "Organize eventos, defina o briefing e lidere sua equipe.",
      buttonText: "Criar Missão",
      link: "/eventos",
      image: "/images/mission-banner.jpg",
      accent: "text-orange-500",
      accentBg: "bg-orange-500",
      shadow: "shadow-[0_0_40px_rgba(249,115,22,0.4)]"
    },
    {
      id: 'maintenance',
      subtitle: "SUPORTE TÉCNICO",
      title: "MANUTEÇÃO DE <br /><span className='text-slate-400'>ALTA PERFORMANCE</span>",
      description: "Sua AEG ou GBB sempre pronta para o combate.",
      buttonText: "Solicitar Manutenção",
      link: "/contato",
      image: "/images/maintenance-banner.jpg",
      accent: "text-slate-400",
      accentBg: "bg-slate-400",
      shadow: "shadow-[0_0_40px_rgba(148,163,184,0.4)]"
    },
    {
      id: 'shop',
      subtitle: "ARSENAL DISPONÍVEL",
      title: "EXPLORE O <br /><span className='text-primary'>TACTICAL SHOP</span>",
      description: "Os melhores equipamentos para elevar seu nível operacional.",
      buttonText: "Acessar Loja",
      link: "/produtos",
      image: "https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=2070&auto=format&fit=crop",
      accent: "text-primary",
      accentBg: "bg-primary",
      shadow: "shadow-[0_0_40px_rgba(255,193,7,0.4)]"
    }
  ];

  // Autoplay Effect (3s)
  useEffect(() => {
    if (isHovered) return;
    const timer = setInterval(() => {
      const nextSlide = (currentSlide + 1) % slides.length;
      scrollToSlide(nextSlide);
    }, 3000);
    return () => clearInterval(timer);
  }, [currentSlide, isHovered]);

  const scrollToSlide = (index: number) => {
    if (bannerRef.current) {
      bannerRef.current.style.scrollBehavior = 'smooth';
      bannerRef.current.scrollTo({
        left: index * bannerRef.current.clientWidth
      });
      setCurrentSlide(index);
    }
  };

  const nextSlide = () => {
    const next = (currentSlide + 1) % slides.length;
    scrollToSlide(next);
  };

  const prevSlide = () => {
    const prev = (currentSlide - 1 + slides.length) % slides.length;
    scrollToSlide(prev);
  };

  const handleScroll = () => {
    if (bannerRef.current) {
      const scrollLeft = bannerRef.current.scrollLeft;
      const index = Math.round(scrollLeft / bannerRef.current.clientWidth);
      if (index !== currentSlide) {
        setCurrentSlide(index);
      }
    }
  };

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

  const featured = products.slice(0, 4);

  return (
    <>
      <SEO image="https://www.perfectionairsoft.com.br/og-image.png" />
      <div className="flex flex-col w-full overflow-x-hidden text-center items-center">
        
        {/* Banner Hero */}
        <section 
          className="relative h-[480px] lg:h-[580px] w-full bg-background-dark overflow-hidden group border-b border-white/5"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Main Scroll Container */}
          <div 
            ref={bannerRef}
            onScroll={handleScroll}
            className="flex h-full w-full overflow-x-auto snap-x snap-mandatory scrollbar-none scroll-smooth"
            style={{ 
              msOverflowStyle: 'none', 
              scrollbarWidth: 'none',
              WebkitOverflowScrolling: 'touch'
            }}
          >
            {slides.map((slide) => (
              <div 
                key={slide.id}
                className="relative min-w-full w-full h-full snap-start shrink-0 flex flex-col items-center justify-center text-center px-4"
              >
                {/* Background Image */}
                <div className="absolute inset-0 z-0 flex items-center justify-center overflow-hidden">
                  <img 
                    src={slide.image} 
                    alt={slide.subtitle} 
                    className="w-full h-full object-cover object-center opacity-40 lg:opacity-60 transition-transform duration-[20s] scale-105 group-hover:scale-110" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-background-dark/80 via-transparent to-background-dark"></div>
                </div>

                {/* Main Content Container */}
                <div className="relative z-10 w-full max-w-5xl mx-auto flex flex-col items-center lg:mt-[-80px] space-y-5 lg:space-y-6">
                  
                  {/* Badge Row */}
                  <div className="flex items-center justify-center w-full gap-3 lg:gap-4">
                    <div className={`h-[1px] w-6 lg:w-16 ${slide.accentBg} opacity-50`}></div>
                    <span className={`font-black tracking-[0.3em] lg:tracking-[0.6em] text-[8px] lg:text-[10px] uppercase ${slide.accent}`}>{slide.subtitle}</span>
                    <div className={`h-[1px] w-6 lg:w-16 ${slide.accentBg} opacity-50`}></div>
                  </div>
                  
                  {/* Headline */}
                  <h1 
                    className="w-full text-center text-3xl sm:text-5xl lg:text-7xl font-black text-white leading-[1.1] tracking-tighter uppercase italic drop-shadow-2xl"
                    style={{ textShadow: '0 0 30px rgba(0,0,0,0.7)' }}
                    dangerouslySetInnerHTML={{ __html: slide.title }}
                  />
                  
                  {/* Narrative Text */}
                  <p className="w-full text-center text-white/50 lg:text-white/40 text-[10px] lg:text-sm leading-relaxed uppercase tracking-[0.1em] font-medium max-w-2xl italic px-4">
                    {slide.description}
                  </p>

                  {/* Action Button */}
                  <div className="pt-4 lg:pt-6 w-full flex justify-center">
                    <Link 
                      to={slide.link}
                      className={`text-black font-black py-4 lg:py-5 px-12 lg:px-20 uppercase tracking-[0.15em] lg:tracking-widest text-[10px] lg:text-sm hover:bg-white transition-all transform hover:scale-105 flex items-center justify-center gap-3 ${slide.accentBg} ${slide.shadow} mx-auto`}
                    >
                      {slide.buttonText} <span className="material-symbols-outlined text-sm lg:text-xl font-bold">arrow_forward</span>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Navigation Arrows */}
          <div className="hidden lg:flex absolute inset-x-8 top-1/2 -translate-y-1/2 justify-between z-30 pointer-events-none">
            <button 
              onClick={prevSlide}
              className="size-14 bg-black/40 hover:bg-primary hover:text-black border border-white/10 text-white rounded-full flex items-center justify-center transition-all pointer-events-auto backdrop-blur-md"
            >
              <span className="material-symbols-outlined text-3xl">chevron_left</span>
            </button>
            <button 
              onClick={nextSlide}
              className="size-14 bg-black/40 hover:bg-primary hover:text-black border border-white/10 text-white rounded-full flex items-center justify-center transition-all pointer-events-auto backdrop-blur-md"
            >
              <span className="material-symbols-outlined text-3xl">chevron_right</span>
            </button>
          </div>

          {/* Navigation Dots */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 flex gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => scrollToSlide(i)}
                className={`h-[2px] transition-all duration-500 ${i === currentSlide ? 'w-10 lg:w-20 bg-primary' : 'w-3 lg:w-4 bg-white/20 hover:bg-white'}`}
              />
            ))}
          </div>
        </section>

        {/* Global Page Content */}
        <div className="w-full max-w-7xl mx-auto px-4 lg:px-8 py-10 lg:py-20 space-y-20 lg:space-y-40 flex flex-col items-center">
          
          {/* Featured Operations Section - Mobile 2 Items Grid */}
          <section className="flex flex-col items-center w-full">
            <div className="text-center space-y-2 mb-12">
              <span className="text-[9px] lg:text-[10px] font-black tracking-[0.5em] text-primary uppercase">Arsenal de Operações</span>
              <h2 className="text-3xl lg:text-5xl font-black text-white tracking-tighter uppercase italic drop-shadow-xl">Recomendações da Semana</h2>
              <div className="h-[2px] w-20 bg-primary/30 mx-auto mt-4"></div>
            </div>

            {loading ? (
              <div className="py-20 flex flex-col items-center gap-5 opacity-20 text-center">
                <div className="w-14 h-[1px] bg-primary animate-pulse"></div>
                <span className="text-[9px] font-black tracking-[0.4em] text-white uppercase italic">Sincronizando Arsenal...</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6 w-full">
                {featured.map(p => (
                  <div key={p.id} className="group bg-surface/20 border border-white/5 hover:border-primary/40 transition-all flex flex-col items-center text-center relative overflow-hidden">
                    <Link to={`/produto/${p.slug || p.id}`} className="w-full">
                      <ProductImageSlider 
                        mainImage={p.image_url}
                        images={p.images}
                        alt={p.name}
                        wrapperClassName="relative aspect-square bg-white flex items-center justify-center p-3 lg:p-4 overflow-hidden"
                        imgClassName="w-full h-full object-contain"
                      >
                        <div className="absolute top-0 left-0 bg-primary text-black text-[7px] lg:text-[9px] font-black px-2 lg:px-4 py-1.5 lg:py-2 uppercase z-20 -skew-x-12 -translate-x-1">Drop</div>
                      </ProductImageSlider>
                    </Link>

                    <div className="p-3 lg:p-6 space-y-2 lg:space-y-4 w-full flex flex-col items-center">
                      <div className="space-y-1">
                        <span className="text-[8px] lg:text-[9px] font-black text-primary tracking-[0.2em] uppercase">{p.brand}</span>
                        <Link to={`/produto/${p.slug || p.id}`}>
                          <h4 className="text-[10px] lg:text-lg font-black text-white hover:text-primary transition-colors leading-tight uppercase italic line-clamp-2 min-h-[2.5em]">{shortName(p.name, 4)}</h4>
                        </Link>
                      </div>

                      <div className="flex flex-col lg:flex-row items-center justify-center gap-1 lg:gap-3">
                        <span className="text-sm lg:text-2xl font-black text-white tracking-tighter italic">{formatPrice(p.price)}</span>
                        <span className="text-[8px] lg:text-[10px] font-bold text-white/20 line-through uppercase">{formatPrice(p.price * 1.3)}</span>
                      </div>

                      <button onClick={() => addItem(p.id)}
                              className="w-full bg-primary text-black font-black py-3 lg:py-4 uppercase tracking-[0.1em] lg:tracking-[0.2em] text-[8px] lg:text-[10px] italic transition-all hover:bg-white truncate px-1">
                        Adicionar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="mt-12 flex justify-center">
              <Link to="/produtos" className="group text-[10px] font-black text-white/30 hover:text-primary tracking-[0.5em] uppercase transition-all flex items-center gap-3">
                Ver Arsenal Completo <span className="material-symbols-outlined text-sm group-hover:translate-x-2 transition-transform">arrow_forward</span>
              </Link>
            </div>
          </section>

          {/* Newsletter Compact Strip */}
          <section className="bg-surface/30 border border-white/5 py-10 lg:py-12 px-6 lg:px-20 relative overflow-hidden flex flex-col items-center text-center w-full">
            <div className="max-w-4xl w-full relative z-10 space-y-6 lg:space-y-8 flex flex-col items-center">
              <div className="space-y-3 lg:space-y-4">
                <span className="text-[10px] font-black text-primary tracking-[0.5em] uppercase">Rede Operacional</span>
                <h2 className="text-3xl lg:text-5xl font-black text-white uppercase italic tracking-tighter">Inteligência Estratégica</h2>
                <p className="text-white/40 text-[10px] lg:text-xs tracking-[0.2em] uppercase leading-relaxed max-w-xl mx-auto italic">Cadastre-se para receber alertas de drops territoriais e missões especiais.</p>
              </div>

              <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-4 w-full items-center max-w-2xl px-4 lg:px-0">
                <input 
                  className="w-full sm:flex-1 bg-black/50 border border-white/10 p-4 text-xs font-bold text-white tracking-widest uppercase focus:border-primary transition-colors outline-none text-center lg:text-left" 
                  placeholder={subscribeStatus === 'success' ? "ACESSO CONCEDIDO!" : "SEU E-MAIL // ELITE-NET"}
                  type="email"
                  required
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  disabled={subscribeStatus === 'loading' || subscribeStatus === 'success'}
                />
                <button 
                  type="submit"
                  disabled={subscribeStatus === 'loading' || subscribeStatus === 'success'}
                  className="bg-primary text-black font-black px-10 py-4 uppercase tracking-[0.2em] text-[10px] hover:bg-white transition-all flex items-center justify-center gap-2 disabled:opacity-50 min-w-[160px] w-full sm:w-auto"
                >
                  {subscribeStatus === 'loading' ? (
                    <span className="size-4 border-2 border-black/20 border-t-black rounded-full animate-spin"></span>
                  ) : subscribeStatus === 'success' ? (
                    <>CONFIRMADO <span className="material-symbols-outlined text-sm">check</span></>
                  ) : (
                    'Sincronizar'
                  )}
                </button>
              </form>
            </div>
          </section>

          {/* Page Marker */}
          <div className="flex flex-col items-center gap-5 opacity-10 pb-16">
            <div className="w-[1px] h-16 bg-primary"></div>
            <span className="text-[8px] font-black tracking-[0.5em] text-white uppercase italic">Section Complete // Tactical Overlook</span>
          </div>
        </div>
      </div>
    </>
  );
}
