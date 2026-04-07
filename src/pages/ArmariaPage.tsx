import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

type ViewType = 'selection' | 'gunsmith_reg' | 'client_service' | 'status_view';
type ServiceType = 'upgrade' | 'personalization' | 'maintenance' | null;

export function ArmariaPage() {
  const { user } = useAuth();
  const [view, setView] = useState<ViewType>('selection');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Gunsmith Registration Form State
  const [gunsmithData, setGunsmithData] = useState({
    workshop_name: '',
    description: '',
    location_city: '',
    location_state: '',
    specialties: [] as string[]
  });

  // Client Service Form State
  const [clientData, setClientData] = useState({
    equipment_type: '',
    equipment_model: '',
    description: '',
    service_type: null as ServiceType,
  });

  const [step, setStep] = useState(1);
  const [approvedGunsmiths, setApprovedGunsmiths] = useState<any[]>([]);
  const [selectedGunsmith, setSelectedGunsmith] = useState<string | null>(null);
  const [activeOrders, setActiveOrders] = useState<any[]>([]);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      
      // Fetch Approved Gunsmiths
      const { data: gs } = await supabase.from('gunsmith_profiles').select('*').eq('status', 'approved');
      if (gs) setApprovedGunsmiths(gs);

      // Fetch Active Orders for this Client
      const { data: ord } = await supabase
        .from('repair_orders')
        .select(`
          *,
          gunsmith:gunsmith_id (workshop_name)
        `)
        .eq('client_id', user.id)
        .order('created_at', { ascending: false });
      if (ord) setActiveOrders(ord);
    }
    fetchData();
  }, [user, view]);

  const availableSpecialties = [
    'Upgrades de Precisão', 'AEG Performance', 'GBB / GBBR Expert',
    'Customização Estética', 'Cerakote', 'HPA Systems',
    'Manutenção Preventiva', 'Recuperação de Estrutura'
  ];

  const handleGunsmithSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    
    try {
      const { error } = await supabase.from('gunsmith_profiles').insert({
        user_id: user.id,
        workshop_name: gunsmithData.workshop_name,
        description: gunsmithData.description,
        location_city: gunsmithData.location_city,
        location_state: gunsmithData.location_state,
        specialties: gunsmithData.specialties,
        status: 'pending'
      });

      if (error) throw error;
      setSubmitted(true);
    } catch (error) {
      console.error('Erro ao cadastrar oficina:', error);
      alert('Erro ao enviar cadastro. Verifique se as tabelas foram criadas no Supabase.');
    } finally {
      setLoading(false);
    }
  };

  const toggleSpecialty = (spec: string) => {
    setGunsmithData(prev => ({
      ...prev,
      specialties: prev.specialties.includes(spec)
        ? prev.specialties.filter(s => s !== spec)
        : [...prev.specialties, spec]
    }));
  };

  if (submitted) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 mt-16 text-center animate-fade-in">
        <div className="bg-surface/50 border border-primary/20 p-12 max-w-2xl flex flex-col items-center">
          <div className="size-20 bg-primary/20 rounded-full flex items-center justify-center mb-6">
            <span className="material-symbols-outlined text-primary text-4xl">verified_user</span>
          </div>
          <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-4">Solicitação <span className="text-primary">Transmitida</span></h2>
          <p className="text-white/60 uppercase tracking-widest text-xs leading-relaxed max-w-md">
            Seu cadastro operacional foi recebido e entrou em fase de **Avaliação Administrativa**. Você receberá uma notificação assim que seu perfil for liberado para o público.
          </p>
          <button onClick={() => { setSubmitted(false); setView('selection'); }} className="mt-8 border border-primary text-primary px-8 py-3 uppercase tracking-widest text-xs font-bold hover:bg-primary hover:text-black transition-colors">
            Voltar ao Hub
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col px-4 lg:px-8 py-12 max-w-6xl mx-auto w-full italic">
      
      {/* HEADER TÁTICO */}
      <div className="mb-12 not-italic">
        <div className="flex items-center gap-3 mb-4">
          <span className="material-symbols-outlined text-primary text-4xl">construction</span>
          <h1 className="text-4xl sm:text-5xl font-black text-white uppercase tracking-tighter">
            ARMARIA <span className="text-primary">OPERACIONAL</span>
          </h1>
        </div>
        <p className="text-white/50 uppercase tracking-[0.2em] text-[10px] max-w-2xl leading-relaxed">
          Centro de Excelência em Armamento. Gerencie sua oficina ou solicite manutenção especializada.
        </p>
      </div>

      {/* SELECTION HUB */}
      {view === 'selection' && (
        <div className="space-y-12 animate-fade-in not-italic">
          
          {/* Active Orders Radar */}
          {activeOrders.length > 0 && (
            <div className="space-y-6">
              <h2 className="text-xs font-black text-primary uppercase tracking-[0.3em] flex items-center gap-2">
                <span className="size-2 bg-primary animate-pulse rounded-full"></span> 
                Arsenal em Manutenção ({activeOrders.length})
              </h2>
              <div className="grid grid-cols-1 gap-4">
                {activeOrders.map(order => (
                  <div key={order.id} className="bg-surface/30 border border-white/5 p-6 flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <p className="text-[10px] font-black uppercase text-white tracking-widest">{order.equipment_type}</p>
                        <span className="px-2 py-0.5 bg-primary/10 text-primary text-[8px] font-black uppercase tracking-widest border border-primary/20">
                          {order.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-[9px] text-white/40 uppercase tracking-widest font-black">Responsável: {order.gunsmith?.workshop_name || 'Aguardando'}</p>
                    </div>

                    <div className="flex gap-2 items-center flex-1 justify-center max-w-md w-full">
                       {['awaiting_shipping', 'awaiting_quote', 'repairing', 'returned'].map((st, i) => {
                         const currentIdx = ['awaiting_shipping', 'awaiting_quote', 'repairing', 'returned', 'completed'].indexOf(order.status);
                         const active = i <= currentIdx;
                         return (
                           <div key={st} className="flex-1 h-1 relative bg-white/5">
                             <div className={`absolute inset-0 bg-primary transition-all duration-1000 ${active ? 'w-full' : 'w-0'}`}></div>
                             <div className={`absolute -top-1 left-0 size-2 rounded-full border border-white/10 ${active ? 'bg-primary' : 'bg-surface'}`}></div>
                           </div>
                         );
                       })}
                    </div>

                    <div className="flex items-center gap-4 text-white/40">
                      <span className="material-symbols-outlined text-lg">barcode_scanner</span>
                      <span className="text-[9px] font-mono tracking-widest uppercase">{order.id.slice(0, 8)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <button onClick={() => setView('gunsmith_reg')} className="group relative bg-surface/40 border border-white/5 p-8 text-left hover:border-primary/40 transition-all overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 transition-opacity"><span className="material-symbols-outlined text-8xl">military_tech</span></div>
              <div className="relative z-10">
                <span className="inline-block px-3 py-1 bg-primary text-black text-[9px] font-black uppercase tracking-widest mb-6 italic">Especialista</span>
                <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-4">Cadastro de Oficina</h3>
                <p className="text-white/40 text-[11px] uppercase tracking-widest leading-relaxed mb-8">Torne-se um armeiro certificado. Ofereça seus serviços para a comunidade.</p>
                <div className="flex items-center gap-2 text-primary font-black uppercase tracking-widest text-[10px]">INICIAR REGISTRO <span className="material-symbols-outlined text-sm">arrow_forward</span></div>
              </div>
              <div className="absolute bottom-0 left-0 h-1 bg-primary transition-all w-0 group-hover:w-full"></div>
            </button>

            <button onClick={() => setView('client_service')} className="group relative bg-surface/40 border border-white/5 p-8 text-left hover:border-primary/40 transition-all overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 transition-opacity"><span className="material-symbols-outlined text-8xl">build</span></div>
              <div className="relative z-10">
                <span className="inline-block px-3 py-1 bg-white/10 text-white/50 text-[9px] font-black uppercase tracking-widest mb-6 italic">Operador</span>
                <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-4">Solicitar Manutenção</h3>
                <p className="text-white/40 text-[11px] uppercase tracking-widest leading-relaxed mb-8">Cadastre seu equipamento para conserto, upgrade ou personalização.</p>
                <div className="flex items-center gap-2 text-primary font-black uppercase tracking-widest text-[10px]">ABRIR CHAMADO <span className="material-symbols-outlined text-sm">arrow_forward</span></div>
              </div>
              <div className="absolute bottom-0 left-0 h-1 bg-primary transition-all w-0 group-hover:w-full"></div>
            </button>
          </div>
        </div>
      )}

      {/* VIEW: CADASTRO DE OFICINA (OPÇÃO 1) */}
      {view === 'gunsmith_reg' && (
        <div className="animate-fade-in max-w-4xl not-italic">
          <button onClick={() => setView('selection')} className="flex items-center gap-2 text-white/40 hover:text-white text-[10px] uppercase font-black tracking-widest mb-8 transition-colors">
            <span className="material-symbols-outlined text-sm">arrow_back</span> Retornar ao Hub
          </button>
          <form onSubmit={handleGunsmithSubmit} className="bg-surface/40 border border-white/10 p-8 sm:p-12 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
            <div className="space-y-10">
              <div>
                <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Registro de <span className="text-primary">Especialista</span></h2>
                <p className="text-white/40 text-[10px] uppercase tracking-widest">Informações básicas da oficina e localização tática.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] text-primary font-bold uppercase tracking-[0.2em]">Workshop</label>
                  <input required value={gunsmithData.workshop_name} onChange={e => setGunsmithData({...gunsmithData, workshop_name: e.target.value})} className="w-full bg-[#10100c] border border-white/10 p-4 text-white uppercase tracking-widest text-xs focus:border-primary outline-none transition-colors" placeholder="NOME DA OFICINA" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] text-primary font-bold uppercase tracking-[0.2em]">Descrição</label>
                  <textarea required rows={4} value={gunsmithData.description} onChange={e => setGunsmithData({...gunsmithData, description: e.target.value})} className="w-full bg-[#10100c] border border-white/10 p-4 text-white uppercase tracking-widest text-xs focus:border-primary outline-none transition-colors" placeholder="EXPERIÊNCIA..." />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-primary font-bold uppercase tracking-[0.2em]">Cidade</label>
                  <input required value={gunsmithData.location_city} onChange={e => setGunsmithData({...gunsmithData, location_city: e.target.value})} className="w-full bg-[#10100c] border border-white/10 p-4 text-white uppercase tracking-widest text-xs focus:border-primary outline-none transition-colors" placeholder="CIDADE" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-primary font-bold uppercase tracking-[0.2em]">Estado</label>
                  <input required maxLength={2} value={gunsmithData.location_state} onChange={e => setGunsmithData({...gunsmithData, location_state: e.target.value})} className="w-full bg-[#10100c] border border-white/10 p-4 text-white uppercase tracking-widest text-xs focus:border-primary outline-none transition-colors" placeholder="MG" />
                </div>
              </div>
              <div className="space-y-6">
                <label className="text-[10px] text-primary font-bold uppercase tracking-[0.2em] block">Especialidades</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {availableSpecialties.map(spec => (
                    <button key={spec} type="button" onClick={() => toggleSpecialty(spec)} className={`p-3 text-[9px] font-black uppercase tracking-widest border transition-all ${gunsmithData.specialties.includes(spec) ? 'border-primary bg-primary text-black' : 'border-white/10 bg-white/5 text-white/40'}`}>{spec}</button>
                  ))}
                </div>
              </div>
              <button disabled={loading} className="w-full bg-primary text-black py-4 font-black uppercase tracking-widest text-xs hover:bg-white transition-all flex items-center justify-center gap-3">
                {loading ? 'PROCESSANDO...' : 'ENVIAR PARA AVALIAÇÃO'} <span className="material-symbols-outlined text-sm">send</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* VIEW: SOLICITAR MANUTENÇÃO (OPÇÃO 2) */}
      {view === 'client_service' && (
        <div className="animate-fade-in max-w-4xl not-italic">
          <button onClick={() => { setView('selection'); setStep(1); }} className="flex items-center gap-2 text-white/40 hover:text-white text-[10px] uppercase font-black tracking-widest mb-8 transition-colors">
            <span className="material-symbols-outlined text-sm">arrow_back</span> Retornar ao Hub
          </button>
          <div className="bg-surface/40 border border-white/10 p-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
            <div className="flex gap-4 mb-10 border-b border-white/5 pb-6 overflow-x-auto no-scrollbar">
              {[1, 2, 3].map(i => (
                <div key={i} className={`flex items-center gap-2 shrink-0 ${step === i ? 'opacity-100' : 'opacity-30'}`}>
                  <div className={`size-6 flex items-center justify-center text-[10px] font-black ${step === i ? 'bg-primary text-black' : 'bg-white/10 text-white'}`}>0{i}</div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-white">{i === 1 ? 'Gear' : i === 2 ? 'Defeito' : 'Workshop'}</span>
                  {i < 3 && <span className="material-symbols-outlined text-[10px] text-white/20">chevron_right</span>}
                </div>
              ))}
            </div>
            <div className="space-y-8">
              {step === 1 && (
                <div className="space-y-6 animate-fade-in">
                  <div className="space-y-2">
                    <label className="text-[10px] text-primary font-bold uppercase tracking-[0.2em]">Equipamento</label>
                    <select value={clientData.equipment_type} onChange={e => setClientData({...clientData, equipment_type: e.target.value})} className="w-full bg-[#10100c] border border-white/10 p-4 text-white uppercase text-xs outline-none">
                      <option value="">Selecione</option>
                      <option value="AEG">AEG</option><option value="GBB">GBB</option><option value="HPA">HPA</option><option value="Sniper">Sniper</option>
                    </select>
                  </div>
                  <input value={clientData.equipment_model} onChange={e => setClientData({...clientData, equipment_model: e.target.value})} className="w-full bg-[#10100c] border border-white/10 p-4 text-white uppercase text-xs outline-none" placeholder="MODELO" />
                </div>
              )}{step === 2 && (
                <textarea rows={6} value={clientData.description} onChange={e => setClientData({...clientData, description: e.target.value})} className="w-full bg-[#10100c] border border-white/10 p-4 text-white uppercase text-xs outline-none" placeholder="RELATÓRIO DE FALHA..." />
              )}{step === 3 && (
                <div className="grid grid-cols-1 gap-4">
                  {approvedGunsmiths.map(gs => (
                    <button key={gs.id} onClick={() => setSelectedGunsmith(gs.id)} className={`p-6 border text-left ${selectedGunsmith === gs.id ? 'border-primary bg-primary/10' : 'border-white/5 bg-[#10100c]'}`}>
                      <p className="text-xs font-black uppercase tracking-widest">{gs.workshop_name}</p>
                      <p className="text-[9px] text-white/40 uppercase">{gs.location_city}, {gs.location_state}</p>
                    </button>
                  ))}
                </div>
              )}
              <div className="flex justify-between items-center pt-8 border-t border-white/5">
                {step > 1 ? <button onClick={() => setStep(step - 1)} className="text-white/40 text-[10px] font-bold uppercase">Voltar</button> : <div />}
                {step < 3 ? <button onClick={() => setStep(step + 1)} className="bg-primary text-black px-8 py-3 text-[10px] font-black uppercase">Próximo</button> : 
                  <button onClick={async () => {
                    setLoading(true);
                    const { error } = await supabase.from('repair_orders').insert({
                      client_id: user?.id, gunsmith_id: selectedGunsmith, equipment_type: `${clientData.equipment_type} - ${clientData.equipment_model}`, description: clientData.description, status: 'awaiting_shipping'
                    });
                    if (!error) setSubmitted(true);
                    setLoading(false);
                  }} className="bg-primary text-black px-12 py-3 text-[10px] font-black uppercase">Finalizar</button>
                }
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
