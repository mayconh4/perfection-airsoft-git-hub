import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { SEO } from '../components/SEO';

export function ContactPage() {
  const { user } = useAuth();
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ 
    name: user?.user_metadata?.full_name || '', 
    email: user?.email || '', 
    subject: 'Briefing de Produto', 
    message: '' 
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      await supabase.from('contact_messages').insert({
        user_id: user?.id || null,
        name: form.name,
        email: form.email,
        subject: form.subject,
        message: form.message,
      });
      setSent(true);
    } catch (error) {
      console.error('Falha na transmissão:', error);
    } finally {
      setSending(false);
    }
  };

  const triageOptions = [
    "Briefing de Produto",
    "Extração de Pedido (Status)",
    "Problema com Equipamento (Garantia/Troca)",
    "Fardamento e Tamanhos",
    "Parcerias e Campos de Batalha",
    "Outros Protocolos"
  ];

  return (
    <div className="min-h-screen pt-32 pb-20 bg-background-dark">
      <SEO 
        title="Fale com o QG | Perfection Airsoft" 
        description="Canal de comunicação direta com o centro de comando Perfection Airsoft."
      />

      <div className="container mx-auto px-6 max-w-6xl">
        <header className="mb-16">
          <div className="flex items-center gap-4 mb-4">
            <span className="h-px w-12 bg-primary"></span>
            <span className="text-primary font-black uppercase tracking-[0.4em] text-xs">Canal de Comunicação Rádio</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter mb-4">
            Fale com o <span className="text-primary">QG</span>
          </h1>
          <p className="text-slate-500 text-xs uppercase tracking-widest font-bold">Transmissão Criptografada Direta</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Form Side */}
          <div className="lg:col-span-7 bg-surface/30 border border-white/5 p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <span className="material-symbols-outlined text-6xl text-primary">sensors</span>
            </div>

            {sent ? (
              <div className="text-center py-20 animate-in fade-in zoom-in duration-500">
                <div className="size-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-primary/20">
                  <span className="material-symbols-outlined text-4xl text-primary animate-pulse">check_circle</span>
                </div>
                <h3 className="text-xl font-black text-white uppercase tracking-widest mb-4">Transmissão Recebida</h3>
                <p className="text-slate-400 text-xs font-mono uppercase tracking-widest mb-8">
                  Sua mensagem foi injetada em nosso sistema. <br /> Aguarde retorno em até 24h úteis.
                </p>
                <button 
                  onClick={() => setSent(false)}
                  className="text-primary text-[10px] font-black uppercase tracking-[0.3em] hover:text-white transition-colors"
                >
                  Enviar Novo Relatório
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">Codinome / Nome</label>
                    <input 
                      name="name" 
                      type="text" 
                      required 
                      value={form.name} 
                      onChange={handleChange}
                      placeholder="Identifique-se"
                      className="w-full bg-background-dark/50 border border-white/10 text-white px-5 py-4 focus:border-primary focus:ring-0 text-xs font-mono tracking-tight transition-all placeholder:text-white/10"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">Canal de E-mail</label>
                    <input 
                      name="email" 
                      type="email" 
                      required 
                      value={form.email} 
                      onChange={handleChange}
                      placeholder="operador@host.com"
                      className="w-full bg-background-dark/50 border border-white/10 text-white px-5 py-4 focus:border-primary focus:ring-0 text-xs font-mono tracking-tight transition-all placeholder:text-white/10"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">Assunto da Missão</label>
                  <select 
                    name="subject" 
                    value={form.subject} 
                    onChange={handleChange}
                    className="w-full bg-background-dark/50 border border-white/10 text-white px-5 py-4 focus:border-primary focus:ring-0 text-xs font-mono tracking-tight transition-all appearance-none cursor-pointer"
                  >
                    {triageOptions.map(opt => (
                      <option key={opt} value={opt} className="bg-background-dark">{opt}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">Mensagem Detalhada</label>
                  <textarea 
                    name="message" 
                    required 
                    rows={6} 
                    value={form.message} 
                    onChange={handleChange}
                    placeholder="Descreva sua solicitação com o máximo de detalhes táticos..."
                    className="w-full bg-background-dark/50 border border-white/10 text-white px-5 py-4 focus:border-primary focus:ring-0 text-xs font-mono tracking-tight transition-all placeholder:text-white/10 resize-none"
                  ></textarea>
                </div>

                <button 
                  type="submit" 
                  disabled={sending}
                  className="w-full bg-primary text-background-dark font-black py-5 uppercase tracking-[0.3em] text-[11px] hover:bg-white transition-all flex items-center justify-center gap-4 disabled:opacity-50 group"
                >
                  {sending ? 'PROCESSANDO TRANSMISSÃO...' : 'ENVIAR RELATÓRIO AO QG'}
                  <span className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">send</span>
                </button>
              </form>
            )}
          </div>

          {/* Info Side */}
          <div className="lg:col-span-5 space-y-8">
            <div className="bg-surface/30 border border-white/5 p-6">
              <h3 className="text-xs font-black text-white uppercase tracking-widest mb-8 flex items-center gap-3">
                <span className="size-2 bg-primary animate-pulse"></span>
                Status Operacional
              </h3>

              <div className="space-y-6">
                {[
                  { icon: 'alternate_email', label: 'E-mail Direto', value: 'contato@perfectionairsoft.com.br' },
                  { icon: 'call', label: 'Linha de Apoio', value: '+55 (11) 4002-8922' },
                  { icon: 'schedule', label: 'Janela de Resposta', value: 'SEG-SEX: 09h às 18h' },
                  { icon: 'location_on', label: 'Base de Operações', value: 'São Paulo, SP - Setor Leste' },
                ].map((info, idx) => (
                  <div key={idx} className="flex gap-4 group cursor-default">
                    <div className="size-10 bg-white/5 flex items-center justify-center rounded-sm shrink-0 border border-white/5 group-hover:border-primary/40 transition-colors">
                      <span className="material-symbols-outlined text-xl text-slate-500 group-hover:text-primary transition-colors">{info.icon}</span>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{info.label}</p>
                      <p className="text-xs text-slate-300 font-mono">{info.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-8 bg-primary/5 border border-primary/20 relative group">
              <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-4">Apoio em Tempo Real</h4>
              <p className="text-[11px] text-slate-400 font-mono leading-relaxed mb-6 uppercase">
                Para situações de urgência crítica ou dúvidas rápidas sobre equipamentos, utilize nosso canal direto via WhatsApp.
              </p>
              <a 
                href="https://wa.me/551140028922" 
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 bg-green-500/10 hover:bg-green-500 text-green-500 hover:text-white border border-green-500/20 py-3 px-6 transition-all font-black text-[10px] uppercase tracking-widest"
              >
                Atendimento via WhatsApp <span className="material-symbols-outlined text-lg">chat</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
