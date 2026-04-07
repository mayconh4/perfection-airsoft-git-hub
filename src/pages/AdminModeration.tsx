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
  city?: string;
  state?: string;
  role_request?: string;
}

interface PendingGunsmith {
  id: string;
  workshop_name: string;
  description: string;
  location_city: string;
  location_state: string;
  specialties: string[];
  created_at: string;
  user_id: string;
}

export default function AdminModeration() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [pendingProfiles, setPendingProfiles] = useState<PendingProfile[]>([]);
  const [pendingGunsmiths, setPendingGunsmiths] = useState<PendingGunsmith[]>([]);
  const [activeTab, setActiveTab] = useState<'kyc' | 'armaria'>('kyc');
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    checkAdmin();
  }, [user]);

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
      navigate('/dashboard');
      return;
    }

    setIsAdmin(true);
    fetchData();
  };

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch KYC/Organizer Requests
    const { data: kycData } = await supabase
      .from('profiles')
      .select('*')
      .or('kyc_status.in.(waiting_approval,pending),role_request.eq.organizer')
      .order('created_at', { ascending: true });

    if (kycData) setPendingProfiles(kycData);

    // Fetch Gunsmith Requests
    const { data: gsData } = await supabase
      .from('gunsmith_profiles')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (gsData) setPendingGunsmiths(gsData);
    
    setLoading(false);
  };

  const handleApproveKYC = async (id: string) => {
    setProcessingId(id);
    const { error } = await supabase.from('profiles').update({ kyc_status: 'approved' }).eq('id', id);
    if (!error) fetchData();
    setProcessingId(null);
  };

  const handleApproveGunsmith = async (id: string) => {
    setProcessingId(id);
    const { error } = await supabase.from('gunsmith_profiles').update({ status: 'approved' }).eq('id', id);
    if (!error) fetchData();
    setProcessingId(null);
  };

  const handleRejectGunsmith = async (id: string) => {
    setProcessingId(id);
    const { error } = await supabase.from('gunsmith_profiles').update({ status: 'rejected' }).eq('id', id);
    if (!error) fetchData();
    setProcessingId(null);
  };

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-black text-white p-4 lg:p-8 pt-24">
      <SEO title="Admin HQ // Moderação Tática" />
      
      <div className="max-w-6xl mx-auto">
        <header className="mb-12">
          <div className="flex items-center gap-3 mb-2">
            <span className="material-symbols-outlined text-primary text-3xl">verified_user</span>
            <h1 className="text-4xl font-black italic tracking-tighter uppercase">HQ <span className="text-primary">CONTROL</span></h1>
          </div>
          <p className="text-white/30 text-[10px] uppercase font-bold tracking-[0.3em]">Protocolo de Segurança e Avaliação Técnica // Perfection Airsoft</p>
        </header>

        {/* TABS TÁTICAS */}
        <div className="flex gap-4 mb-10 border-b border-white/5">
          <button 
            onClick={() => setActiveTab('kyc')}
            className={`px-8 py-4 text-[10px] font-black uppercase tracking-widest transition-all relative ${activeTab === 'kyc' ? 'text-primary' : 'text-white/40 hover:text-white'}`}
          >
            Operadores (KYC)
            {pendingProfiles.length > 0 && <span className="absolute top-2 right-2 bg-primary text-black size-4 rounded-full flex items-center justify-center text-[8px] font-black">{pendingProfiles.length}</span>}
            {activeTab === 'kyc' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary"></div>}
          </button>
          <button 
            onClick={() => setActiveTab('armaria')}
            className={`px-8 py-4 text-[10px] font-black uppercase tracking-widest transition-all relative ${activeTab === 'armaria' ? 'text-primary' : 'text-white/40 hover:text-white'}`}
          >
            Especialistas (Armaria)
            {pendingGunsmiths.length > 0 && <span className="absolute top-2 right-2 bg-primary text-black size-4 rounded-full flex items-center justify-center text-[8px] font-black">{pendingGunsmiths.length}</span>}
            {activeTab === 'armaria' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary"></div>}
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary"></div></div>
        ) : (
          <div className="grid gap-6 animate-fade-in">
            {activeTab === 'kyc' ? (
              pendingProfiles.length === 0 ? (
                <div className="p-12 border border-dashed border-white/5 text-center"><p className="text-xs uppercase text-white/20 italic tracking-widest font-black">Área Limpa. Nenhum Operador pendente.</p></div>
              ) : (
                pendingProfiles.map(p => (
                  <div key={p.id} className="bg-surface/30 border border-white/5 p-6 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex-1">
                      <h3 className="text-sm font-black uppercase tracking-widest text-white mb-2">{p.full_name || 'Codinome Não Informado'}</h3>
                      <div className="flex gap-4 text-[9px] text-white/40 font-black uppercase tracking-widest">
                        <span>DOC: {p.cpf_cnpj || '---'}</span>
                        <span>LOCAL: {p.city || '---'}/{p.state || '--'}</span>
                      </div>
                    </div>
                    <button onClick={() => handleApproveKYC(p.id)} disabled={processingId === p.id} className="bg-white text-black px-6 py-2.5 text-[10px] font-black uppercase tracking-widest hover:bg-primary transition-all">Aprovar Acesso</button>
                  </div>
                ))
              )
            ) : (
              pendingGunsmiths.length === 0 ? (
                <div className="p-12 border border-dashed border-white/5 text-center"><p className="text-xs uppercase text-white/20 italic tracking-widest font-black">Área Limpa. Nenhuma Oficina pendente.</p></div>
              ) : (
                pendingGunsmiths.map(gs => (
                  <div key={gs.id} className="bg-surface/30 border border-white/10 p-8 flex flex-col gap-6 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1 h-0 group-hover:h-full bg-primary transition-all duration-500"></div>
                    <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                      <div className="space-y-4 max-w-2xl">
                        <div>
                          <h3 className="text-xl font-black uppercase tracking-tighter text-white">{gs.workshop_name}</h3>
                          <p className="text-[10px] text-primary font-black uppercase tracking-widest">{gs.location_city}, {gs.location_state}</p>
                        </div>
                        <p className="text-xs text-white/50 leading-relaxed uppercase tracking-widest">{gs.description}</p>
                        <div className="flex flex-wrap gap-2">
                           {gs.specialties?.map(s => (
                             <span key={s} className="px-2 py-0.5 bg-white/5 border border-white/10 text-[8px] font-black uppercase text-white/40 tracking-widest">{s}</span>
                           ))}
                        </div>
                        <p className="text-[8px] text-white/20 font-mono tracking-widest italic pt-2">USER_ID: {gs.user_id}</p>
                      </div>
                      
                      <div className="flex md:flex-col gap-2 w-full md:w-auto">
                        <button 
                          onClick={() => handleApproveGunsmith(gs.id)} 
                          disabled={processingId === gs.id}
                          className="flex-1 bg-primary text-black px-8 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all shadow-[0_0_15px_rgba(255,193,7,0.3)]"
                        >
                          APROVAR
                        </button>
                        <button 
                          onClick={() => handleRejectGunsmith(gs.id)} 
                          disabled={processingId === gs.id}
                          className="flex-1 bg-red-500/10 border border-red-500/20 text-red-500 px-8 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all"
                        >
                          REJEITAR
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
