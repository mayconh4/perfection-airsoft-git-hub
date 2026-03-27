import React, { useState } from 'react';

type ServiceType = 'upgrade' | 'personalization' | 'maintenance' | null;

export function CustomizacaoPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    equipamento: '',
    serviceType: null as ServiceType,
    upgradeDetails: '',
    personalizationDetails: '',
    maintenanceDetails: ''
  });

  const equipamentos = [
    'Pistola GBB', 'Pistola Elétrica (AEP)', 'Pistola CO2', 'Revólver',
    'Rifle Assault (AEG)', 'Rifle Assault (GBBR)', 'Sniper (Spring)', 'Sniper (Gas)',
    'SMG (Submetralhadora)', 'LMG (Metralhadora Leve)', 'Shotgun'
  ];

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulating API call since we don't have the table yet, 
    // or we could actually insert into a 'service_requests' table later.
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 1500);
  };

  if (submitted) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 mt-16 text-center animate-fade-in">
        <div className="bg-surface/50 border border-primary/20 p-12 max-w-2xl flex flex-col items-center">
          <div className="size-20 bg-primary/20 rounded-full flex items-center justify-center mb-6">
            <span className="material-symbols-outlined text-primary text-4xl">check_circle</span>
          </div>
          <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-4">Ordem <span className="text-primary">Recebida</span></h2>
          <p className="text-white/60 uppercase tracking-widest text-xs leading-relaxed max-w-md">
            Seus dados foram processados com sucesso. O Agente de Suporte fará contato via WhatsApp no número informado para passar o laudo e orçamento.
          </p>
          <button onClick={() => { setSubmitted(false); setStep(1); setFormData({ nome: '', email: '', telefone: '', equipamento: '', serviceType: null, upgradeDetails: '', personalizationDetails: '', maintenanceDetails: '' }) }} className="mt-8 border border-primary text-primary px-8 py-3 uppercase tracking-widest text-xs font-bold hover:bg-primary hover:text-black transition-colors">
            Nova Solicitação
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col px-4 lg:px-8 py-12 max-w-4xl mx-auto w-full">
      <div className="mb-12">
        <h1 className="text-4xl sm:text-5xl font-black text-white uppercase tracking-tighter mb-4">Arsenal <span className="text-primary">Workshop</span></h1>
        <p className="text-white/50 uppercase tracking-[0.2em] text-xs max-w-2xl leading-relaxed">
          Centro de manutenção especializada, upgrades de alta performance e personalização tática. Declare sua intenção abaixo para triagem técnica.
        </p>
      </div>

      {/* Progress Tracker */}
      <div className="flex gap-4 mb-12 border-b border-white/10 pb-6 overflow-x-auto custom-scrollbar">
        {[1, 2, 3].map(i => (
          <div key={i} className={`flex items-center gap-3 shrink-0 ${step === i ? 'opacity-100' : 'opacity-30 grayscale'}`}>
            <div className={`size-8 font-black flex items-center justify-center text-xs ${step === i ? 'bg-primary text-black' : 'bg-surface border border-white/20 text-white'}`}>
              0{i}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">
              {i === 1 ? 'Identificação' : i === 2 ? 'Equipamento' : 'Especificações'}
            </span>
            {i < 3 && <span className="material-symbols-outlined text-white/20 mx-2">chevron_right</span>}
          </div>
        ))}
      </div>

      <div className="bg-surface/40 backdrop-blur-md border border-white/5 p-6 sm:p-10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
        
        <form onSubmit={handleSubmit} className="relative z-10 flex flex-col gap-8">
          
          {/* STEP 1: IDENTIFICATION */}
          {step === 1 && (
            <div className="animate-fade-in space-y-6">
              <h3 className="text-xl font-black uppercase text-white tracking-widest flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">badge</span> Dados do Operador
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] text-primary font-bold uppercase tracking-[0.2em]">Nome Completo</label>
                  <input required type="text" value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} className="w-full bg-[#10100c] border border-white/10 p-4 text-white uppercase tracking-widest text-xs focus:border-primary/50 outline-none transition-colors" placeholder="SEU NOME" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-primary font-bold uppercase tracking-[0.2em]">E-mail</label>
                  <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-[#10100c] border border-white/10 p-4 text-white uppercase tracking-widest text-xs focus:border-primary/50 outline-none transition-colors" placeholder="EMAIL@EXEMPLO.COM" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] text-primary font-bold uppercase tracking-[0.2em]">WhatsApp para Contato</label>
                  <input required type="tel" value={formData.telefone} onChange={e => setFormData({...formData, telefone: e.target.value})} className="w-full bg-[#10100c] border border-white/10 p-4 text-white uppercase tracking-widest text-xs focus:border-primary/50 outline-none transition-colors" placeholder="(00) 00000-0000" />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: EQUIPMENT AND SERVICE LEVEL */}
          {step === 2 && (
            <div className="animate-fade-in space-y-8">
              <div className="space-y-6">
                <h3 className="text-xl font-black uppercase text-white tracking-widest flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary">sports_martial_arts</span> Tipo de Armamento
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {equipamentos.map(eq => (
                    <button 
                      key={eq} type="button" 
                      onClick={() => setFormData({...formData, equipamento: eq})}
                      className={`p-4 text-left border transition-all ${formData.equipamento === eq ? 'border-primary bg-primary/10 text-primary' : 'border-white/10 bg-[#10100c] text-white/50 hover:border-white/30'}`}
                    >
                      <span className="text-[10px] font-bold uppercase tracking-widest block">{eq}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-6 pt-6 border-t border-white/5">
                <h3 className="text-xl font-black uppercase text-white tracking-widest flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary">engineering</span> Categoria do Serviço
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button type="button" onClick={() => setFormData({...formData, serviceType: 'upgrade'})} className={`p-6 border flex flex-col items-center text-center gap-4 transition-all ${formData.serviceType === 'upgrade' ? 'border-primary bg-primary/10 text-primary' : 'border-white/10 bg-[#10100c] text-white/50 hover:border-white/30'}`}>
                    <span className="material-symbols-outlined text-4xl">rocket_launch</span>
                    <div>
                      <span className="text-[11px] font-black uppercase tracking-widest block text-white mb-2">Upgrade Técnico</span>
                      <span className="text-[9px] uppercase tracking-widest opacity-60">Aumento de performance, FPS e precisão.</span>
                    </div>
                  </button>
                  <button type="button" onClick={() => setFormData({...formData, serviceType: 'personalization'})} className={`p-6 border flex flex-col items-center text-center gap-4 transition-all ${formData.serviceType === 'personalization' ? 'border-primary bg-primary/10 text-primary' : 'border-white/10 bg-[#10100c] text-white/50 hover:border-white/30'}`}>
                    <span className="material-symbols-outlined text-4xl">format_paint</span>
                    <div>
                      <span className="text-[11px] font-black uppercase tracking-widest block text-white mb-2">Personalização</span>
                      <span className="text-[9px] uppercase tracking-widest opacity-60">Pintura Cerakote, customização externa.</span>
                    </div>
                  </button>
                  <button type="button" onClick={() => setFormData({...formData, serviceType: 'maintenance'})} className={`p-6 border flex flex-col items-center text-center gap-4 transition-all ${formData.serviceType === 'maintenance' ? 'border-primary bg-primary/10 text-primary' : 'border-white/10 bg-[#10100c] text-white/50 hover:border-white/30'}`}>
                    <span className="material-symbols-outlined text-4xl">build</span>
                    <div>
                      <span className="text-[11px] font-black uppercase tracking-widest block text-white mb-2">Manutenção Reparadora</span>
                      <span className="text-[9px] uppercase tracking-widest opacity-60">Conserto de vazamentos, quebras e falhas.</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: SPECIFIC DETAILS */}
          {step === 3 && (
            <div className="animate-fade-in space-y-6">
              <h3 className="text-xl font-black uppercase text-white tracking-widest flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">assignment</span> Relatório Operacional
              </h3>
              
              {formData.serviceType === 'upgrade' && (
                <div className="space-y-4">
                  <p className="text-[10px] text-white/60 tracking-widest uppercase">Especifique as melhorias desejadas. Ex: Precisão para tiros longos, aumento de ROF (Rate of Fire), mais FPS.</p>
                  <textarea required value={formData.upgradeDetails} onChange={e => setFormData({...formData, upgradeDetails: e.target.value})} rows={6} className="w-full bg-[#10100c] border border-primary/30 p-4 text-white uppercase tracking-widest text-xs focus:border-primary outline-none transition-colors" placeholder="Quais pecas ou performance voce deseja atingir?"></textarea>
                </div>
              )}

              {formData.serviceType === 'personalization' && (
                <div className="space-y-4">
                  <p className="text-[10px] text-white/60 tracking-widest uppercase">Descreva o estilo visual ou peças externas que deseja modificar na estética da arma.</p>
                  <textarea required value={formData.personalizationDetails} onChange={e => setFormData({...formData, personalizationDetails: e.target.value})} rows={6} className="w-full bg-[#10100c] border border-primary/30 p-4 text-white uppercase tracking-widest text-xs focus:border-primary outline-none transition-colors" placeholder="Cores, padroes de camuflagem ou acessorios integrados..."></textarea>
                </div>
              )}

              {formData.serviceType === 'maintenance' && (
                <div className="space-y-4">
                  <p className="text-[10px] text-white/60 tracking-widest uppercase">Relate detalhadamente as falhas, ruídos ou peças quebradas identificadas durante o uso.</p>
                  <textarea required value={formData.maintenanceDetails} onChange={e => setFormData({...formData, maintenanceDetails: e.target.value})} rows={6} className="w-full bg-[#10100c] border border-primary/30 p-4 text-white uppercase tracking-widest text-xs focus:border-primary outline-none transition-colors" placeholder="Descreva os sintomas do defeito em detalhes..."></textarea>
                </div>
              )}
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex justify-between items-center pt-8 border-t border-white/5 mt-auto">
            {step > 1 ? (
              <button type="button" onClick={handleBack} className="text-white/40 hover:text-white uppercase tracking-widest text-[10px] font-bold flex items-center gap-2 transition-colors">
                <span className="material-symbols-outlined text-sm">arrow_left</span> Voltar
              </button>
            ) : <div></div>}

            {step < 3 ? (
              <button 
                type="button" 
                onClick={handleNext} 
                disabled={(step === 1 && (!formData.nome || !formData.email || !formData.telefone)) || (step === 2 && (!formData.equipamento || !formData.serviceType))}
                className="bg-primary text-black px-8 py-3 uppercase tracking-widest text-[10px] font-black hover:bg-white transition-all disabled:opacity-30 flex items-center gap-2"
              >
                Avançar <span className="material-symbols-outlined text-sm">arrow_right</span>
              </button>
            ) : (
              <button 
                type="submit" 
                disabled={loading}
                className="bg-primary text-black px-8 py-3 uppercase tracking-widest text-[10px] font-black hover:bg-white transition-all flex items-center gap-2"
              >
                {loading ? 'Transmitindo...' : 'Enviar Solicitação'} <span className="material-symbols-outlined text-sm">send</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
