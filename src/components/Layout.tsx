import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { usePricing } from '../context/PricingContext';
import { VirtualAgent } from './VirtualAgent';
import { CartDrawer } from './CartDrawer';

interface LayoutProps {
  children: React.ReactNode;
}

interface NavigationItem {
  label: string;
  href: string;
  icon: any;
  subcategories: { label: string; href: string }[];
  badge?: string;
}

export function Layout({ children }: LayoutProps) {
  const renderIcon = (icon: any, isDropdown = false) => {
    if (!icon) return null;
    if (typeof icon === 'string') {
      return <span className={`material-symbols-outlined ${isDropdown ? 'text-base opacity-70' : 'text-sm'}`}>{icon}</span>;
    }
    return icon;
  };

  const { itemCount, showToast } = useCart();
  const { user, signOut, isAdmin } = useAuth();
  const { getEffectiveRate } = usePricing();
  const navigate = useNavigate();

  const navigationMenu: NavigationItem[] = [
    {
      label: 'Marcas',
      href: '/marcas',
      icon: 'storefront',
      subcategories: []
    },
    {
      label: 'Eventos',
      href: '/eventos',
      icon: 'local_activity',
      subcategories: [],
      badge: 'new'
    },
    {
      label: 'Drop',
      href: '/drop',
      icon: 'military_tech',
      subcategories: [],
      badge: 'new'
    },
    {
      label: 'Create a Class',
      href: '/custom',
      icon: 'construction',
      subcategories: [],
      badge: 'new'
    },
    {
      label: 'Mapas',
      href: '/mapas',
      icon: 'map',
      subcategories: [],
      badge: 'new'
    },
    {
      label: 'Armaria',
      href: '/armaria',
      icon: 'settings',
      subcategories: [],
      badge: 'new'
    }
  ];

  const fullCategoryMenu: NavigationItem[] = [
    {
      label: 'Rifles',
      href: '/categoria/rifles',
      icon: 'military_tech',
      subcategories: [
        { label: 'AEG (Elétricas)', href: '/categoria/rifles?tipo=aeg' },
        { label: 'GBB (Gás)', href: '/categoria/rifles?tipo=gbb' },
        { label: 'HPA', href: '/categoria/rifles?tipo=hpa' }
      ]
    },
    {
      label: 'Pistolas',
      href: '/categoria/pistolas',
      icon: 'handyman',
      subcategories: [
        { label: 'GBB (Blowback)', href: '/categoria/pistolas?tipo=gbb' },
        { label: 'AEP (Elétricas)', href: '/categoria/pistolas?tipo=aep' },
        { label: 'CO2', href: '/categoria/pistolas?tipo=co2' }
      ]
    },
    {
      label: 'Snipers',
      href: '/categoria/snipers',
      icon: 'target',
      subcategories: []
    },
    {
      label: 'Acessórios',
      href: '/categoria/acessorios',
      icon: 'build',
      subcategories: []
    },
    {
      label: 'Equipamentos',
      href: '/categoria/equipamentos',
      icon: 'shield',
      subcategories: []
    },
    {
      label: 'BBs & Gas',
      href: '/categoria/bbs',
      icon: 'science',
      subcategories: []
    },
    {
      label: 'Peças',
      href: '/categoria/pecas',
      icon: 'settings',
      subcategories: []
    },
    {
      label: 'Promoções',
      href: '/promocoes',
      icon: 'local_offer',
      subcategories: []
    }
  ];
  const [searchQuery, setSearchQuery] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Click outside profile box
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };

    if (isProfileOpen) {
      document.addEventListener('click', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isProfileOpen]);

  useEffect(() => {
    const handleScroll = () => {
      const currentScroll = window.scrollY;
      setIsScrolled(prev => {
        // Hysteresis: Se tá em cima, precisa descer mais (100px) pra encolher.
        // Se já tá encolhido, precisa subir bastante (abaixo de 40px) pra expandir.
        if (!prev && currentScroll > 100) return true;
        if (prev && currentScroll < 40) return false;
        return prev;
      });
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) navigate(`/busca?q=${encodeURIComponent(searchQuery.trim())}`);
  };
  return (
    <div className="bg-background-dark font-display text-slate-100 min-h-screen selection:bg-primary selection:text-background-dark relative flex flex-col overflow-x-hidden">
      <div className="hud-scanline fixed inset-0 z-50 opacity-20 pointer-events-none"></div>

      <header className={`fixed top-0 left-0 right-0 z-[100] w-full border-b border-primary/20 bg-background-dark/95 backdrop-blur-md transition-all duration-500 ${isScrolled ? 'shadow-[0_10px_30px_rgba(0,0,0,0.8)]' : ''}`}>
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          {/* Top Info Bar - Hidden when scrolled or on mobile */}
          <div className={`flex justify-end pt-2 gap-4 sm:gap-6 text-[8px] font-black tracking-[0.2em] text-primary/40 uppercase transition-all duration-500 overflow-hidden ${isScrolled ? 'h-0 opacity-0 pt-0' : 'h-6 opacity-100 hidden md:flex'}`}>
            <div className="flex items-center gap-1">
              <span className="size-1 bg-primary rounded-full animate-pulse"></span>
              <span>DÓLAR OPERACIONAL: R$ {getEffectiveRate().toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="size-1 bg-green-500 rounded-full"></span>
              <span>MERCADO: ABERTO</span>
            </div>
          </div>

          <div className={`flex items-center justify-between gap-4 sm:gap-8 transition-all duration-500 ${isScrolled ? 'h-14 sm:h-16' : 'h-16 sm:h-24'}`}>
            {/* Logo */}
            <a href="/" className="flex items-center gap-2 sm:gap-3 group cursor-pointer flex-shrink-0">
              <div className={`flex items-center justify-center bg-primary text-black rounded-full shadow-[0_0_15px_rgba(255,193,7,0.4)] transition-all duration-500 ${isScrolled ? 'size-8 sm:size-10' : 'size-9 sm:size-12'}`}>
                <span className={`material-symbols-outlined font-black transition-all ${isScrolled ? 'text-lg sm:text-2xl' : 'text-xl sm:text-3xl'}`}>target</span>
              </div>
              <div className="flex flex-col">
                <h1 className={`font-black tracking-tighter leading-none text-white uppercase transition-all ${isScrolled ? 'text-xs sm:text-lg' : 'text-sm sm:text-2xl'}`}>
                  PERFECTION <span className="text-primary">AIRSOFT</span>
                </h1>
                {!isScrolled && <span className="text-[8px] sm:text-[10px] tracking-[0.3em] font-bold opacity-40 uppercase hidden sm:block italic">Performance Hub</span>}
              </div>
            </a>

            {/* Search - Hidden on mobile, shown on md+ */}
            <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-xl relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-primary/40">
                <span className="material-symbols-outlined text-xl">search</span>
              </div>
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="block w-full bg-surface/40 border border-primary/10 rounded-sm py-3 pl-12 pr-4 text-xs focus:bg-surface focus:border-primary/50 focus:ring-1 focus:ring-primary/30 placeholder-primary/20 text-white uppercase tracking-[0.2em] transition-all"
                placeholder="LOCALIZAR EQUIPAMENTO..."
                type="text"
              />
            </form>

            {/* Actions */}
            <div className="flex items-center gap-3 sm:gap-6 flex-shrink-0">
              {/* User Account */}
              <div className="relative group/profile" ref={profileRef}>
                {user ? (
                  <button 
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="flex flex-col items-center gap-1 group"
                  >
                    <span className="material-symbols-outlined text-white/40 group-hover:text-primary transition-colors text-xl sm:text-2xl">person</span>
                    <span className="text-[7px] font-black text-white/20 uppercase tracking-widest group-hover:text-primary transition-colors hidden lg:block">Operador</span>
                  </button>
                ) : (
                  <a href="/login" className="flex flex-col items-center gap-1 group">
                    <span className="material-symbols-outlined text-white/40 group-hover:text-primary transition-colors text-xl sm:text-2xl">person</span>
                    <span className="text-[7px] font-black text-white/20 uppercase tracking-widest group-hover:text-primary transition-colors hidden lg:block">Login</span>
                  </a>
                )}

                {/* Tactical Dropdown */}
                {user && (
                    <div className={`absolute top-full right-0 mt-4 w-48 bg-background-dark border border-primary/20 shadow-[0_10px_30px_rgba(0,0,0,0.8)] transition-all duration-300 z-[110] ${isProfileOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2'}`}>
                        <div className="p-4 border-b border-white/5 bg-primary/5">
                            <p className="text-[10px] text-white font-black uppercase truncate">
                                {user.user_metadata?.full_name || user.email?.split('@')[0]}
                            </p>
                            <p className="text-[8px] text-white/40 font-mono lowercase truncate mt-0.5">{user.email}</p>
                        </div>
                        <nav className="p-2">
                            <a 
                                href="/dashboard" 
                                onClick={() => setIsProfileOpen(false)}
                                className="flex items-center gap-3 px-4 py-3 text-[9px] font-black text-white/60 uppercase tracking-widest hover:bg-primary hover:text-background-dark transition-all rounded-sm"
                            >
                                <span className="material-symbols-outlined text-sm">account_circle</span>
                                Minha Conta
                            </a>


                            <button 
                                onClick={() => {
                                    signOut();
                                    setIsProfileOpen(false);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-3 text-[9px] font-black text-red-400/60 uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all rounded-sm"
                            >
                                <span className="material-symbols-outlined text-sm">logout</span>
                                Sair
                            </button>
                        </nav>
                        {/* HUD Decoration */}
                        <div className="absolute -top-1 right-4 w-2 h-2 bg-background-dark border-t border-l border-primary/20 rotate-45"></div>
                    </div>
                )}
              </div>

              {/* Admin Panel Link (Beside Operator) */}
              {isAdmin && (
                <a href="/admin" className="flex flex-col items-center gap-1 group">
                   <span className="material-symbols-outlined text-primary/60 group-hover:text-primary transition-colors text-xl sm:text-2xl">admin_panel_settings</span>
                   <span className="text-[7px] font-black text-primary/40 uppercase tracking-widest group-hover:text-primary transition-colors hidden lg:block">HQ Control</span>
                </a>
              )}

              {/* Favorites (Hidden on small screens) */}
              <a href="/favoritos" className="hidden xs:flex flex-col items-center gap-1 group">
                <span className="material-symbols-outlined text-white/40 group-hover:text-primary transition-colors text-xl sm:text-2xl">military_tech</span>
                <span className="text-[7px] font-black text-white/20 uppercase tracking-widest group-hover:text-primary transition-colors hidden lg:block">Farovitos</span>
              </a>

              {/* Cart Button */}
              <div className="relative">
                <a href="/carrinho" className={`bg-primary text-black rounded-sm font-black tracking-widest uppercase flex items-center gap-2 sm:gap-3 hover:bg-white transition-all shadow-[0_0_20px_rgba(255,193,7,0.2)] ${isScrolled ? 'px-3 sm:px-4 py-1.5 sm:py-2 text-[8px] sm:text-[10px]' : 'px-4 sm:px-6 py-2 sm:py-3 text-[9px] sm:text-xs'}`}>
                  <span className="relative">
                    <span className={`material-symbols-outlined transition-all ${isScrolled ? 'text-lg sm:text-xl' : 'text-xl sm:text-2xl'}`}>shopping_cart</span>
                    {itemCount > 0 && (
                      <span className="absolute -top-2 -right-2 bg-black text-primary text-[9px] font-black min-w-[16px] h-4 flex items-center justify-center rounded-full px-1 leading-none border border-primary/40">
                        {itemCount}
                      </span>
                    )}
                  </span>
                  <span className="hidden sm:inline">Carrinho</span>
                </a>

                {/* Visual Feedback Toast */}
                <div className={`absolute top-full right-0 mt-2 bg-primary text-black px-4 py-1.5 shadow-[0_10px_30px_rgba(255,193,7,0.5)] rounded-full transition-all duration-300 z-50 flex items-center gap-2 whitespace-nowrap border border-black/10 sm:mt-3 ${showToast ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-2 scale-95 pointer-events-none'}`}>
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest">Arsenal Atualizado</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Categories Nav - Scrollable Row on Mobile */}
        <nav className={`border-t border-white/5 bg-background-dark relative transition-all duration-500 ${isScrolled ? 'h-10 sm:h-12 border-b border-primary/10' : ''}`}>
          <div className="max-w-7xl mx-auto px-4 lg:px-8 flex items-stretch h-full overflow-hidden">

            {/* Toda Loja Button - Now triggers state for Mobile */}
            <div className="relative group shrink-0">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className={`flex items-center gap-2 sm:gap-3 bg-primary text-black font-black uppercase tracking-widest cursor-pointer hover:bg-white transition-all h-full ${isScrolled ? 'px-3 sm:px-4 text-[8px] sm:text-[9px]' : 'px-4 sm:px-6 py-4 text-[9px] sm:text-xs'}`}>
                <span className="material-symbols-outlined text-base sm:text-lg">menu</span>
                <span className="hidden sm:inline">Toda Loja</span>
              </button>

              {/* Desktop Hover Dropdown */}
              <div className="hidden sm:block absolute top-full left-0 w-[240px] sm:w-[280px] bg-[#1a1a15] border border-white/5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50">
                <ul className="py-2 flex flex-col">
                  {fullCategoryMenu.map(cat => (
                    <li key={cat.label} className="border-b border-white/5 last:border-0 relative group/item">
                      <a href={cat.href} className="flex items-center justify-between px-6 py-4 text-[10px] text-white/70 font-bold uppercase tracking-widest hover:text-black hover:bg-primary transition-colors">
                        <div className="flex items-center gap-3">
                          {renderIcon(cat.icon, true)}
                          {cat.label}
                          {cat.badge === 'new' && (
                            <span className="size-1.5 rounded-full bg-primary animate-pulse ml-2 shadow-[0_0_8px_rgba(255,193,7,0.5)]"></span>
                          )}
                        </div>
                        {cat.subcategories.length > 0 && <span className="material-symbols-outlined text-sm opacity-50 group-hover/item:opacity-100 transition-opacity">chevron_right</span>}
                      </a>
                      {cat.subcategories.length > 0 && (
                        <div className="absolute top-0 left-full w-[200px] sm:w-[240px] bg-[#1a1a15] border border-white/5 opacity-0 invisible group-hover/item:opacity-100 group-hover/item:visible transition-all duration-300 shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50">
                          <ul className="py-2 flex flex-col">
                            {cat.subcategories.map(sub => (
                              <li key={sub.label} className="border-b border-white/5 last:border-0">
                                <a href={sub.href} className="flex items-center px-6 py-4 text-[10px] text-white/70 font-bold uppercase tracking-widest hover:text-black hover:bg-primary transition-colors">
                                  {sub.label}
                                </a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </li>
                  ))}
                  <li className="relative group/item mt-2 border-t border-white/5 bg-white/5">
                    <a href="/promocoes" className="flex items-center justify-between px-6 py-4 text-[10px] text-primary font-black uppercase tracking-widest hover:text-black hover:bg-primary transition-colors">
                      Ver Promoções
                      <span className="material-symbols-outlined text-sm opacity-0 group-hover/item:opacity-100 transition-opacity">chevron_right</span>
                    </a>
                  </li>
                </ul>
              </div>
            </div>

            {/* Horizontal Links - Handling overflow with mobile scroll */}
            <div className="flex-1 flex items-center justify-start sm:justify-center overflow-hidden">
              <ul className={`flex items-center gap-6 sm:gap-10 px-4 sm:px-8 font-bold tracking-[0.2em] uppercase whitespace-nowrap h-full overflow-x-auto no-scrollbar ${isScrolled ? 'text-[8px] sm:text-[9px]' : 'text-[9px] sm:text-[10px]'}`}>
                <li>
                  <a href="/" className={`text-primary hover:text-white transition-colors border-b-2 border-primary ${isScrolled ? 'py-2' : 'py-4'}`}>
                    Home
                  </a>
                </li>

                {navigationMenu.map(cat => (
                  <li key={cat.label} className="relative group/nav flex-shrink-0">
                    <a href={cat.href} className={`text-white/50 hover:text-primary transition-colors flex items-center gap-1.5 border-b-2 border-transparent hover:border-primary ${isScrolled ? 'py-2' : 'py-4'}`}>
                      {cat.label}
                      {cat.badge === 'new' && (
                        <span className="size-1.5 rounded-full bg-primary animate-pulse ml-1.5 shadow-[0_0_8px_rgba(255,193,7,0.5)]"></span>
                      )}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </nav>
      </header>

      {/* Mobile Menu Sidebar Overlay */}
      <div className={`fixed inset-0 z-[200] transition-all duration-300 flex justify-end ${isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
        <div className={`relative w-[280px] bg-background-dark h-full shadow-[0_0_50px_rgba(0,0,0,0.8)] border-l border-primary/20 transition-transform duration-300 flex flex-col ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <h2 className="text-xs font-black tracking-widest text-primary uppercase">Categorias Táticas</h2>
            <button onClick={() => setIsMobileMenuOpen(false)} className="text-white/40 hover:text-white">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto py-4">
            <ul className="flex flex-col">
              <li>
                <Link to="/" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-4 px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white hover:bg-primary hover:text-black transition-all">
                  <span className="material-symbols-outlined text-lg">home</span>
                  Painel Principal
                </Link>
              </li>

              {navigationMenu.map(cat => (
                <li key={cat.label} className="border-t border-white/5">
                  <Link to={cat.href} onClick={() => setIsMobileMenuOpen(false)} className="flex items-center justify-between px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-white/70 hover:bg-primary/10 hover:text-primary transition-all">
                    <div className="flex items-center gap-4">
                      {renderIcon(cat.icon, true)}
                      {cat.label}
                    </div>
                    {cat.badge === 'new' && (
                      <span className="size-1.5 rounded-full bg-primary animate-pulse ml-2 shadow-[0_0_8px_rgba(255,193,7,0.5)]"></span>
                    )}
                    <span className="material-symbols-outlined text-sm opacity-30">chevron_right</span>
                  </Link>
                </li>
              ))}

              <li className="px-6 py-2 text-[8px] font-black uppercase tracking-[0.2em] text-primary/30 border-t border-white/5 bg-white/5">Categorias de Arsenal</li>

              {fullCategoryMenu.map(cat => (
                <li key={cat.label} className="border-t border-white/5">
                  <Link to={cat.href} onClick={() => setIsMobileMenuOpen(false)} className="flex items-center justify-between px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-white/70 hover:bg-primary/10 hover:text-primary transition-all">
                    <div className="flex items-center gap-4">
                      {renderIcon(cat.icon, true)}
                      {cat.label}
                    </div>
                    {cat.badge === 'new' && (
                      <span className="size-1.5 rounded-full bg-primary animate-pulse ml-2 shadow-[0_0_8px_rgba(255,193,7,0.5)]"></span>
                    )}
                    <span className="material-symbols-outlined text-sm opacity-30">chevron_right</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="p-6 bg-surface/30 border-t border-white/5">
            <Link to="/perfil" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 text-[9px] font-black uppercase tracking-widest text-primary mb-4 italic">
              <span className="material-symbols-outlined text-lg">account_circle</span>
              Status do Operador
            </Link>
          </div>
        </div>
      </div>

      <main className="flex-1 w-full flex flex-col pt-32 sm:pt-48">
        <div className="w-full max-w-7xl mx-auto px-4 lg:px-8 flex-1 flex flex-col">
          {children}
        </div>
      </main>

      <footer className="bg-background-dark border-t border-white/5 mt-auto pb-8">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-16">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-12">
            <div className="col-span-2 lg:col-span-1 space-y-6">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary text-3xl">target</span>
                <h2 className="text-xl font-black tracking-tighter text-white uppercase italic">PERFECTION <span className="text-primary">AIRSOFT</span></h2>
              </div>
              <p className="text-[11px] text-white/40 leading-relaxed uppercase tracking-widest max-w-xs italic">
                A maior autoridade em airsoft da América Latina. Desenvolvido para você.
              </p>
              <div className="flex gap-4">
                <span className="material-symbols-outlined text-white/30 hover:text-primary cursor-pointer transition-colors">language</span>
                <span className="material-symbols-outlined text-white/30 hover:text-primary cursor-pointer transition-colors">share</span>
                <span className="material-symbols-outlined text-white/30 hover:text-primary cursor-pointer transition-colors">smart_display</span>
              </div>
            </div>

            <div className="col-span-1">
              <h3 className="text-xs font-bold tracking-[0.3em] text-white uppercase mb-6">Gear Hub</h3>
              <ul className="space-y-4">
                <li><Link to="/marcas" className="text-[10px] text-white/50 hover:text-white uppercase tracking-widest transition-colors font-bold">Marcas</Link></li>
                <li><Link to="/mapas" className="text-[10px] text-white/50 hover:text-white uppercase tracking-widest transition-colors font-bold flex items-center gap-2">Mapas de Treinamento</Link></li>
                <li><Link to="/drop" className="text-[10px] text-primary/80 hover:text-primary uppercase tracking-widest transition-colors font-bold flex items-center gap-2"><span className="size-1.5 rounded-full bg-primary animate-pulse"></span>Drop</Link></li>
                <li><Link to="/eventos" className="text-[10px] text-white/50 hover:text-white uppercase tracking-widest transition-colors font-bold flex items-center gap-2">Eventos & Missões</Link></li>
              </ul>
            </div>

            <div className="col-span-1">
              <h3 className="text-xs font-bold tracking-[0.3em] text-white uppercase mb-6">Suporte HQ</h3>
              <ul className="space-y-4">
                <li><Link to="/contato" className="text-[10px] text-white/50 hover:text-white uppercase tracking-widest transition-colors font-bold">SAC / Rádio</Link></li>
                <li><Link to="/faq" className="text-[10px] text-white/50 hover:text-white uppercase tracking-widest transition-colors font-bold">Central de Ajuda</Link></li>
                <li><Link to="/termos" className="text-[10px] text-white/50 hover:text-white uppercase tracking-widest transition-colors font-bold">Termos de Uso</Link></li>
                {isAdmin && (
                  <li><Link to="/organizador" className="text-[10px] text-primary/60 hover:text-primary uppercase tracking-widest transition-colors font-bold border-t border-white/5 pt-4 block">Painel do Organizador</Link></li>
                )}
              </ul>
            </div>

            <div className="col-span-2 lg:col-span-1">
              <h3 className="text-xs font-bold tracking-[0.3em] text-white uppercase mb-6">Quartel General</h3>
              <div className="bg-surface border border-white/5 p-4 space-y-4">
                <div className="flex gap-3">
                  <span className="material-symbols-outlined text-primary text-xl">location_on</span>
                  <p className="text-[10px] text-white/60 tracking-widest leading-relaxed uppercase">Rua Durvalino Jose Ferreira 715 - Minas Gerais Brasil</p>
                </div>
                <div className="flex gap-3">
                  <span className="material-symbols-outlined text-primary text-xl">call</span>
                  <p className="text-[10px] text-white/60 tracking-widest leading-relaxed uppercase">+55 (37) 991065120</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-20 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-[9px] text-white/20 tracking-[0.3em] uppercase italic">© 2024 perfection airsoft // airsoft performance hub. [V2.3.0] all rights reserved.</p>
            <div className="flex gap-8 text-[9px] text-white/20 tracking-widest font-bold uppercase">
              <span className="hover:text-white cursor-pointer transition-colors">Privacy Protocol</span>
              <span className="hover:text-white cursor-pointer transition-colors">Security Clearance</span>
              <span className="hover:text-white cursor-pointer transition-colors">Cookie Policy</span>
            </div>
          </div>
        </div>
      </footer>
      <VirtualAgent />
      <CartDrawer />
    </div>
  );
}
