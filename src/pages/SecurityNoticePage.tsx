import { SEO } from '../components/SEO';
import { OperatorKYCForm } from '../components/OperatorKYCForm';

export default function SecurityNoticePage() {
  return (
    <div className="min-h-screen bg-background-dark py-20 px-6 relative overflow-hidden crt-overlay">
      <div className="scanline"></div>
      <SEO title="Protocolo de Verificação | Perfection Airsoft" />

      <div className="max-w-4xl mx-auto relative z-10">
        <OperatorKYCForm />
        
        {/* Footer HUD */}
        <div className="mt-8 flex justify-between items-center text-[8px] font-mono text-slate-600 uppercase tracking-widest px-8">
            <span>Security Integrity Protocol: ACTIVE</span>
            <span>Encryption: AES-256</span>
        </div>
      </div>
    </div>
  );
}
