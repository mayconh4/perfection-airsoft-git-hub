import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export function AdminMessages() {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMessages();
  }, []);

  async function fetchMessages() {
    const { data } = await supabase
      .from('contact_messages')
      .select('*')
      .order('created_at', { ascending: false });
    setMessages(data || []);
    setLoading(false);
  }

  const deleteMessage = async (id: string) => {
    if (!confirm('Eliminar comunicação do rádio?')) return;
    await supabase.from('contact_messages').delete().eq('id', id);
    fetchMessages();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Rádio (Mensagens)</h2>
        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Inbox de comunicações externas</p>
      </div>

      {loading ? (
        <div className="text-center py-20 animate-pulse text-primary font-bold uppercase tracking-widest">Sintonizando Frequência...</div>
      ) : (
        <div className="space-y-4">
          {messages.map(msg => (
            <div key={msg.id} className="bg-surface border border-border-tactical p-6 hover:border-primary/50 transition-all flex flex-col md:flex-row gap-6 group">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                   <div className="px-2 py-1 bg-primary text-background-dark text-[9px] font-black uppercase tracking-widest">{msg.subject}</div>
                   <span className="text-slate-600 text-[10px] uppercase font-bold">{new Date(msg.created_at).toLocaleString()}</span>
                </div>
                <h3 className="text-white font-bold uppercase text-sm mb-1">{msg.name}</h3>
                <p className="text-primary text-[10px] font-bold uppercase mb-4 tracking-wider">{msg.email}</p>
                <div className="bg-background-dark p-4 border-l-2 border-primary/30 text-slate-300 text-xs leading-relaxed italic">
                  "{msg.message}"
                </div>
              </div>
              <div className="flex flex-row md:flex-col justify-end gap-2 shrink-0">
                <a href={`mailto:${msg.email}`} className="bg-white/5 hover:bg-white/10 text-white p-3 border border-border-tactical transition-all group-hover:border-primary/30">
                  <span className="material-symbols-outlined text-lg">reply</span>
                </a>
                <button onClick={() => deleteMessage(msg.id)} className="bg-white/5 hover:bg-red-500/10 text-slate-500 hover:text-red-500 p-3 border border-border-tactical hover:border-red-500/30 transition-all">
                  <span className="material-symbols-outlined text-lg">delete</span>
                </button>
              </div>
            </div>
          ))}
          {!messages.length && (
             <div className="bg-surface border border-border-tactical p-20 text-center">
                <span className="material-symbols-outlined text-slate-700 text-6xl mb-4 block">radio</span>
                <p className="text-slate-600 uppercase tracking-widest font-black">Rádio Silencioso: Nenhuma mensagem recebida.</p>
             </div>
          )}
        </div>
      )}
    </div>
  );
}
