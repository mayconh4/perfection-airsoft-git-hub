import React from 'react';

interface TacticalSuccessModalProps {
  isOpen: boolean;
  message: string;
  onClose: () => void;
}

export const TacticalSuccessModal: React.FC<TacticalSuccessModalProps> = ({ isOpen, message, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 selection:bg-[#22c55e] selection:text-black">
      <div 
        className="absolute inset-0 bg-black/95 backdrop-blur-xl animate-in fade-in duration-500" 
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-xl bg-[#050505] border border-[#22c55e]/30 shadow-[0_0_100px_rgba(34,197,94,0.15)] overflow-hidden rounded-sm animate-in zoom-in-95 duration-500">
        {/* Radar/Scanline Effect */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[50%] bg-gradient-to-b from-[#22c55e]/5 to-transparent animate-scanline pointer-events-none" />
          <div className="absolute inset-0 opacity-[0.05] bg-[radial-gradient(#22c55e_0.5px,transparent_0.5px)] [background-size:16px_16px]" />
        </div>

        {/* Decorative Corners */}
        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-[#22c55e] m-2" />
        <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-[#22c55e] m-2" />
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-[#22c55e] m-2" />
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-[#22c55e] m-2" />

        <div className="p-10 relative text-center">
          <div className="mb-8 relative inline-block">
            <div className="size-24 rounded-full border-2 border-[#22c55e] flex items-center justify-center relative z-10 bg-black shadow-[0_0_40px_rgba(34,197,94,0.4)]">
              <span className="material-symbols-outlined text-[#22c55e] text-6xl font-black animate-pulse">
                check_circle
              </span>
            </div>
            {/* Pulsing rings */}
            <div className="absolute inset-0 rounded-full border border-[#22c55e]/30 animate-ping opacity-20" />
          </div>

          <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter leading-none mb-2">
            Missão <span className="text-[#22c55e]">Cumprida</span>
          </h2>
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="h-[1px] w-12 bg-[#22c55e]/30" />
            <span className="text-[10px] text-[#22c55e] font-mono uppercase tracking-[0.4em] font-bold">
              Protocolo de Aquisição Finalizado
            </span>
            <div className="h-[1px] w-12 bg-[#22c55e]/30" />
          </div>

          <div className="bg-[#22c55e]/5 border-y border-[#22c55e]/20 py-8 px-6 mb-10 relative group">
             <div className="absolute left-0 top-0 w-1 h-full bg-[#22c55e] shadow-[0_0_15px_#22c55e]" />
             <p className="text-lg text-slate-100 font-mono tracking-tight leading-relaxed uppercase italic">
               "{message}"
             </p>
             <div className="mt-4 flex justify-center gap-1 opacity-50">
               {[...Array(5)].map((_, i) => (
                 <div key={i} className="w-1 h-1 bg-[#22c55e]" />
               ))}
             </div>
          </div>

          <button
            onClick={onClose}
            className="group relative w-full overflow-hidden"
          >
            <div className="absolute inset-0 bg-[#22c55e] transition-transform duration-300 transform translate-y-full group-hover:translate-y-0" />
            <div className="relative border-2 border-[#22c55e] py-5 px-8 flex items-center justify-center gap-4 transition-colors duration-300 group-hover:text-black">
              <span className="text-sm font-black uppercase tracking-[0.4em]">
                Acessar Painel Tático
              </span>
              <span className="material-symbols-outlined font-black text-lg">
                arrow_forward_ios
              </span>
            </div>
          </button>
          
          <p className="mt-6 text-[9px] text-slate-500 font-mono uppercase tracking-widest opacity-60">
            Aguardando redirecionamento para zona segura...
          </p>
        </div>

        {/* Tactical Status Bottom */}
        <div className="bg-[#22c55e]/10 px-10 py-4 flex justify-between items-center border-t border-[#22c55e]/20">
          <div className="flex items-center gap-3">
            <div className="size-2 bg-[#22c55e] rounded-full animate-pulse" />
            <span className="text-[10px] text-[#22c55e] font-mono tracking-tighter">SECURE_LINK_ESTABLISHED</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono opacity-40">
            P_OPS_V2.4.0
          </span>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scanline {
          from { transform: translateY(-100%); }
          to { transform: translateY(200%); }
        }
        .animate-scanline {
          animation: scanline 4s linear infinite;
        }
      `}} />
    </div>
  );
};
