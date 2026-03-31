import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { SEO } from '../components/SEO';

interface PendingProfile {
  id: string;
  full_name: string;
  cpf_cnpj: string;
  kyc_status: string;
  created_at: string;
  phone?: string;
  cep?: string;
  city?: string;
  state?: string;
  street?: string;
  neighborhood?: string;
  address_number?: string;
  complement?: string;
  pix_key?: string;
  pix_key_type?: string;
  asaas_wallet_id?: string;
  asaas_api_key?: string;
}

export default function AdminModeration() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [pendingProfiles, setPendingProfiles] = useState<PendingProfile[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    checkAdmin();
  }, [user]);
// ... (omitting middle part to keep focus on replacement)
// I will use multi_replace for clarity instead of one big chunk with // ...

  const checkAdmin = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (error || data?.role !== 'admin') {
      console.error('Acesso Negado: Usuário não é administrador.');
      navigate('/dashboard');
      return;
    }

    setIsAdmin(true);
    fetchPendingProfiles();
  };

  const fetchPendingProfiles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .in('kyc_status', ['waiting_approval', 'pending'])
      .order('created_at', { ascending: true });

    if (!error) {
      setPendingProfiles(data || []);
    }
    setLoading(false);
  };

  const handleApprove = async (targetId: string) => {
    setProcessingId(targetId);
    const { error } = await supabase
      .from('profiles')
      .update({ kyc_status: 'approved' })
      .eq('id', targetId);

    if (error) {
      alert('Erro ao aprovar: ' + error.message);
    } else {
      setPendingProfiles(prev => prev.filter(p => p.id !== targetId));
    }
    setProcessingId(null);
  };

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-black text-white p-4 lg:p-8 pt-24">
      <SEO title="Central de Moderação | Perfection Airsoft" />
      
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 border-l-4 border-primary pl-4">
          <h1 className="text-3xl font-black italic tracking-tighter uppercase">
            Central de <span className="text-primary">Moderação</span>
          </h1>
          <p className="text-gray-400 text-sm mt-1 uppercase tracking-widest">
            Protocolo de Aprovação de Operadores (KYC)
          </p>
        </header>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : pendingProfiles.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-lg p-12 text-center">
            <p className="text-gray-500 italic">NENHUM OPERADOR AGUARDANDO APROVAÇÃO NO MOMENTO.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {pendingProfiles.map((p) => (
              <div key={p.id} className="bg-white/5 border border-white/10 rounded-lg overflow-hidden transition-all hover:border-primary/30">
                <div className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></span>
                      <h3 className="text-xl font-bold uppercase tracking-tight">{p.full_name || 'NOME NÃO INFORMADO'}</h3>
                    </div>
                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-400">
                      <p><span className="text-gray-600 uppercase text-[10px] font-black mr-2">ID:</span> {p.id.slice(0, 8)}...</p>
                      <p><span className="text-gray-600 uppercase text-[10px] font-black mr-2">DOC:</span> {p.cpf_cnpj || '---'}</p>
                      <p><span className="text-gray-600 uppercase text-[10px] font-black mr-2">DATA:</span> {new Date(p.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="flex gap-3 w-full md:w-auto">
                    <button
                      onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                      className="flex-1 md:flex-none py-3 px-6 bg-white/5 border border-white/10 text-white font-bold uppercase text-[10px] tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-sm">
                        {expandedId === p.id ? 'expand_less' : 'expand_more'}
                      </span>
                      {expandedId === p.id ? 'OCULTAR' : 'VER MAIS'}
                    </button>
                    <button
                      onClick={() => handleApprove(p.id)}
                      disabled={processingId === p.id}
                      className="flex-1 md:flex-none py-3 px-8 bg-primary text-black font-black uppercase italic hover:bg-yellow-400 transition-colors disabled:opacity-50 text-[11px] tracking-tighter"
                    >
                      {processingId === p.id ? 'PROCESSANDO...' : 'APROVAR OPERADOR'}
                    </button>
                  </div>
                </div>

                {/* Detalhes Expandidos (Modo Tático) */}
                {expandedId === p.id && (
                  <div className="px-6 pb-6 pt-2 border-t border-white/5 bg-white/[0.02] animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      {/* Contato */}
                      <div>
                        <h4 className="text-primary font-black text-[10px] uppercase tracking-widest mb-3 border-b border-primary/20 pb-1">COMUNICAÇÃO</h4>
                        <div className="space-y-2 text-sm">
                          <p><span className="text-gray-600">TEL:</span> {p.phone || 'NÃO INFORMADO'}</p>
                        </div>
                      </div>

                      {/* Endereço */}
                      <div className="md:col-span-2">
                        <h4 className="text-primary font-black text-[10px] uppercase tracking-widest mb-3 border-b border-primary/20 pb-1">LOCALIZAÇÃO / LOGÍSTICA</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <p><span className="text-gray-600">CEP:</span> {p.cep || '---'}</p>
                            <p><span className="text-gray-600">CIDADE/UF:</span> {p.city || '---'} - {p.state || '---'}</p>
                          </div>
                          <div>
                            <p><span className="text-gray-600">RUA:</span> {p.street || '---'}, {p.address_number || 'S/N'}</p>
                            <p><span className="text-gray-600">BAIRRO:</span> {p.neighborhood || '---'}</p>
                            {p.complement && <p><span className="text-gray-600">COMP:</span> {p.complement}</p>}
                          </div>
                        </div>
                      </div>

                      {/* Financeiro */}
                      <div className="md:col-span-3">
                        <h4 className="text-primary font-black text-[10px] uppercase tracking-widest mb-3 border-b border-primary/20 pb-1">INTELIGÊNCIA FINANCEIRA (PIX)</h4>
                        <div className="bg-black/40 p-4 border border-white/5 rounded flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div>
                            <p className="text-[10px] text-gray-500 uppercase font-black">CHAVE PIX ({p.pix_key_type})</p>
                            <p className="font-mono text-primary text-lg">{p.pix_key || 'NÃO CONFIGURADA'}</p>
                          </div>
                          <div className="text-[10px] text-gray-600 uppercase font-bold italic">
                            VERIFIQUE OS DADOS ANTES DE APROVAR O ACESSO AO PIX SPLIT.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
