import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export function OrganizerRequestForm({ onComplete }: { onComplete: () => void }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    reason: '',
    experience: '',
    phone: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          role_request: 'organizer',
          role_request_reason: `Experiência: ${formData.experience} | Motivo: ${formData.reason}`,
          role_request_at: new Date().toISOString(),
          phone: formData.phone
        })
        .eq('id', user.id);

      if (error) throw error;
      setSuccess(true);
      setTimeout(onComplete, 3000);
    } catch (err: any) {
      alert(`Erro ao enviar solicitação: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-primary/10 border border-primary/30 p-8 text-center animate-in zoom-in duration-300">
        <span className="material-symbols-outlined text-5xl text-primary mb-4">check_circle</span>
        <h3 className="text-xl font-black text-white uppercase italic tracking-tighter mb-2">Solicitação Enviada!</h3>
        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
          Nossa equipe de inteligência irá analisar seu perfil em até 48h.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface/40 border border-white/5 p-8 relative overflow-hidden group">
      <div className="absolute top-0 left-0 w-1 h-full bg-primary/30 group-hover:bg-primary transition-colors"></div>
      
      <div className="flex items-center gap-3 mb-8">
        <span className="h-px w-8 bg-primary"></span>
        <h3 className="text-sm font-black text-white uppercase tracking-[0.3em]">Solicitar Credencial de Organizador</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">WhatsApp de Contato</label>
          <input 
            required
            type="tel"
            placeholder="(00) 00000-0000"
            value={formData.phone}
            onChange={e => setFormData({ ...formData, phone: e.target.value })}
            className="w-full bg-black/40 border border-white/10 p-4 text-xs font-mono text-white focus:border-primary outline-none transition-colors"
          />
        </div>

        <div>
          <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">Experiência com Eventos/Airsoft</label>
          <textarea 
            required
            placeholder="Conte-nos brevemente sua trajetória..."
            value={formData.experience}
            onChange={e => setFormData({ ...formData, experience: e.target.value })}
            className="w-full bg-black/40 border border-white/10 p-4 text-xs font-mono text-white focus:border-primary outline-none transition-colors h-24 resize-none"
          />
        </div>

        <div>
          <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">Por que quer organizar eventos na Perfection?</label>
          <textarea 
            required
            placeholder="Objetivos e metas..."
            value={formData.reason}
            onChange={e => setFormData({ ...formData, reason: e.target.value })}
            className="w-full bg-black/40 border border-white/10 p-4 text-xs font-mono text-white focus:border-primary outline-none transition-colors h-24 resize-none"
          />
        </div>

        <button 
          disabled={loading}
          type="submit"
          className="w-full bg-primary text-black font-black py-4 text-[10px] uppercase tracking-[0.3em] hover:bg-white transition-all disabled:opacity-50"
        >
          {loading ? 'ENVIANDO RELATÓRIO...' : 'ENVIAR SOLICITAÇÃO'}
        </button>
      </form>
    </div>
  );
}
