import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export function OperatorKYCForm() {
  const { user } = useAuth();
  
  // Controle de Etapa (Wizard)
  const [step, setStep] = useState(1);
  
  // Etapa 1: Dados Pessoais
  const [fullName, setFullName] = useState('');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  
  // Etapa 2: Endereço
  const [cep, setCep] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [street, setStreet] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');

  // Etapa 3: Financeiro
  const [pixKeyType, setPixKeyType] = useState('cpf');
  const [pixKey, setPixKey] = useState('');
  
  // Status Local
  const [role, setRole] = useState('user');
  const [kycStatus, setKycStatus] = useState('pending');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);

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

  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 8) val = val.slice(0, 8);
    
    // Mascara visual de CEP 00000-000
    if (val.length > 5) {
      val = val.slice(0, 5) + '-' + val.slice(5);
    }
    setCep(val);

    const numericCep = val.replace(/\D/g, '');
    if (numericCep.length === 8) {
      setLoadingCep(true);
      setMessage('RASTREANDO COORDENADAS DO CEP... 🛰️');
      setIsError(false);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${numericCep}/json/`);
        const data = await res.json();
        if (data.erro) {
            setMessage('CEP NÃO ENCONTRADO NO RADAR. 🛠️');
            setIsError(true);
        } else {
            setStreet(data.logradouro || '');
            setNeighborhood(data.bairro || '');
            setCity(data.localidade || '');
            setState(data.uf || '');
            setMessage('ENDEREÇO TRAVADO NO RADAR. ✅');
            setTimeout(() => setMessage(''), 3000);
        }
      } catch (err) {
        console.error("ViaCEP Error", err);
        setMessage('ERRO AO BUSCAR CEP. 🛠️');
      } finally {
        setLoadingCep(false);
      }
    }
  };

  const handleBirthDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 8) val = val.slice(0, 8);
    
    // Mascara visual de Data DD/MM/AAAA
    if (val.length >= 5) {
      val = val.slice(0, 2) + '/' + val.slice(2, 4) + '/' + val.slice(4);
    } else if (val.length >= 3) {
      val = val.slice(0, 2) + '/' + val.slice(2);
    }
    setBirthDate(val);
  };

  const handleNext = () => setStep(prev => Math.min(prev + 1, 3));
  const handlePrev = () => setStep(prev => Math.max(prev - 1, 1));

  const handleSave = async () => {
    if (!user) return;
    
    // Validação Tática Estrita
    if (!fullName) { setIsError(true); setMessage('ERRO: PREENCHA SEU NOME COMPLETO. 🛠️'); setStep(1); return; }
    if (!email) { setIsError(true); setMessage('ERRO: PREENCHA SEU E-MAIL. 🛠️'); setStep(1); return; }
    if (!cpfCnpj) { setIsError(true); setMessage('ERRO: PREENCHA SEU CPF OU CNPJ. 🛠️'); setStep(1); return; }
    if (!birthDate) { setIsError(true); setMessage('ERRO: PREENCHA SUA DATA DE NASCIMENTO. 🛠️'); setStep(1); return; }
    if (!phone) { setIsError(true); setMessage('ERRO: PREENCHA SEU CELULAR. 🛠️'); setStep(1); return; }
    if (!cep) { setIsError(true); setMessage('ERRO: PREENCHA SEU CEP. 🛠️'); setStep(2); return; }
    if (!number) { setIsError(true); setMessage('ERRO: PREENCHA O NÚMERO DO ENDEREÇO. 🛠️'); setStep(2); return; }
    if (!pixKey) { setIsError(true); setMessage('ERRO: PREENCHA SUA CHAVE PIX. 🛠️'); setStep(3); return; }

    setSaving(true);
    setIsError(false);
    setMessage('ENVIANDO DADOS PARA VERIFICAÇÃO...');
    
    try {
      // 1. Atualiza o banco de dados (Supabase) com todos os campos novos
      const { error } = await supabase
        .from('profiles')
        .update({ 
          full_name: fullName,
          cpf_cnpj: cpfCnpj,
          pix_key_type: pixKeyType,
          pix_key: pixKey,
          phone: phone,
          cep: cep,
          city: city,
          street: street,
          neighborhood: neighborhood,
          address_number: number,
          complement: complement
        })
        .eq('id', user.id);

      if (error) throw error;
      
      // Busca a Sessao atual na mao
      const { data: { session } } = await supabase.auth.getSession();
      const userToken = session?.access_token || 'TEST_BYPASS';

      // Bypass do Bug do Supabase-js Invoke: Usar Fetch nativo
      const asaasRes = await fetch('https://seewdqetyolfmqsiyban.supabase.co/functions/v1/asaas-create-subaccount', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({
          fullName, email, cpfCnpj, phone, cep, city, street, neighborhood, addressNumber: number, complement, state, birthDate
        })
      });

      const rawText = await asaasRes.text();
      let asaasData: any = {};
      try {
        asaasData = JSON.parse(rawText);
      } catch (e) {
        throw new Error(`Erro Fatal da Nuvem (HTTP ${asaasRes.status}): ${rawText.substring(0, 100)}`);
      }

      if (asaasData.error || !asaasRes.ok) {
        throw new Error(asaasData.error || asaasData.message || `Erro do Gateway: ${asaasRes.statusText}`);
      }

      // Sucesso total
      setIsError(false);
      setMessage('SUBCONTA VERIFICADA E CRIADA COM SUCESSO! 🎖️');
      
      // Atualiza status na tela
      setKycStatus('approved');

    } catch (err: any) {
      setIsError(true);
      setMessage(`ERRO: ${err.message || 'FALHA DESCONHECIDA'} 🛠️`);
      console.error('Save KYC Error:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-surface/20 border border-white/5 p-6 md:p-8 relative overflow-hidden">
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
      
      <p className="text-[10px] md:text-[11px] text-slate-400 font-mono mb-6 uppercase leading-relaxed">
        Complete seu cadastro para habilitar o recebimento direto na sua conta.
      </p>

      {/* Indicador de Progresso tático */}
      <div className="flex gap-2 mb-8">
        <div className={`h-1 flex-1 transition-all duration-300 ${step >= 1 ? 'bg-primary' : 'bg-white/10'}`} />
        <div className={`h-1 flex-1 transition-all duration-300 ${step >= 2 ? 'bg-primary' : 'bg-white/10'}`} />
        <div className={`h-1 flex-1 transition-all duration-300 ${step >= 3 ? 'bg-primary' : 'bg-white/10'}`} />
      </div>

      <div className="space-y-4">
        {step === 1 && (
          <div className="space-y-4 animate-[fadeIn_0.3s_ease-out]">
            <h4 className="text-[10px] text-white font-black uppercase tracking-widest mb-4 border-b border-white/5 pb-2">1. Dados Pessoais</h4>
            <div>
              <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest block mb-1">Nome Completo (Igual ao Documento)</label>
              <input 
                type="text" 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={kycStatus === 'approved'}
                placeholder="Informe seu nome completo"
                className="w-full bg-background-dark/50 border border-white/10 p-3 text-[11px] font-mono text-white outline-none focus:border-primary transition-colors disabled:opacity-50"
              />
            </div>

            <div>
              <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest block mb-1">E-mail Operacional</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={kycStatus === 'approved'}
                className="w-full bg-background-dark/50 border border-white/10 p-3 text-[11px] font-mono text-white outline-none focus:border-primary transition-colors disabled:opacity-50"
              />
            </div>

            <div>
              <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest block mb-1">CPF ou CNPJ</label>
              <input 
                type="text" 
                value={cpfCnpj}
                onChange={(e) => setCpfCnpj(e.target.value)}
                disabled={kycStatus === 'approved'}
                className="w-full bg-background-dark/50 border border-white/10 p-3 text-[11px] font-mono text-white outline-none focus:border-primary transition-colors disabled:opacity-50"
              />
            </div>

            <div>
              <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest block mb-1">Data de Nascimento</label>
              <input 
                type="text" 
                value={birthDate}
                onChange={handleBirthDateChange}
                disabled={kycStatus === 'approved'}
                placeholder="DD/MM/AAAA"
                className="w-full bg-background-dark/50 border border-white/10 p-3 text-[11px] font-mono text-white outline-none focus:border-primary transition-colors disabled:opacity-50"
              />
            </div>

            <div>
              <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest block mb-1">Celular</label>
              <input 
                type="text" 
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={kycStatus === 'approved'}
                placeholder="(00) 00000-0000"
                className="w-full bg-background-dark/50 border border-white/10 p-3 text-[11px] font-mono text-white outline-none focus:border-primary transition-colors disabled:opacity-50"
              />
              <span className="text-[8px] text-slate-500 mt-1 block">Necessário para ativação e segurança da conta.</span>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-[fadeIn_0.3s_ease-out]">
            <h4 className="text-[10px] text-white font-black uppercase tracking-widest mb-4 border-b border-white/5 pb-2">2. Endereço</h4>
            
            <div>
              <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest block mb-1">
                CEP {loadingCep && <span className="text-primary animate-pulse ml-2">CARREGANDO...</span>}
              </label>
              <input 
                type="text" 
                value={cep}
                onChange={handleCepChange}
                disabled={kycStatus === 'approved' || loadingCep}
                placeholder="00000-000"
                className="w-full bg-background-dark/50 border border-white/10 p-3 text-[11px] font-mono text-white outline-none focus:border-primary transition-colors disabled:opacity-50"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest block mb-1">Cidade</label>
                <input 
                  type="text" 
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  disabled={kycStatus === 'approved'}
                  className="w-full bg-background-dark/50 border border-white/10 p-3 text-[11px] font-mono text-white outline-none focus:border-primary transition-colors disabled:opacity-50"
                />
              </div>
              <div>
                <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest block mb-1">Estado</label>
                <input 
                  type="text" 
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  disabled={kycStatus === 'approved'}
                  maxLength={2}
                  placeholder="UF"
                  className="w-full bg-background-dark/50 border border-white/10 p-3 text-[11px] font-mono text-white outline-none focus:border-primary transition-colors disabled:opacity-50 text-center uppercase"
                />
              </div>
            </div>

            <div>
              <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest block mb-1">Rua</label>
              <input 
                type="text" 
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                disabled={kycStatus === 'approved'}
                className="w-full bg-background-dark/50 border border-white/10 p-3 text-[11px] font-mono text-white outline-none focus:border-primary transition-colors disabled:opacity-50"
              />
            </div>

            <div>
              <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest block mb-1">Bairro</label>
              <input 
                type="text" 
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                disabled={kycStatus === 'approved'}
                className="w-full bg-background-dark/50 border border-white/10 p-3 text-[11px] font-mono text-white outline-none focus:border-primary transition-colors disabled:opacity-50"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest block mb-1">Número</label>
                <input 
                  type="text" 
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  disabled={kycStatus === 'approved'}
                  className="w-full bg-background-dark/50 border border-white/10 p-3 text-[11px] font-mono text-white outline-none focus:border-primary transition-colors disabled:opacity-50"
                />
              </div>
              <div>
                <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest block mb-1">Complemento</label>
                <input 
                  type="text" 
                  value={complement}
                  onChange={(e) => setComplement(e.target.value)}
                  disabled={kycStatus === 'approved'}
                  placeholder="Ex: Apto 00"
                  className="w-full bg-background-dark/50 border border-white/10 p-3 text-[11px] font-mono text-white outline-none focus:border-primary transition-colors disabled:opacity-50"
                />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 animate-[fadeIn_0.3s_ease-out]">
            <h4 className="text-[10px] text-white font-black uppercase tracking-widest mb-4 border-b border-white/5 pb-2">3. Dados Bancários</h4>
            <div>
              <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest block mb-1">Tipo da Chave PIX</label>
              <select 
                value={pixKeyType}
                onChange={(e) => setPixKeyType(e.target.value)}
                disabled={kycStatus === 'approved'}
                className="w-full bg-background-dark/50 border border-white/10 p-3 text-[11px] font-mono text-white outline-none focus:border-primary transition-colors disabled:opacity-50"
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
                className="w-full bg-background-dark/50 border border-white/10 p-3 text-[11px] font-mono text-white outline-none focus:border-primary transition-colors disabled:opacity-50"
              />
            </div>
          </div>
        )}

        <div className="pt-6 flex items-center justify-between gap-4 border-t border-white/5 mt-8">
            <div className="hidden md:block">
                <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest block mb-1">Nível de Acesso</label>
                <span className="text-[10px] text-primary font-black uppercase tracking-[0.2em] italic">
                  {role === 'admin' 
                    ? 'Task Force' 
                    : kycStatus === 'approved' 
                      ? 'Spetsnaz' 
                      : 'Ranger'}
                </span>
            </div>
            
            <div className="flex gap-2 w-full md:w-auto">
              {step > 1 && (
                <button 
                  onClick={handlePrev}
                  className="bg-white/5 hover:bg-white/10 text-white font-black py-4 px-6 text-[9px] uppercase tracking-[0.2em] transition-all flex-1 md:flex-none"
                >
                  VOLTAR
                </button>
              )}
              
              {step < 3 ? (
                <button 
                  onClick={handleNext}
                  className="bg-primary hover:bg-white text-background-dark font-black py-4 px-8 text-[9px] uppercase tracking-[0.2em] transition-all w-full md:w-auto"
                >
                  AVANÇAR
                </button>
              ) : (
                kycStatus !== 'approved' && (
                  <button 
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-primary hover:bg-white text-background-dark font-black py-4 px-8 text-[9px] uppercase tracking-[0.2em] transition-all disabled:opacity-50 w-full md:w-auto"
                  >
                    {saving ? 'PROCESSANDO...' : 'ENVIAR DADOS'}
                  </button>
                )
              )}
            </div>
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
