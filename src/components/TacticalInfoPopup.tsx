import React from 'react';
import { Link } from 'react-router-dom';
import type { MissionContent } from '../data/missionCatalog';

interface TacticalInfoPopupProps {
  content: MissionContent | null;
  onClose: () => void;
}

export const TacticalInfoPopup: React.FC<TacticalInfoPopupProps> = ({ content, onClose }) => {
  if (!content) return null;

  const blogPath = content.category === 'type' 
    ? `/blog/modalidades/${content.slug}` 
    : `/blog/modos/${content.slug}`;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-sm bg-background-dark border border-primary/40 shadow-[0_0_40px_rgba(251,191,36,0.1)] overflow-hidden">
        {/* Header Decore */}
        <div className="h-1 w-full bg-gradient-to-r from-transparent via-primary to-transparent" />
        
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-black text-white uppercase tracking-tighter leading-none italic">
                {content.label}
              </h3>
              {content.subtitle && (
                <span className="text-[10px] text-primary font-black uppercase tracking-[0.2em]">
                  {content.subtitle}
                </span>
              )}
            </div>
            <button 
              onClick={onClose}
              className="size-8 flex items-center justify-center bg-white/5 hover:bg-white/10 text-slate-500 hover:text-white transition-colors border border-white/5"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>

          <div className="relative p-4 bg-black/40 border-l-2 border-primary/30 mb-6">
            <p className="text-xs text-slate-300 font-mono leading-relaxed uppercase">
              {content.shortDescription}
            </p>
          </div>

          <Link 
            to={blogPath}
            className="group flex items-center justify-center gap-2 w-full bg-primary text-black font-black py-4 text-[10px] uppercase tracking-[0.2em] hover:bg-white transition-all shadow-[0_4px_15px_rgba(251,191,36,0.2)]"
          >
            Saber Mais Detalhes
            <span className="material-symbols-outlined text-xs group-hover:translate-x-1 transition-transform">
              arrow_forward
            </span>
          </Link>
        </div>
        
        {/* Footer Decore */}
        <div className="flex justify-between items-center px-6 py-2 bg-white/5">
           <span className="text-[8px] text-slate-600 font-mono uppercase tracking-widest">Procedimento Educacional V.1</span>
           <div className="flex gap-1">
             <div className="size-1 bg-primary/20" />
             <div className="size-1 bg-primary/40" />
             <div className="size-1 bg-primary" />
           </div>
        </div>
      </div>
    </div>
  );
};
