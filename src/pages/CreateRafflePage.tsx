import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SEO } from '../components/SEO';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function CreateRafflePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    ticket_price: '',
    total_tickets: '',
    draw_date: '',
    rules: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert('IDENTIDADE NÃO VERIFICADA: ACESSO NEGADO.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('raffles').insert([
        {
          creator_id: user.id,
          title: formData.title,
          description: formData.description,
          ticket_price: parseFloat(formData.ticket_price),
          total_tickets: parseInt(formData.total_tickets),
          draw_date: new Date(formData.draw_date).toISOString(),
          rules: formData.rules,
          status: 'ativo'
        }
      ]);

      if (error) throw error;
      
      alert('OPERACIONAL: DROP PUBLICADO COM SUCESSO.');
      navigate('/drop');
    } catch (err: any) {
      alert(`FALHA NO PROTOCOLO: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-20 bg-background-dark pt-12">
      <SEO title="Configuração de Drop | Perfection Airsoft" />

      <div className="max-w-3xl mx-auto px-6">
        {/* Header HUD */}
        <div className="mb-12 border-l-4 border-primary pl-8 py-4 bg-surface/10">
            <span className="text-primary font-black uppercase tracking-[0.4em] text-[10px] block mb-2">NEW MISSION: SETUP DROP</span>
            <h1 className="text-4xl font-black text-white uppercase tracking-tighter">CONFIGURAÇÃO DE DROP</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
            <div className="bg-surface/20 border border-white/5 p-8 space-y-8">
                {/* Title */}
                <div>
                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest block mb-3 italic">TITLE / DESIGNATION</label>
                    <input 
                        type="text" 
                        required
                        placeholder="EX: RIFLE M4A1 GBB FULL METAL"
                        className="w-full bg-black/40 border border-white/10 p-4 text-white font-mono text-sm focus:border-primary outline-none transition-all placeholder:opacity-20"
                        value={formData.title}
                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                    />
                </div>

                {/* Description */}
                <div>
                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest block mb-3 italic">INTEL BRIEFING (DESCRIPTION)</label>
                    <textarea 
                        required
                        rows={4}
                        placeholder="DESCRIÇÃO TÉCNICA E DETALHES DO EQUIPAMENTO..."
                        className="w-full bg-black/40 border border-white/10 p-4 text-white font-mono text-sm focus:border-primary outline-none transition-all placeholder:opacity-20 resize-none"
                        value={formData.description}
                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                    />
                </div>

                {/* Pricing & Units */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest block mb-3 italic">UNIT VALUE (TICKET PRICE)</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-black text-xs">R$</span>
                            <input 
                                type="number" 
                                required
                                step="0.01"
                                placeholder="0.00"
                                className="w-full bg-black/40 border border-white/10 p-4 pl-12 text-white font-mono text-sm focus:border-primary outline-none transition-all"
                                value={formData.ticket_price}
                                onChange={e => setFormData({ ...formData, ticket_price: e.target.value })}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest block mb-3 italic">TOTAL UNITS (TICKETS)</label>
                        <input 
                            type="number" 
                            required
                            placeholder="MAX: 1000"
                            className="w-full bg-black/40 border border-white/10 p-4 text-white font-mono text-sm focus:border-primary outline-none transition-all px-12"
                            value={formData.total_tickets}
                            onChange={e => setFormData({ ...formData, total_tickets: e.target.value })}
                        />
                    </div>
                </div>

                {/* Date & Rules */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div>
                        <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest block mb-3 italic">DRAW WINDOW (DRAW DATE)</label>
                        <input 
                            type="datetime-local" 
                            required
                            className="w-full bg-black/40 border border-white/10 p-4 text-white font-mono text-sm focus:border-primary outline-none transition-all"
                            value={formData.draw_date}
                            onChange={e => setFormData({ ...formData, draw_date: e.target.value })}
                        />
                    </div>
                    <div>
                         <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest block mb-3 italic">REGULAMENTO (REGRAS)</label>
                         <input 
                            type="text" 
                            placeholder="EX: DATA DO SORTEIO PODE VARIAR..."
                            className="w-full bg-black/40 border border-white/10 p-4 text-white font-mono text-sm focus:border-primary outline-none transition-all placeholder:opacity-20"
                            value={formData.rules}
                            onChange={e => setFormData({ ...formData, rules: e.target.value })}
                        />
                    </div>
                </div>
            </div>

            {/* Submit HUD */}
            <div className="bg-surface/40 p-10 border border-white/5 flex flex-col items-center text-center gap-8">
                <span className="text-[9px] text-slate-600 font-black uppercase tracking-widest leading-relaxed">
                   AO PUBLICAR, VOCÊ CONFIRMA A AUTENTICIDADE DO PRÊMIO E A RESPONSABILIDADE<br />
                   SOBRE O ENVIO DO EQUIPAMENTO AO VENCEDOR.
                </span>
                
                <button 
                   type="submit"
                   disabled={loading}
                   className="bg-primary text-background-dark font-black py-5 px-16 text-[11px] uppercase tracking-[0.4em] hover:bg-white transition-all shadow-[0_0_30px_rgba(255,193,7,0.2)] disabled:opacity-50"
                >
                   {loading ? 'UPLOADING DATA...' : 'INITIALIZE DROP PROTOCOL'}
                </button>
            </div>
        </form>
      </div>
    </div>
  );
}
