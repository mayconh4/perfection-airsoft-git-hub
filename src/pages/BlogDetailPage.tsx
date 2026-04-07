import { useParams, Link } from 'react-router-dom';
import { SEO } from '../components/SEO';
import { MISSION_TYPES, GAME_MODES } from '../data/missionCatalog';
import { MISSION_LORE } from '../data/missionLore';

export default function BlogDetailPage() {
  const { slug } = useParams();

  // Find the content logically
  const item = [...MISSION_TYPES, ...GAME_MODES].find(i => i.slug === slug);
  const lore = slug ? MISSION_LORE[slug] : null;

  if (!item || !lore) {
    return (
      <div className="min-h-screen bg-background-dark pt-32 pb-20 flex flex-col items-center px-6">
        <span className="material-symbols-outlined text-8xl text-red-500/20 mb-6">lock_reset</span>
        <h1 className="text-3xl font-black text-white uppercase italic">INTEL NÃO ENCONTRADO</h1>
        <p className="text-slate-500 font-mono text-[10px] mt-2">O DOSSIÊ SOLICITADO NÃO EXISTE OU FOI ARQUIVADO.</p>
        <Link to="/blog" className="mt-8 bg-primary/10 border border-primary/20 text-primary px-8 py-3 font-black text-[10px] uppercase tracking-widest hover:bg-primary hover:text-black transition-all">
          Voltar ao Manual
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-dark pt-12 pb-20 relative overflow-hidden crt-overlay font-inter">
      <div className="scanline"></div>
      <SEO title={`${item.label} | Dossiê Tático Perfection Airsoft`} />

      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <Link to="/blog" className="inline-flex items-center gap-3 text-slate-500 hover:text-primary transition-all mb-12 group">
          <span className="material-symbols-outlined text-sm group-hover:-translate-x-2 transition-transform">arrow_back</span>
          <span className="text-[10px] font-black uppercase tracking-[0.3em]">Retornar ao Command Center</span>
        </Link>

        {/* Hero Section - Dossier Header */}
        <div className="mb-20 grid grid-cols-1 md:grid-cols-4 gap-12 border-b border-white/5 pb-16">
          <div className="md:col-span-3">
            <div className="flex items-center gap-4 mb-6">
               <span className="h-0.5 w-12 bg-primary animate-pulse" />
               <span className="text-primary font-black uppercase tracking-[0.5em] text-[11px] bg-primary/10 px-4 py-1 border border-primary/20">
                 CLASSIFIED // {item.category === 'type' ? 'MODALIDADE' : 'OPERACIONAL'}
               </span>
            </div>
            <h1 className="text-6xl md:text-8xl font-black text-white uppercase tracking-tighter italic leading-[0.8] mb-8">
              {item.label}
            </h1>
            {item.subtitle && (
              <div className="flex items-center gap-4">
                  <div className="px-6 py-2 bg-primary text-black font-black text-[12px] uppercase tracking-[0.4em] italic shadow-[0_0_20px_rgba(251,191,36,0.3)]">
                    {item.subtitle}
                  </div>
                  <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest border border-white/10 px-4 py-2">
                    REVISÃO 2026.04
                  </div>
              </div>
            )}
          </div>
          
          <div className="flex flex-col justify-end items-end gap-2 text-right opacity-40">
             <span className="text-[9px] font-mono uppercase text-slate-500">ID_PROTOCOLO: {item.id.toUpperCase()}</span>
             <span className="text-[9px] font-mono uppercase text-slate-500">TIMESTAMP: {new Date().toISOString().slice(0, 10)}</span>
             <div className="w-24 h-24 border border-slate-800 opacity-20 p-2">
                <div className="w-full h-full bg-slate-900 grid grid-cols-4 grid-rows-4 gap-1">
                    {[...Array(16)].map((_, i) => <div key={i} className={`bg-slate-800 ${Math.random() > 0.5 ? 'opacity-100' : 'opacity-0'}`}></div>)}
                </div>
             </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          <div className="lg:col-span-8 space-y-16">
            {/* Intel Section */}
            <section className="relative">
               <div className="absolute top-0 left-0 -translate-x-12 opacity-10 text-primary">
                  <span className="material-symbols-outlined text-[100px]">description</span>
               </div>
               <div className="bg-surface/10 border border-white/5 p-12 relative overflow-hidden">
                  {/* Watermark */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.02] rotate-[-20deg]">
                      <span className="text-9xl font-black uppercase">CONFIDENTIAL</span>
                  </div>
                  
                  <h2 className="text-sm font-black text-primary uppercase tracking-[0.4em] mb-10 flex items-center gap-3">
                    <div className="size-2 bg-primary shadow-[0_0_10px_rgba(251,191,36,0.8)]" />
                    SITREP: BRIEFING OPERACIONAL
                  </h2>
                  <div className="prose prose-invert max-w-none">
                    <p className="text-slate-300 font-mono text-base leading-[1.8] uppercase tracking-wide first-letter:text-5xl first-letter:font-black first-letter:text-primary first-letter:float-left first-letter:mr-3 first-letter:mt-1">
                      {lore.fullDescription}
                    </p>
                  </div>
               </div>
            </section>

            {/* Tactical Tips - FIELD NOTES */}
            <section className="bg-primary/5 border border-primary/20 p-12 relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-3xl group-hover:bg-primary/20 transition-all"></div>
               <h2 className="text-sm font-black text-white uppercase tracking-[0.4em] mb-10 flex items-center gap-4">
                 <span className="material-symbols-outlined text-primary text-2xl">architecture</span>
                 FIELD NOTES: NOTAS DE CAMPO
               </h2>
               <div className="grid grid-cols-1 gap-6">
                 {lore.tacticalTips.map((tip, idx) => (
                   <div key={idx} className="flex gap-6 items-start bg-black/40 border border-white/5 p-6 hover:border-primary/30 transition-all group-hover:translate-x-2 shadow-xl">
                     <span className="text-primary font-black font-mono text-xl opacity-40">{(idx + 1).toString().padStart(2, '0')}</span>
                     <p className="text-slate-300 text-xs font-black uppercase tracking-[0.2em] leading-relaxed italic">
                       {tip}
                     </p>
                   </div>
                 ))}
               </div>
            </section>
            
            {/* Mission Readiness Section */}
            <section className="border border-white/5 p-12 bg-surface/5">
                <h2 className="text-sm font-black text-slate-500 uppercase tracking-[0.4em] mb-10 flex items-center gap-4">
                 <span className="material-symbols-outlined text-slate-600 text-2xl">checklist</span>
                 READYUP: CHECKLIST DE PRONTIDÃO
               </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {[
                        "Verificar proteção facial e ocular",
                        "Checagem de baterias e reservas",
                        "Briefing de rádio e canais",
                        "Check de fair-play e regras locais"
                    ].map((check, i) => (
                        <div key={i} className="flex items-center gap-4 text-[10px] font-mono text-slate-400 uppercase tracking-widest border-b border-white/5 pb-4">
                            <span className="material-symbols-outlined text-primary text-sm">check_box_outline_blank</span>
                            {check}
                        </div>
                    ))}
                </div>
            </section>
          </div>

          {/* Sidebar - Technical Specs */}
          <div className="lg:col-span-4 space-y-10">
             <div className="bg-surface/20 border border-white/10 p-10 relative">
                <div className="absolute -top-3 -right-3 px-3 py-1 bg-primary text-black text-[9px] font-black uppercase tracking-widest">SPECS TÉCNICAS</div>
                <div className="space-y-8">
                   <div className="space-y-2">
                       <span className="text-[9px] text-slate-600 uppercase font-black tracking-widest block">ÍNDICE DE REALISMO</span>
                       <div className="flex gap-1">
                           {[...Array(5)].map((_, i) => <div key={i} className={`h-1 flex-1 ${i < (item.id === 'milsim' ? 5 : 3) ? 'bg-primary shadow-[0_0_5px_rgba(251,191,36,0.5)]' : 'bg-white/10'}`} />)}
                       </div>
                   </div>
                   <div className="space-y-2">
                       <span className="text-[9px] text-slate-600 uppercase font-black tracking-widest block">EXIGÊNCIA FÍSICA</span>
                       <div className="flex gap-1">
                           {[...Array(5)].map((_, i) => <div key={i} className={`h-1 flex-1 ${i < 4 ? 'bg-primary shadow-[0_0_5px_rgba(251,191,36,0.5)]' : 'bg-white/10'}`} />)}
                       </div>
                   </div>
                   
                   <div className="pt-8 border-t border-white/5 space-y-4">
                      <div className="flex justify-between items-center text-[10px] font-mono uppercase tracking-widest">
                         <span className="text-slate-500">AUTORIDADE</span>
                         <span className="text-white">HQ PERFECTION</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] font-mono uppercase tracking-widest">
                         <span className="text-slate-500">TIPO DE ARQUIVO</span>
                         <span className="text-white">ENCRYPTED .OS</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] font-mono uppercase tracking-widest">
                         <span className="text-slate-500">DISTRIBUIÇÃO</span>
                         <span className="text-primary italic">OPERADORES ELITE</span>
                      </div>
                   </div>
                </div>
             </div>

             <div className="p-10 border-2 border-dashed border-white/5 text-center relative group overflow-hidden">
                <div className="absolute inset-0 bg-primary/5 translate-y-full group-hover:translate-y-0 transition-transform duration-700"></div>
                <div className="relative z-10">
                    <span className="material-symbols-outlined text-4xl text-primary/40 block mb-4">qr_code_2</span>
                    <p className="text-[10px] text-slate-500 font-mono uppercase leading-relaxed tracking-tighter">
                      ESCANEE PARA LEVAR ESTE DOSSIÊ PARA O CAMPO DE BATALHA.
                    </p>
                </div>
             </div>
          </div>
        </div>
        
        {/* Footer Navigation */}
        <div className="mt-24 pt-12 border-t border-white/5 flex justify-between items-center">
            <Link to="/blog" className="text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-[0.3em] transition-colors">
              Explorar outros manuais (Sumário)
            </Link>
            <div className="flex gap-4">
                <div className="size-2 bg-primary rounded-full animate-ping"></div>
                <span className="text-[10px] font-mono text-primary uppercase">SISTEMA ONLINE // TRANSMISSÃO SEGURA</span>
            </div>
        </div>
      </div>
    </div>
  );
}
