import { useNavigate } from 'react-router-dom';
import { SEO } from '../components/SEO';

export default function SecurityNoticePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background-dark flex items-center justify-center py-20 px-6 relative overflow-hidden crt-overlay">
      <div className="scanline"></div>
      <SEO title="Protocolo de Verificação | Perfection Airsoft" />

      <div className="max-w-2xl w-full bg-surface/10 border border-white/5 p-12 relative z-10 shadow-2xl">
        {/* Header HUD */}
        <div className="flex items-center gap-6 mb-12">
          <div className="size-16 rounded-full border-2 border-primary flex items-center justify-center bg-primary/10 shadow-[0_0_20px_rgba(255,193,7,0.2)]">
             <span className="material-symbols-outlined text-primary text-4xl font-black">verified_user</span>
          </div>
          <h1 className="text-3xl font-black text-white italic uppercase tracking-tighter">
            PROTOCOLO DE VERIFICAÇÃO TÁTICA
          </h1>
        </div>

        {/* Messaging Body */}
        <div className="space-y-8 border-l-2 border-primary/30 pl-8 py-2">
          <p className="text-xs text-slate-400 font-mono leading-relaxed uppercase tracking-widest">
            PARA GARANTIR A SEGURANÇA DA NOSSA COMUNIDADE DE OPERADORES E CUMPRIR AS NORMAS DE COMBATE A FRAUDES E LAVAGEM DE DINHEIRO (AML), SOLICITAMOS A VERIFICAÇÃO OBRIGATÓRIA DE SUA IDENTIDADE.
          </p>
          
          <p className="text-xs text-slate-400 font-mono leading-relaxed uppercase tracking-widest">
            SEUS DADOS SÃO CRIPTOGRAFADOS E USADOS EXCLUSIVAMENTE PARA VALIDAR SUA CONTA DE RECEBIMENTOS NO GATEWAY FINANCEIRO (ASAAS), PERMITINDO SAQUES INSTANTÂNEOS E LIQUIDEZ TOTAL NAS SUAS MISSÕES.
          </p>
        </div>

        {/* Agreement Box */}
        <div className="mt-12 bg-black/40 border border-white/10 p-6 flex items-start gap-4">
          <span className="material-symbols-outlined text-blue-500 text-2xl">shield</span>
          <p className="text-[10px] text-primary font-black uppercase tracking-[0.2em] leading-relaxed">
            AO CONTINUAR, VOCÊ CONCORDA QUE AS INFORMAÇÕES E DOCUMENTOS ENVIADOS SÃO VERDADEIROS E AUTÊNTICOS.
          </p>
        </div>

        {/* Action Button */}
        <button 
          onClick={() => navigate('/organizador')}
          className="mt-12 w-full bg-primary text-background-dark font-black py-6 text-xs uppercase tracking-[0.4em] hover:bg-white transition-all flex items-center justify-center gap-3 group relative overflow-hidden"
        >
          {/* Texture Overlay */}
          <div className="absolute inset-0 opacity-10 pointer-events-none bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,black_10px,black_20px)]"></div>
          
          <span className="relative z-10 font-black italic">CONCORDAR E PROSSEGUIR</span>
          <span className="material-symbols-outlined relative z-10 group-hover:translate-x-2 transition-transform">arrow_forward</span>
        </button>

        {/* Footer HUD */}
        <div className="mt-8 flex justify-between items-center text-[8px] font-mono text-slate-600 uppercase tracking-widest">
            <span>Security Integrity Protocol: ACTIVE</span>
            <span>Encryption: AES-256</span>
        </div>
      </div>
    </div>
  );
}
