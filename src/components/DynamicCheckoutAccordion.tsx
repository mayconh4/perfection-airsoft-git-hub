import { useState } from 'react';

type PaymentMethod = 'pix' | 'credit_card' | 'boleto' | 'wallet';

interface Props {
  amount: number;
  loading: boolean;
  pixOnly?: boolean;
  onCommitPayment: (method: PaymentMethod) => void;
  // Labels personalizadas
  actionLabel?: string;
}

export function DynamicCheckoutAccordion({ amount, loading, pixOnly = false, onCommitPayment, actionLabel = 'PAGAR AGORA' }: Props) {
  const [selected, setSelected] = useState<PaymentMethod>('pix');

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <h2 className="text-xl font-black text-center text-white mb-6 uppercase tracking-widest">
        Escolha como você quer pagar
      </h2>

      {/* Opção: Saldo / Wallet (Desabilitado por enquanto visando V2) */}
      <div className="bg-surface/20 border border-white/5 p-4 flex items-center justify-between opacity-50 cursor-not-allowed">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary">account_balance_wallet</span>
          <span className="text-[11px] font-black uppercase text-slate-400">Saldo da Carteira: R$ 0,00</span>
        </div>
        <span className="material-symbols-outlined text-slate-600 text-sm">info</span>
      </div>

      {/* Opção PIX (Sempre Ativa e Padrão) */}
      <div className={`border ${selected === 'pix' ? 'border-primary' : 'border-white/10'} bg-surface/40 overflow-hidden transition-all duration-300`}>
        <div 
          className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5"
          onClick={() => setSelected('pix')}
        >
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[#00bdae]">pix</span>
            <span className={`text-[12px] font-black uppercase tracking-wider ${selected === 'pix' ? 'text-white' : 'text-slate-400'}`}>Pague com Pix</span>
          </div>
          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selected === 'pix' ? 'border-primary bg-primary' : 'border-white/20'}`}>
            {selected === 'pix' && <div className="w-1.5 h-1.5 bg-background-dark rounded-full"></div>}
          </div>
        </div>

        {/* Conteúdo Expansível do PIX */}
        {selected === 'pix' && (
          <div className="p-6 border-t border-white/5 bg-background-dark/30">
            <div className="flex flex-col md:flex-row gap-8">
              <div className="flex-1 space-y-4">
                <h3 className="text-[#00bdae] font-black uppercase tracking-widest text-sm mb-4">Pagou, liberou!</h3>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3 text-[11px] text-slate-300 font-mono">
                    <span className="w-5 h-5 rounded-full border border-[#00bdae]/30 flex items-center justify-center text-[#00bdae] text-[9px]">1</span>
                    Aprovação quase instantânea
                  </li>
                  <li className="flex items-center gap-3 text-[11px] text-slate-300 font-mono">
                    <span className="w-5 h-5 rounded-full border border-[#00bdae]/30 flex items-center justify-center text-[#00bdae] text-[9px]">2</span>
                    Sem taxas adicionais
                  </li>
                  <li className="flex items-center gap-3 text-[11px] text-slate-300 font-mono">
                    <span className="w-5 h-5 rounded-full border border-[#00bdae]/30 flex items-center justify-center text-[#00bdae] text-[9px]">3</span>
                    Pague usando seu banco de preferência
                  </li>
                </ul>

                <div className="mt-8 bg-[#00bdae]/5 border-l-2 border-[#00bdae] p-4 flex gap-3">
                  <span className="material-symbols-outlined text-[#00bdae] text-lg">info</span>
                  <div>
                    <strong className="block text-[10px] text-white uppercase tracking-widest mb-1">Prazo de aprovação do Pix</strong>
                    <span className="text-[10px] text-slate-400 font-mono">Instantâneo na maioria das vezes.</span>
                  </div>
                </div>
              </div>

              {/* QR Code Illustration (Visual Only for the UI structure) */}
              <div className="hidden md:flex items-center justify-center w-40 opacity-80">
                <span className="material-symbols-outlined text-[100px] text-[#00bdae]/20">qr_code_scanner</span>
              </div>
            </div>

            <button
              onClick={() => onCommitPayment('pix')}
              disabled={loading}
              className="mt-8 w-full bg-primary text-background-dark font-black py-5 text-[11px] uppercase tracking-[.3em] hover:bg-white transition-all disabled:opacity-50"
            >
              {loading ? 'PROCESSANDO...' : `${actionLabel} - R$ ${amount.toFixed(2)}`}
            </button>
          </div>
        )}
      </div>

      {/* Opção Cartão de Crédito (Apenas Loja) */}
      {!pixOnly && (
        <div className={`border ${selected === 'credit_card' ? 'border-primary' : 'border-white/10'} bg-surface/40 overflow-hidden transition-all duration-300`}>
          <div 
            className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 opacity-50"
            // onClick={() => setSelected('credit_card')} // Desativado até implementarmos tela de cartão no E-commerce
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-slate-400">credit_card</span>
              <span className="text-[12px] font-black uppercase tracking-wider text-slate-400">Cartão de Crédito <span className="text-[9px] text-primary ml-2 border border-primary/20 px-2 py-0.5 rounded-full">EM BREVE</span></span>
            </div>
          </div>
        </div>
      )}

      {/* Opção Boleto (Apenas Loja) */}
      {!pixOnly && (
        <div className={`border ${selected === 'boleto' ? 'border-primary' : 'border-white/10'} bg-surface/40 overflow-hidden transition-all duration-300`}>
          <div 
            className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 opacity-50"
            // onClick={() => setSelected('boleto')} // Desativado
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-slate-400">receipt_long</span>
              <span className="text-[12px] font-black uppercase tracking-wider text-slate-400">Boleto Bancário <span className="text-[9px] text-primary ml-2 border border-primary/20 px-2 py-0.5 rounded-full">EM BREVE</span></span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
