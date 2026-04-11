import { useState, useMemo, useEffect, Suspense, lazy } from 'react';
import { Link } from 'react-router-dom';
import { useProducts } from '../hooks/useProducts';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { formatPrice } from '../types/database';
import { SEO } from '../components/SEO';

const WeaponViewer3D = lazy(() => import('../components/three/WeaponViewer3D'));

type ViewMode = 'initial' | 'armaria' | 'camo' | 'killstrike';
type WeaponType = 'assault' | 'smg' | 'lmg' | 'sniper' | 'shotgun' | 'escudo' | 'pistola' | 'granada' | 'bazuca' | 'faca' | null;
type SlotType = 'base' | 'secondary' | 'optic' | 'muzzle' | 'underbarrel' | 'magazine' | 'stock' | 'laser';

interface LoadoutState {
  base: any | null;
  secondary: any | null;
  optic: any | null;
  muzzle: any | null;
  underbarrel: any | null;
  magazine: any | null;
  stock: any | null;
  laser: any | null;
}

const PRIMARY_TYPES = [
  { id: 'assault', label: 'Assault', icon: 'military_tech' },
  { id: 'smg', label: 'SMG', icon: 'speed' },
  { id: 'lmg', label: 'LMG', icon: 'dynamic_feed' },
  { id: 'sniper', label: 'Sniper', icon: 'target' },
  { id: 'shotgun', label: 'Shotgun', icon: 'scatter_plot' },
];

const SECONDARY_TYPES = [
  { id: 'pistola', label: 'Pistolas', icon: 'precision_manufacturing' },
  { id: 'granada', label: 'Lançadores', icon: 'bomb' },
  { id: 'bazuca', label: 'Bazucas', icon: 'rocket_launch' },
  { id: 'faca', label: 'Facas', icon: 'knife' },
];

const ATTACHMENT_SLOTS: { id: SlotType; label: string; icon: string; categorySlug: string }[] = [
  { id: 'optic', label: 'Mira', icon: 'visibility', categorySlug: 'miras' },
  { id: 'muzzle', label: 'Ponta', icon: 'settings_input_component', categorySlug: 'acessorios' },
  { id: 'underbarrel', label: 'Front', icon: 'front_hand', categorySlug: 'acessorios' },
  { id: 'magazine', label: 'Mag', icon: 'view_headline', categorySlug: 'acessorios' },
  { id: 'stock', label: 'Stock', icon: 'horizontal_rule', categorySlug: 'acessorios' },
  { id: 'laser', label: 'Aux', icon: 'flashlight_on', categorySlug: 'acessorios' },
];

export function CreateClassPage() {
  const { user, loading: authLoading } = useAuth();
  const { products: allProducts, loading: loadingProducts } = useProducts();
  const { addItem } = useCart();
  
  const [viewMode, setViewMode] = useState<ViewMode>('initial');
  const [selectedType, setSelectedType] = useState<WeaponType>(null);
  const [activeSlot, setActiveSlot] = useState<SlotType>('base');
  const [isTransitioning, setIsTransitioning] = useState(false);

  const isAdmin = user?.email === 'admin@perfectionairsoft.com.br';

  // PROTEÇÃO TÁTICA: Status de Autenticação
  useEffect(() => {
    if (user && !isAdmin && viewMode !== 'initial') {
       // Operação restrita detectada
    }
  }, [user, isAdmin, viewMode]);

  // Inicializar com Assault selecionado por padrão se abrir a armaria
  useEffect(() => {
    if (viewMode === 'armaria' && !selectedType) {
      setSelectedType('assault');
      setActiveSlot('base');
    }
  }, [viewMode]);

  const [loadout, setLoadout] = useState<LoadoutState>(() => {
    const saved = localStorage.getItem('tactical_loadout_v3');
    return saved ? JSON.parse(saved) : {
      base: null, secondary: null, optic: null, muzzle: null, underbarrel: null, magazine: null, stock: null, laser: null,
    };
  });


  useEffect(() => {
    localStorage.setItem('tactical_loadout_v3', JSON.stringify(loadout));
  }, [loadout]);

  const changeView = (mode: ViewMode) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setViewMode(mode);
      setIsTransitioning(false);
    }, 400);
  };

  const currentProducts = useMemo(() => {
    if (!selectedType) return [];
    
    // Se for um slot de acessório, usar lógica diferente
    if (activeSlot !== 'base' && activeSlot !== 'secondary') {
      const slotDef = ATTACHMENT_SLOTS.find(s => s.id === activeSlot);
      if (!slotDef) return [];
      let filtered = allProducts.filter(p => (p.category as any)?.slug === slotDef.categorySlug || (p.category as any)?.slug === 'acessorios');
      if (loadout.base?.system) {
        filtered = filtered.filter(p => !p.system || p.system.toLowerCase() === loadout.base.system.toLowerCase());
      }
      return filtered;
    }

    // Listagem de Armas
    return allProducts.filter(p => {
      const catLabel = (p.category as any)?.label?.toLowerCase() || '';
      const catSlug = (p.category as any)?.slug?.toLowerCase() || '';
      const typeMatches: Record<string, string[]> = {
        'assault': ['assault', 'assalto', 'rifle'],
        'smg': ['smg', 'submetralhadora'],
        'lmg': ['lmg', 'suporte'],
        'sniper': ['sniper', 'precisao', 'dmr'],
        'shotgun': ['shotgun', 'escopeta', 'doze'],
        'escudo': ['escudo', 'shield'],
        'pistola': ['pistola', 'handgun', 'gbb', 'sidearm'],
        'granada': ['granada', 'launcher', 'lanca'],
        'bazuca': ['bazuca', 'rocket', 'at4'],
        'faca': ['faca', 'knife', 'meele']
      };
      const keywords = typeMatches[selectedType as string] || [];
      return keywords.some(k => catLabel.includes(k) || catSlug.includes(k));
    });
  }, [selectedType, activeSlot, allProducts, loadout.base]);

  const handleSelectItem = (product: any) => {
    if (activeSlot === 'base' || activeSlot === 'secondary') {
        // Se trocar base, resetar acessórios se o sistema for diferente
        if (activeSlot === 'base' && loadout.base?.system !== product.system) {
            setLoadout({
                base: product,
                secondary: loadout.secondary,
                optic: null, muzzle: null, underbarrel: null, magazine: null, stock: null, laser: null
            });
        } else {
            setLoadout(prev => ({ ...prev, [activeSlot]: product }));
        }
    } else {
        setLoadout(prev => ({ ...prev, [activeSlot]: product }));
    }
  };

  const totalPrice = useMemo(() => {
    return Object.values(loadout).reduce((acc, curr) => acc + (curr?.price || 0), 0);
  }, [loadout]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
         <div className="size-12 border-2 border-primary border-t-transparent animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-10 overflow-hidden relative">
        <SEO title="Acesso Negado | Tactical Ops" />
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1541888941255-2761956e20dd?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-5 grayscale"></div>
        
        <div className="max-w-3xl w-full relative z-10">
          <div className="bg-primary/5 border border-primary/20 p-12 flex flex-col items-center text-center gap-8 relative overflow-hidden group">
            {/* Linha de scan tático */}
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent shadow-[0_0_15px_rgba(255,193,7,0.5)] animate-pulse"></div>
            
            <div className="size-24 bg-primary/10 rounded-full flex items-center justify-center border border-primary/20 mb-2">
              <span className="material-symbols-outlined text-primary text-6xl animate-pulse">shield_person</span>
            </div>

            <div>
              <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase mb-4">IDENTIDADE NÃO VERIFICADA</h1>
              <p className="text-slate-500 text-xs font-mono uppercase tracking-[0.3em] max-w-md mx-auto leading-relaxed">
                PARA ACESSAR O ARSENAL DE ELITE E O PROTOCOLO GUNSMITH, VOCÊ PRECISA ESTAR NO SISTEMA.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
              <Link 
                to="/login?redirect=/criar-classe"
                className="bg-primary text-background-dark font-black py-5 px-12 text-[11px] uppercase tracking-[0.3em] hover:bg-white transition-all shadow-[0_0_30px_rgba(255,193,7,0.2)] hover:scale-105 active:scale-95"
              >
                REGISTRE-SE PARA COMANDAR
              </Link>
              <Link 
                to="/"
                className="bg-white/5 border border-white/10 text-white font-black py-5 px-12 text-[11px] uppercase tracking-[0.3em] hover:bg-white/10 transition-all"
              >
                ABORTAR MISSÃO
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-10 overflow-hidden relative">
        <SEO title="Permissão Negada | Tactical Ops" />
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1541888941255-2761956e20dd?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-5 grayscale"></div>
        
        <div className="max-w-2xl w-full relative z-10 text-center space-y-8">
          <div className="size-32 mx-auto bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20">
            <span className="material-symbols-outlined text-red-600 text-7xl">lock_person</span>
          </div>
          
          <div>
            <h1 className="text-5xl font-black uppercase italic tracking-tighter mb-4 text-white">ACESSO RESTRITO</h1>
            <p className="text-sm font-black tracking-widest text-white/40 uppercase leading-relaxed max-w-md mx-auto">
              OPERADOR <span className="text-white">{user?.email}</span>,<br/> VOCÊ NÃO POSSUI CREDENCIAIS DE NÍVEL <span className="text-red-500">ADMIN</span> PARA O ARSENAL HUB.
            </p>
          </div>

          <Link 
            to="/" 
            className="inline-block px-12 py-5 bg-white/5 border border-white/10 hover:bg-white/10 text-[10px] font-black uppercase tracking-[0.5em] transition-all"
          >
            VOLTAR PARA O QG
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-[#050505] text-white pt-24 pb-20 relative overflow-hidden selection:bg-primary transition-all duration-700 ${isTransitioning ? 'opacity-0 scale-105 blur-2xl' : 'opacity-100 scale-100 blur-0'}`}>
      <SEO title="Arsenal Hub | Tactical Ops" />

      {/* BACKGROUND SCENARIOS */}
      <div className="absolute inset-0 z-0 opacity-10">
         <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black z-10"></div>
         <div className="w-full h-full bg-[url('https://images.unsplash.com/photo-1541888941255-2761956e20dd?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center grayscale brightness-50"></div>
      </div>

      <div className="max-w-[1700px] mx-auto px-8 relative z-10">
        
        {/* --- INITIAL HUB --- */}
        {viewMode === 'initial' && (
          <div className="flex flex-col lg:flex-row items-center justify-between gap-20 animate-fade-in pt-10">
             <div className="lg:w-1/2">
                <h1 className="text-8xl md:text-[140px] font-black italic tracking-tighter leading-[0.8] uppercase mb-12">
                   TACTICAL<br/><span className="text-primary">HUB</span>
                </h1>
                <div className="flex flex-col gap-4">
                   <button onClick={() => changeView('armaria')} className="group flex items-center justify-between p-8 bg-primary border border-primary text-black transition-all hover:bg-white">
                      <div className="flex items-center gap-6">
                         <span className="material-symbols-outlined text-4xl">military_tech</span>
                         <div className="text-left"><h3 className="text-3xl font-black italic uppercase tracking-tighter">Create Class</h3><p className="text-[10px] font-black tracking-widest uppercase opacity-60">Gunsmith & Customization</p></div>
                      </div>
                      <span className="material-symbols-outlined translate-x-10 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all">chevron_right</span>
                   </button>
                   <button onClick={() => alert('Em breve')} className="group flex items-center justify-between p-8 bg-white/5 border border-white/10 text-white transition-all hover:border-primary/50">
                      <div className="flex items-center gap-6">
                         <span className="material-symbols-outlined text-4xl">person</span>
                         <div className="text-left"><h3 className="text-3xl font-black italic uppercase tracking-tighter">Loadout</h3><p className="text-[10px] font-black tracking-widest uppercase opacity-60">Operador & Camo</p></div>
                      </div>
                   </button>
                </div>
             </div>
             <div className="lg:w-1/2 flex justify-center perspective-1000">
                <img src="/ghost.webp" alt="Ghost" className="w-full max-w-lg object-contain animate-idle drop-shadow-[0_0_50px_rgba(251,191,36,0.3)]" />
             </div>
          </div>
        )}

        {/* --- GUNSMITH WORKSHOP --- */}
        {viewMode === 'armaria' && (
          <div className="animate-fade-in h-[80vh]">
             <header className="flex justify-between items-end mb-8">
                <button onClick={() => changeView('initial')} className="flex items-center gap-2 text-primary font-black uppercase text-[10px] tracking-widest hover:translate-x-[-10px] transition-transform">
                   <span className="material-symbols-outlined text-sm">arrow_left</span> Sair da Armaria
                </button>
                <div className="text-right">
                   <span className="text-[10px] font-black tracking-[0.4em] uppercase text-white/40 mb-1 block">Valor da Classe</span>
                   <span className="text-3xl font-black text-primary">{formatPrice(totalPrice)}</span>
                </div>
             </header>

             <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
                
                {/* 🔧 SIDEBAR (40%) */}
                <div className="lg:col-span-5 flex h-full bg-white/5 border border-white/10 backdrop-blur-md overflow-hidden">
                   {/* Column 1: Category Icons */}
                   <div className="w-[80px] border-r border-white/5 bg-black/40 flex flex-col items-center py-6 gap-6">
                      {[...PRIMARY_TYPES, ...SECONDARY_TYPES].map(cat => (
                         <button 
                            key={cat.id} 
                            onClick={() => { setSelectedType(cat.id as WeaponType); setActiveSlot(cat.id === 'faca' || cat.id === 'pistola' || cat.id === 'bazuca' || cat.id === 'granada' ? 'secondary' : 'base'); }}
                            className={`size-12 rounded-none flex items-center justify-center transition-all ${selectedType === cat.id ? 'bg-primary text-black' : 'text-white/20 hover:text-white hover:bg-white/5'}`}
                            title={cat.label}
                         >
                            <span className="material-symbols-outlined text-2xl">{cat.icon}</span>
                         </button>
                      ))}
                      <div className="my-2 h-px w-8 bg-white/10" />
                      {ATTACHMENT_SLOTS.map(slot => (
                         <button 
                            key={slot.id} 
                            onClick={() => { setActiveSlot(slot.id); setSelectedType('assault'); }} // SelectedType just to trigger list
                            className={`size-12 flex items-center justify-center transition-all ${activeSlot === slot.id ? 'bg-primary text-black shadow-[0_0_15px_rgba(251,191,36,0.5)]' : 'text-primary/40 hover:text-primary hover:bg-primary/5'}`}
                         >
                            <span className="material-symbols-outlined text-xl">{slot.icon}</span>
                         </button>
                      ))}
                   </div>

                   {/* Column 2: Product List [FOTO] DESCRIÇÃO */}
                   <div className="flex-1 flex flex-col">
                      <div className="p-6 border-b border-white/5 bg-black/20">
                         <h3 className="text-xs font-black uppercase tracking-[0.3em] text-primary">Selecione Equipamento</h3>
                      </div>
                      <div className="flex-1 overflow-y-auto custom-scrollbar">
                         {loadingProducts ? <div className="p-10 text-center animate-pulse text-[10px] font-black uppercase text-white/20">Acessando Banco de Dados...</div> : (
                            currentProducts.map(product => (
                               <button 
                                  key={product.id} 
                                  onClick={() => handleSelectItem(product)}
                                  className={`w-full flex items-center gap-4 p-4 border-b border-white/5 transition-all text-left group ${loadout[activeSlot] === product ? 'bg-primary/10 border-l-4 border-l-primary' : 'hover:bg-white/5'}`}
                               >
                                  <div className="size-10 bg-black/60 flex items-center justify-center overflow-hidden border border-white/10 group-hover:border-primary/50 transition-colors">
                                     <img src={product.image_url ?? undefined} alt={product.name || ''} className="w-full h-full object-contain p-1" />
                                  </div>
                                  <span className={`text-[11px] font-black uppercase tracking-tight group-hover:text-primary transition-colors ${loadout[activeSlot] === product ? 'text-primary' : 'text-white/60'}`}>
                                     {product.name}
                                  </span>
                                  {loadout[activeSlot] === product && <span className="material-symbols-outlined text-primary text-sm ml-auto">check_circle</span>}
                               </button>
                            ))
                         )}
                         {currentProducts.length === 0 && !loadingProducts && (
                            <div className="p-10 text-center opacity-20 text-[10px] font-black uppercase">Nenhum item detectado nesta categoria</div>
                         )}
                      </div>
                   </div>
                </div>

                {/* 🎯 PREVIEW AREA (60%) */}
                <div className="lg:col-span-7 relative flex flex-col items-center justify-center bg-black/20 rounded-xl overflow-hidden border border-white/5">
                    {/* Visual Floor / Perspective */}
                    <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-primary/10 to-transparent blur-3xl opacity-30"></div>
                    
                    {/* Ghost subtle background */}
                    <img src="/ghost.webp" alt="Ghost" className="absolute right-0 bottom-0 size-[500px] object-contain opacity-10 grayscale brightness-50 pointer-events-none" />

                    {/* MAIN WEAPON PREVIEW */}
                    <div className="relative z-10 w-full flex flex-col items-center px-12">
                       {loadout.base ? (
                         <div className="relative group animate-in zoom-in-95 duration-500 w-full flex flex-col items-center">
                            <div className="absolute inset-0 bg-primary/10 blur-[100px] animate-pulse"></div>
                            
                            {/* Visualizador 3D Real */}
                            <div className="h-[400px] w-full relative z-10 flex items-center justify-center cursor-move">
                               <Suspense fallback={
                                  <div className="flex flex-col items-center gap-4 animate-pulse">
                                     <div className="size-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                                     <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/40">Iniciando Motor 3D...</span>
                                  </div>
                               }>
                                  <WeaponViewer3D />
                               </Suspense>
                            </div>
                            
                            {/* HUD SLOTS DISPLAY (Gunsmith Visual) */}
                            <div className="mt-12 grid grid-cols-3 lg:grid-cols-6 gap-2 w-full">
                               {ATTACHMENT_SLOTS.map(slot => (
                                  <div key={slot.id} className={`p-3 border flex flex-col items-center gap-1 transition-all ${loadout[slot.id] ? 'border-primary bg-primary/10' : 'border-white/5 bg-black/40 opacity-30'}`}>
                                     <span className="material-symbols-outlined text-sm">{slot.icon}</span>
                                     <span className="text-[7px] font-black uppercase tracking-tighter truncate w-full text-center">{loadout[slot.id]?.name || slot.label}</span>
                                  </div>
                               ))}
                            </div>

                            <div className="mt-8 text-center bg-black/60 p-4 border-l-4 border-primary border-r-4">
                               <h2 className="text-4xl font-black italic uppercase italic tracking-tighter truncate max-w-[500px]">{loadout.base.name}</h2>
                               <div className="flex justify-center gap-6 mt-2 opacity-40 text-[9px] font-mono uppercase tracking-[0.3em]">
                                  <span>SYS: {loadout.base.system || 'STD'}</span>
                                  <span>BRD: {loadout.base.brand || 'UNK'}</span>
                               </div>
                            </div>
                         </div>
                       ) : (
                         <div className="flex flex-col items-center gap-6 opacity-10">
                            <span className="material-symbols-outlined text-[160px]">military_tech</span>
                            <h2 className="text-xl font-black tracking-[0.5em] uppercase">Ready for customization</h2>
                         </div>
                       )}
                    </div>

                    {/* Footer Actions */}
                    <div className="absolute bottom-8 right-8 z-20">
                       <button 
                          onClick={async () => {
                             const ids = Object.values(loadout).filter(Boolean).map(item => item.id);
                             for (const id of ids) await addItem(id);
                             alert('LOADOUT SINCRONIZADO COM O CARRINHO.');
                          }}
                          disabled={!loadout.base}
                          className="px-12 py-5 bg-primary text-black font-black uppercase tracking-[0.3em] text-xs hover:bg-white transition-all disabled:opacity-20 flex items-center gap-3 shadow-[0_0_50px_rgba(251,191,36,0.3)]"
                       >
                          <span className="material-symbols-outlined text-sm">shopping_cart</span>
                          Implementar Arsenal
                       </button>
                    </div>
                </div>
             </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-15px); } }
        @keyframes idle { 0%, 100% { transform: translateY(0) scale(1.05); } 50% { transform: translateY(-10px) scale(1); } }
        .animate-idle { animation: idle 6s ease-in-out infinite; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(251,191,36,0.3); }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #fbb724; }
      `}</style>
    </div>
  );
}
