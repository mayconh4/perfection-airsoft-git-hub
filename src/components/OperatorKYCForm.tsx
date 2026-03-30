import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export function OperatorKYCForm() {
  const { user } = useAuth();
  
  // Dados do Asaas (KYC)
  const [fullName, setFullName] = useState('');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [email, setEmail] = useState('');
  const [pixKeyType, setPixKeyType] = useState('cpf');
  const [pixKey, setPixKey] = useState('');
  
  // Status Local
  const [role, setRole] = useState('user');
  const [kycStatus, setKycStatus] = useState('pending');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    if (user) {
      setEmail(user.email || '');
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, cpf_cnpj, pix_key_type, pix_key, role, kyc_status, asaas_wallet_id')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Erro ao buscar perfil:', error);
        return;
      }

      if (data) {
        setFullName(data.full_name || '');
        setCpfCnpj(data.cpf_cnpj || '');
        setPixKeyType(data.pix_key_type || 'cpf');
        setPixKey(data.pix_key || '');
        setRole(data.role || 'user');
        setKycStatus(data.asaas_wallet_id ? 'approved' : (data.kyc_status || 'pending'));
      }
    } catch (err: any) {
      console.error('Falha na requisição de perfil:', err);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    
    // Validação Básica
    if (!fullName || !cpfCnpj || !pixKey) {
      setIsError(true);
      setMessage('PREENCHA TODOS OS CAMPOS OBRIGATÓRIOS. 🛠️');
      return;
    }

    setSaving(true);
    setIsError(false);
    setMessage('ENVIANDO DADOS PARA VERIFICAÇÃO...');
    
    try {
      // 1. Atualiza o banco de dados (Supabase)
      const { error } = await supabase
        .from('profiles')
        .update({ 
          full_name: fullName,
          cpf_cnpj: cpfCnpj,
          pix_key_type: pixKeyType,
          pix_key: pixKey
        })
        .eq('id', user.id);

      if (error) throw error;
      
      // 2. Idealmente, chamaríamos a Edge Function `asaas-create-subaccount` aqui.
      // Como estamos construindo a UI primeiro, vamos simular a ativação.
      
      setIsError(false);
      setMessage('DADOS ENVIADOS COM SUCESSO! AGUARDANDO CRIAÇÃO DA SUBCONTA. 🎖️');
    } catch (err: any) {
      setIsError(true);
      setMessage(`ERRO: ${err.message || 'FALHA DESCONHECIDA'} 🛠️`);
      console.error('Save KYC Error:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-surface/20 border border-white/5 p-8 relative overflow-hidden">
      {/* Overlay para contas aprovadas */}
      {kycStatus === 'approved' && (
        <div className="absolute top-0 right-0 bg-green-500/20 text-green-400 text-[10px] font-black uppercase tracking-widest px-4 py-1 border-b border-l border-green-500/30">
          CONTA VERIFICADA
        </div>
      )}

      <div className="flex items-center gap-3 mb-6">
        <span className="material-symbols-outlined text-primary text-xl">admin_panel_settings</span>
        <h3 className="text-[11px] font-black text-white uppercase tracking-[0.3em]">
          Verificação de Operador
        </h3>
      </div>
      
      <p className="text-[11px] text-slate-400 font-mono mb-6 uppercase leading-relaxed">
        Para receber pagamentos diretamente em sua conta, precisamos verificar sua identidade.
      </p>

      <div className="space-y-4">
        <div>
          <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest block mb-1">Nome Completo / Razão Social</label>
          <input 
            type="text" 
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={kycStatus === 'approved'}
            className="w-full bg-background-dark/50 border border-white/10 p-3 text-[11px] font-mono text-white outline-none disabled:opacity-50"
          />
        </div>

        <div>
          <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest block mb-1">E-mail Operacional</label>
          <input 
            type="email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={kycStatus === 'approved'}
            className="w-full bg-background-dark/50 border border-white/10 p-3 text-[11px] font-mono text-white outline-none disabled:opacity-50"
          />
        </div>

        <div>
          <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest block mb-1">CPF ou CNPJ</label>
          <input 
            type="text" 
            value={cpfCnpj}
            onChange={(e) => setCpfCnpj(e.target.value)}
            disabled={kycStatus === 'approved'}
            className="w-full bg-background-dark/50 border border-white/10 p-3 text-[11px] font-mono text-white outline-none disabled:opacity-50"
          />
        </div>

        <div>
          <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest block mb-1">Tipo da Chave PIX</label>
          <select 
            value={pixKeyType}
            onChange={(e) => setPixKeyType(e.target.value)}
            disabled={kycStatus === 'approved'}
            className="w-full bg-background-dark/50 border border-white/10 p-3 text-[11px] font-mono text-white outline-none disabled:opacity-50"
          >
            <option value="cpf">CPF</option>
            <option value="cnpj">CNPJ</option>
            <option value="email">E-mail</option>
            <option value="phone">Celular</option>
            <option value="random">Chave Aleatória</option>
          </select>
        </div>

        <div>
          <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest block mb-1">Chave PIX de Recebimento</label>
          <input 
            type="text" 
            value={pixKey}
            onChange={(e) => setPixKey(e.target.value)}
            disabled={kycStatus === 'approved'}
            className="w-full bg-background-dark/50 border border-white/10 p-3 text-[11px] font-mono text-white outline-none disabled:opacity-50"
          />
        </div>

        <div className="pt-4 flex items-center justify-between gap-4 border-t border-white/5 mt-4">
            <div>
                <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest block mb-1">Nível de Acesso</label>
                <span className="text-[10px] text-primary font-black uppercase tracking-[0.2em] italic">
                  {role === 'admin' 
                    ? 'Task Force' 
                    : kycStatus === 'approved' 
                      ? 'Spetsnaz' 
                      : 'Ranger'}
                </span>
            </div>
            
            {kycStatus !== 'approved' && (
              <button 
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-primary hover:bg-white text-background-dark font-black py-4 px-8 text-[9px] uppercase tracking-[0.2em] transition-all disabled:opacity-50"
              >
                  {saving ? 'PROCESSANDO...' : 'ENVIAR PARA VERIFICAÇÃO'}
              </button>
            )}
        </div>

        {message && (
          <p className={`text-[10px] text-center font-black uppercase tracking-widest animate-pulse mt-4 ${isError ? 'text-red-500' : 'text-primary'}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
