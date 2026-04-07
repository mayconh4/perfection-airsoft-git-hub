import { Link } from 'react-router-dom';
import { SEO } from '../components/SEO';
import { MISSION_TYPES, GAME_MODES } from '../data/missionCatalog';

export default function BlogListingPage() {
  return (
    <div className="min-h-screen bg-background-dark pt-12 pb-20 relative overflow-hidden crt-overlay font-inter">
      <div className="scanline"></div>
      <SEO title="Manual de Operações | Blog Tático Perfection Airsoft" />

      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <div className="mb-16 border-l-4 border-primary pl-10 py-8 bg-surface/10 relative group">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <span className="text-primary font-black uppercase tracking-[0.5em] text-[10px] block mb-3 animate-pulse">
            INTEL & TREINAMENTO OPERACIONAL
          </span>
          <h1 className="text-6xl font-black text-white uppercase tracking-tighter italic">
            MANUAL DE <span className="text-primary">OPERAÇÕES</span>
          </h1>
          <p className="text-slate-500 text-[11px] font-mono uppercase tracking-[0.25em] mt-6 max-w-3xl leading-relaxed">
            SISTEMA CENTRALIZADO DE PROTOCOLOS, REGRAS DE ENGAJAMENTO E MODALIDADES TÁTICAS. 
            MANTENHA-SE INFORMADO. MANTENHA-SE PREPARADO.
          </p>
          <div className="mt-8 flex gap-4 text-[8px] font-mono text-primary/40 uppercase tracking-widest">
            <span>[ESTADO: ACESSO LIVRE]</span>
            <span>[CONEXÃO: SEGURA]</span>
            <span>[VERSÃO: 4.0.7]</span>
          </div>
        </div>

        {/* Modalidades Section */}
        <section className="mb-24">
          <div className="flex items-center gap-6 mb-12">
            <h2 className="text-3xl font-black text-white uppercase tracking-widest italic flex items-center gap-4">
              <div className="size-10 bg-primary/20 flex items-center justify-center rounded-sm border border-primary/30">
                <span className="material-symbols-outlined text-primary text-2xl">military_tech</span>
              </div>
              CLASSIFICAÇÃO DE MISSÕES
            </h2>
            <div className="flex-1 h-[1px] bg-white/10" />
            <span className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">01 // MODALIDADES</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {MISSION_TYPES.map((type) => (
              <Link 
                key={type.id} 
                to={`/blog/modalidades/${type.slug}`}
                className="group relative"
              >
                <div className="bg-surface/30 border border-white/5 p-10 hover:border-primary/50 transition-all duration-500 relative overflow-hidden h-full">
                  <div className="absolute top-0 left-0 w-[2px] h-0 bg-primary group-hover:h-full transition-all duration-700"></div>
                  
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-6">
                        <span className="text-[10px] text-primary font-black uppercase tracking-[0.4em] bg-primary/10 px-3 py-1 rounded-sm border border-primary/20 group-hover:bg-primary group-hover:text-black transition-colors">{type.subtitle}</span>
                        <span className="text-[10px] font-mono text-slate-700">DOSSIÊ #{(Math.random() * 1000).toFixed(0)}</span>
                    </div>
                    
                    <h3 className="text-4xl font-black text-white uppercase tracking-tighter mb-6 group-hover:text-primary transition-colors italic">{type.label}</h3>
                    
                    <p className="text-sm text-slate-400 font-mono leading-relaxed mb-8 uppercase tracking-wide">
                      {type.shortDescription}
                    </p>
                    
                    <div className="flex items-center gap-3 text-[11px] font-black text-white uppercase tracking-[0.2em] group-hover:gap-5 transition-all">
                      <span>VER PROTOCOLO COMPLETO</span>
                      <span className="material-symbols-outlined text-primary group-hover:translate-x-2 transition-transform">arrow_right_alt</span>
                    </div>
                  </div>

                  {/* Aesthetic grid overlay */}
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03]"></div>
                  
                  {/* Background Decor */}
                  <div className="absolute -right-12 -bottom-12 opacity-[0.01] group-hover:opacity-[0.03] transition-opacity rotate-[-15deg]">
                    <span className="material-symbols-outlined text-[200px]">verified_user</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Game Modes Section */}
        <section>
          <div className="flex items-center gap-6 mb-12">
            <h2 className="text-3xl font-black text-white uppercase tracking-widest italic flex items-center gap-4">
              <div className="size-10 bg-primary/20 flex items-center justify-center rounded-sm border border-primary/30">
                <span className="material-symbols-outlined text-primary text-2xl">security_update_good</span>
              </div>
              MODOS OPERACIONAIS
            </h2>
            <div className="flex-1 h-[1px] bg-white/10" />
            <span className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">02 // GAME MODES</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {GAME_MODES.map((mode) => (
              <Link 
                key={mode.id} 
                to={`/blog/modos/${mode.slug}`}
                className="group bg-surface/20 border border-white/5 p-8 hover:bg-surface/40 hover:border-white/20 transition-all flex flex-col justify-between h-full relative"
              >
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
                
                <div>
                    <div className="flex justify-between items-start mb-6">
                        <h3 className="text-xl font-black text-white uppercase tracking-tight group-hover:text-primary transition-colors leading-none">{mode.label}</h3>
                        <span className="text-[8px] font-mono text-primary/40">[{mode.id.toUpperCase()}]</span>
                    </div>
                    
                    <p className="text-[11px] text-slate-500 font-mono leading-relaxed uppercase mb-8 line-clamp-4 tracking-wide group-hover:text-slate-300 transition-colors">
                      {mode.shortDescription}
                    </p>
                </div>
                
                <div className="flex items-center justify-between mt-auto pt-6 border-t border-white/5">
                    <span className="text-[9px] font-black text-primary uppercase tracking-[0.2em] flex items-center gap-2 group-hover:gap-3 transition-all">
                      INSTRUÇÕES
                      <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                    </span>
                    <div className="size-1 bg-primary/20 group-hover:size-2 group-hover:bg-primary transition-all rounded-full"></div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
