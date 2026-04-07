import { useState } from 'react';
import { SEO } from '../components/SEO';

export default function DashboardDemo() {
  const [demoState, setDemoState] = useState<'recruta' | 'uav' | 'predator' | 'carepackage' | 'nuke'>('recruta');

  const stats = {
    recruta: { ticketsSold: 0, revenue: 0, netRevenue: 0, pendingBalance: 0, trustLevel: 0, completedDrops: 0, isVerified: false, rankName: 'RECRUTA', reward: 'ESPERANDO ORDENS' },
    uav: { ticketsSold: 154, revenue: 5420, netRevenue: 0, pendingBalance: 5420, trustLevel: 1, completedDrops: 1, isVerified: false, rankName: 'UAV RECON', reward: 'RADAR ATIVO' },
    predator: { ticketsSold: 420, revenue: 12500, netRevenue: 0, pendingBalance: 12500, trustLevel: 2, completedDrops: 2, isVerified: false, rankName: 'PREDATOR MISSILE', reward: 'PRECISÃO CIRÚRGICA' },
    carepackage: { ticketsSold: 850, revenue: 32000, netRevenue: 28000, pendingBalance: 4000, trustLevel: 3, completedDrops: 3, isVerified: true, rankName: 'CARE PACKAGE', reward: 'SAQUE INSTANTÂNEO ATIVADO' },
    nuke: { ticketsSold: 2500, revenue: 95000, netRevenue: 82000, pendingBalance: 13000, trustLevel: 4, completedDrops: 15, isVerified: true, rankName: 'TACTICAL NUKE', reward: 'DOMÍNIO TOTAL / VERIFICADO ELITE' }
  }[demoState];

  return (
    <div className="min-h-screen bg-background-dark pb-20 pt-12 relative overflow-hidden crt-overlay font-inter">
      <div className="scanline"></div>
      <SEO title={`DEMO: ${stats.rankName} | Perfection Airsoft`} />
      
      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <div className="flex justify-between items-center mb-12">
            <div>
                <h1 className="text-4xl font-black text-white uppercase tracking-tighter italic">
                    COMMAND <span className="text-primary">CENTER</span>
                </h1>
                <p className="text-[10px] text-primary/60 font-mono uppercase tracking-[0.3em] mt-2 animate-pulse">Estabelecendo Conexão Segura... [OK]</p>
            </div>
            <div className="flex flex-wrap gap-2 bg-white/5 p-1 border border-white/10">
                {['recruta', 'uav', 'predator', 'carepackage', 'nuke'].map((s) => (
                    <button 
                        key={s}
                        onClick={() => setDemoState(s as any)}
                        className={`px-3 py-2 text-[8px] font-black uppercase tracking-widest transition-all ${demoState === s ? 'bg-primary text-black' : 'text-slate-400 hover:text-white'}`}
                    >
                        {s}
                    </button>
                ))}
            </div>
        </div>

        {/* Tactical Trust HUD - Killstreak Style */}
        <div className={`border p-8 mb-8 relative overflow-hidden group transition-all duration-500 ${stats.trustLevel >= 3 ? 'bg-primary/10 border-primary/40 shadow-[0_0_30px_rgba(251,191,36,0.1)]' : 'bg-surface/40 border-white/5'}`}>
            {stats.trustLevel === 3 && (
                <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
                    <img 
                        src="file:///C:/Users/mayco/.gemini/antigravity/brain/bf46d8ac-bd4f-4680-b101-af9709111ce0/mw2_care_package_drop_ac130_1774925859413.png" 
                        alt="AC130 Drop" 
                        className="w-full h-full object-cover animate-pulse"
                    />
                </div>
            )}
            
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex items-center gap-6">
                    <div className={`size-24 bg-black/60 border-2 flex items-center justify-center relative group-hover:scale-110 transition-transform ${stats.trustLevel >= 3 ? 'border-primary shadow-[0_0_15px_rgba(251,191,36,0.3)]' : 'border-white/20'}`}>
                        <span className={`material-symbols-outlined text-5xl font-black ${stats.trustLevel >= 3 ? 'text-primary' : 'text-slate-600'}`}>
                            {stats.trustLevel === 0 && 'military_tech'}
                            {stats.trustLevel === 1 && 'radar'}
                            {stats.trustLevel === 2 && 'rocket_launch'}
                            {stats.trustLevel === 3 && 'deployed_code'}
                            {stats.trustLevel === 4 && 'radioactive'}
                        </span>
                        <div className="absolute -bottom-2 -right-2 bg-primary text-black font-black text-[9px] px-2 py-0.5 rounded-sm">
                            RANK {stats.trustLevel}
                        </div>
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-2xl font-black text-white uppercase tracking-tighter">
                                {stats.rankName}
                            </h3>
                            {stats.isVerified && (
                                <span className="bg-primary text-black text-[8px] font-black px-1.5 py-0.5 rounded-full">VERIFIED</span>
                            )}
                        </div>
                        <p className={`text-[10px] font-mono uppercase tracking-[0.2em] ${stats.trustLevel >= 3 ? 'text-primary' : 'text-slate-500'}`}>
                            {stats.trustLevel >= 3 ? 'SOLDADO VERIFICADO' : 'STATUS PADRÃO: SOLDADO EM OBSERVAÇÃO'}
                        </p>
                    </div>
                </div>
                
                <div className="flex-1 max-w-md w-full">
                    <div className="flex justify-between text-[9px] font-black uppercase tracking-widest mb-2">
                        <span className="text-slate-500">COMPLETE PARA GANHAR CONFIABILIDADE</span>
                        <span className="text-primary">{stats.completedDrops} / {stats.trustLevel < 3 ? '3' : '15'} ENTREGAS</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                        <div 
                            className="h-full bg-primary transition-all duration-1000 shadow-[0_0_10px_rgba(251,191,36,0.5)]" 
                            style={{ width: `${Math.min(100, (stats.completedDrops / (stats.trustLevel < 3 ? 3 : 15)) * 100)}%` }}
                        ></div>
                    </div>
                    <p className="text-[8px] text-slate-600 mt-2 uppercase italic text-right font-mono">
                        {stats.trustLevel === 3 ? 'SUPORTE AC-130 ATIVO // CARGA EM ROTA' : 'ESTABELECENDO DOMÍNIO OPERACIONAL'}
                    </p>
                </div>
            </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 mb-12">
          <div className="bg-surface/30 border border-white/5 p-8 group hover:bg-white/5 transition-colors">
            <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest block mb-1">Missões Concluídas</span>
            <span className="text-4xl font-black text-white">{stats.completedDrops}</span>
          </div>
          <div className={`border p-8 border-l-4 transition-all duration-500 ${stats.trustLevel >= 3 ? 'bg-primary/5 border-primary border-white/10' : 'bg-surface/30 border-white/5 border-l-white/10'}`}>
            <span className={`text-[10px] font-black uppercase tracking-widest block mb-1 font-mono italic ${stats.trustLevel >= 3 ? 'text-primary' : 'text-slate-500'}`}>Saldo Disponível</span>
            <div className="flex items-baseline gap-2">
                <span className={`text-4xl font-black ${stats.trustLevel >= 3 ? 'text-primary' : 'text-white/40'}`}>R$ {stats.netRevenue.toFixed(2)}</span>
                {stats.trustLevel < 3 && <span className="text-[8px] text-red-500 font-black uppercase animate-pulse">BLOQUEADO</span>}
            </div>
          </div>
          <div className="bg-surface/30 border border-white/5 p-8">
            <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest block mb-1">Saldo em Garantia (Escrow)</span>
            <span className="text-2xl font-black text-white/60">R$ {stats.pendingBalance.toFixed(2)}</span>
          </div>
          <div className="bg-surface/30 border border-white/5 p-8">
            <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest block mb-1">Total Movimentado</span>
            <span className="text-4xl font-black text-white">R$ {stats.revenue.toFixed(2)}</span>
          </div>
        </div>

        <div className="bg-primary/5 border border-primary/20 p-8 rounded mb-20">
            <h4 className="text-white font-black uppercase tracking-widest text-xs mb-4 italic">Lógica de Combate:</h4>
            <ul className="space-y-3">
                <li className="flex items-start gap-3 text-[10px] text-slate-400 uppercase font-mono">
                    <span className="text-primary font-black">[!]</span>
                    <span>Se o Webhook detectar Nível {stats.trustLevel}, o valor cai no campo {stats.trustLevel >= 3 ? 'VERDE (Disponível)' : 'BRANCO (Garantia)'}.</span>
                </li>
                <li className="flex items-start gap-3 text-[10px] text-slate-400 uppercase font-mono">
                    <span className="text-primary font-black">[!]</span>
                    <span>Operadores Elite (Rank 3+) têm fluxo de caixa instantâneo. Recrutas protegem a plataforma com Escrow.</span>
                </li>
                <li className="flex items-start gap-3 text-[10px] text-slate-400 uppercase font-mono">
                    <span className="text-seconday font-black text-primary">[!]</span>
                    <span>3 Entregas bem-sucedidas + KYC Verificado = Desbloqueio do AC-130 (Care Package).</span>
                </li>
            </ul>
        </div>
      </div>
    </div>
  );
}
