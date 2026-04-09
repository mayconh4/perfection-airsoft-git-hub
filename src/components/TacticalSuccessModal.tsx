import React from 'react';

interface TacticalSuccessModalProps {
  isOpen: boolean;
  message: string;
  onClose: () => void;
}

export const TacticalSuccessModal: React.FC<TacticalSuccessModalProps> = ({ isOpen, message, onClose }) => {
  if (!isOpen) return null;

  const isGreenHighlight = message?.toLowerCase().includes('pix realizado') || message?.toLowerCase().includes('confirmado');
  const mainColorClass = isGreenHighlight ? 'text-[#22c55e]' : 'text-primary';
  const borderColorClass = isGreenHighlight ? 'border-[#22c55e]' : 'border-primary';
  const bgColorClass = isGreenHighlight ? 'bg-[#22c55e]' : 'bg-primary';
  const shadowColor = isGreenHighlight ? 'rgba(34,197,94,' : 'rgba(251,191,36,';

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-in fade-in zoom-in duration-300">
      <div 
        className="absolute inset-0 bg-black/90 backdrop-blur-md" 
        onClick={onClose}
      />
      
      <div className={`relative w-full max-w-md bg-[#050505] border ${borderColorClass}/50 shadow-[0_0_50px_${shadowColor}0.2)] overflow-hidden`}>
        {/* Top Scanner Line Anima */}
        <div className={`absolute top-0 left-0 w-full h-[2px] ${bgColorClass}/40 animate-pulse`} />
        
        {/* Glitch Overlay Effect */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />

        <div className="p-8 relative">
          <div className="flex items-center gap-4 mb-6">
            <div className={`size-12 rounded-full border-2 ${borderColorClass} flex items-center justify-center animate-bounce`}>
              <span className={`material-symbols-outlined ${mainColorClass} text-3xl font-black`}>
                verified_user
              </span>
            </div>
            <div>
              <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter leading-none">
                Protocolo Ativado
              </h2>
              <span className={`text-[10px] ${mainColorClass} font-mono uppercase tracking-[0.3em]`}>
                Status: Operação Confirmada
              </span>
            </div>
          </div>

          <div className={`bg-white/5 border-l-4 ${borderColorClass} p-5 mb-8`}>
            <p className="text-sm text-slate-200 font-mono leading-relaxed uppercase">
              {message}
            </p>
          </div>

          <button
            onClick={onClose}
            className={`w-full ${bgColorClass} text-black font-black py-4 text-xs uppercase tracking-[0.3em] hover:bg-white transition-all transform active:scale-[0.98] shadow-[0_5px_20px_${shadowColor}0.3)]`}
          >
            Acessar Painel Tático
          </button>
        </div>

        {/* Tactical Footer Decore */}
        <div className={`${bgColorClass}/5 px-8 py-3 flex justify-between items-center border-t border-white/5`}>
          <div className="flex gap-2">
            <div className={`w-8 h-1 ${bgColorClass}/20`} />
            <div className={`w-4 h-1 ${bgColorClass}/40`} />
          </div>
          <span className="text-[9px] text-slate-500 font-mono tracking-widest uppercase">
            Encerrando fase de aquisição v2.4
          </span>
        </div>
      </div>
    </div>
  );
};
