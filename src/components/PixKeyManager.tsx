import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export function PixKeyManager() {
  const { user } = useAuth();
  const [pixKey, setPixKey] = useState('');
  const [role, setRole] = useState('user');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('pix_key, role')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Erro ao buscar perfil:', error);
        return;
      }

      if (data) {
        setPixKey(data.pix_key || '');
        setRole(data.role || 'user');
      }
    } catch (err: any) {
      console.error('Falha na requisição de perfil:', err);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setMessage('');
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ pix_key: pixKey })
        .eq('id', user.id);

      if (error) throw error;
      setMessage('CHAVE PIX SALVA COM SUCESSO! 🎖️');
    } catch (err: any) {
      setMessage('ERRO AO SALVAR CHAVE. 🛠️');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-surface/20 border border-white/5 p-8">
      <div className="flex items-center gap-3 mb-6">
        <span className="material-symbols-outlined text-primary text-xl">account_balance_wallet</span>
        <h3 className="text-[11px] font-black text-white uppercase tracking-[0.3em]">Minha Chave Pix Operacional</h3>
      </div>

      <div className="space-y-6">
        <div>
          <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest block mb-2">Sua Chave para Recebimento</label>
          <input 
            type="text" 
            value={pixKey}
            onChange={(e) => setPixKey(e.target.value)}
            placeholder="CPF, E-mail ou Chave Aleatória"
            className="w-full bg-background-dark/50 border border-white/10 p-4 text-[11px] font-mono text-white placeholder:text-white/10 focus:border-primary/50 outline-none transition-all"
          />
        </div>

        <div className="flex items-center justify-between gap-4">
            <div>
                <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest block mb-1">Status de Combate</label>
                <span className="text-[10px] text-primary font-black uppercase tracking-[0.2em] italic">{role}</span>
            </div>
            
            <button 
                onClick={handleSave}
                disabled={saving}
                className="bg-primary hover:bg-white text-background-dark font-black py-4 px-6 text-[9px] uppercase tracking-[0.2em] transition-all disabled:opacity-50"
            >
                {saving ? 'SALVANDO...' : 'ATUALIZAR CHAVE'}
            </button>
        </div>

        {message && (
          <p className="text-[9px] text-center font-black text-primary/80 uppercase tracking-widest animate-pulse mt-4">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
