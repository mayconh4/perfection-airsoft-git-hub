import { useState, useMemo } from 'react';

type PaymentMethod = 'pix' | 'credit_card' | 'boleto' | 'wallet';

interface Props {
  amount: number;
  loading: boolean;
  pixOnly?: boolean;
  onCommitPayment: (method: PaymentMethod, data?: any) => void;
  actionLabel?: string;
}

export function DynamicCheckoutAccordion({ amount, loading, pixOnly = false, onCommitPayment, actionLabel = 'PAGAR AGORA' }: Props) {
  const [selected, setSelected] = useState<PaymentMethod>('pix');
  
  // Estados para Cartão
  const [cardData, setCardData] = useState({
    number: '',
    name: '',
    expiry: '',
    cvv: '',
    installments: 1
  });

  const handleCardChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setCardData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // Cálculo de parcelas com juros (deve bater com o backend)
  const installmentOptions = useMemo(() => {
    const rates: Record<number, number> = {
      1: 1, 2: 1.05, 3: 1.07, 4: 1.09, 5: 1.11, 6: 1.13,
      7: 1.15, 8: 1.17, 9: 1.19, 10: 1.21, 11: 1.23, 12: 1.25
    };
    
    return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => {
      const totalPrice = amount * (rates[n] || 1);
      const installmentValue = totalPrice / n;
      return {
        count: n,
        value: installmentValue,
        total: totalPrice,
        label: `${n}x de R$ ${installmentValue.toFixed(2)} ${n > 1 ? `(Total: R$ ${totalPrice.toFixed(2)})` : ''}`
      };
    });
  }, [amount]);

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      <h2 className="text-xl font-black text-center text-white mb-6 uppercase tracking-widest italic">
        Configuração de <span className="text-primary">Pagamento</span>
      </h2>

      {/* Opção PIX */}
      <div className={`border-2 ${selected === 'pix' ? 'border-primary bg-primary/5' : 'border-white/5 bg-surface/20'} transition-all duration-300 rounded-lg overflow-hidden`}>
        <div className="p-4 flex items-center justify-between cursor-pointer" onClick={() => setSelected('pix')}>
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[#00bdae] scale-125">pix</span>
            <span className={`text-sm font-black uppercase tracking-wider ${selected === 'pix' ? 'text-white' : 'text-slate-400'}`}>Pix Instantâneo</span>
          </div>
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selected === 'pix' ? 'border-primary' : 'border-white/20'}`}>
            {selected === 'pix' && <div className="w-2.5 h-2.5 bg-primary rounded-full"></div>}
          </div>
        </div>

        {selected === 'pix' && (
          <div className="px-6 pb-6 pt-2 space-y-4 animate-in fade-in slide-in-from-top-2">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
              Liberação imediata após a confirmação. O QR Code será gerado no próximo passo.
            </p>
            <button
              onClick={() => onCommitPayment('pix')}
              disabled={loading}
              className="w-full bg-primary text-background-dark font-black py-4 text-xs uppercase tracking-[.2em] hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 rounded"
            >
              {loading ? 'GERANDO PIX...' : `${actionLabel} VIA PIX`}
            </button>
          </div>
        )}
      </div>

      {/* Opção Cartão de Crédito */}
      {!pixOnly && (
        <div className={`border-2 ${selected === 'credit_card' ? 'border-primary bg-primary/5' : 'border-white/5 bg-surface/20'} transition-all duration-300 rounded-lg overflow-hidden`}>
          <div className="p-4 flex items-center justify-between cursor-pointer" onClick={() => setSelected('credit_card')}>
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-amber-500 scale-125">credit_card</span>
              <span className={`text-sm font-black uppercase tracking-wider ${selected === 'credit_card' ? 'text-white' : 'text-slate-400'}`}>Cartão de Crédito</span>
            </div>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selected === 'credit_card' ? 'border-primary' : 'border-white/20'}`}>
              {selected === 'credit_card' && <div className="w-2.5 h-2.5 bg-primary rounded-full"></div>}
            </div>
          </div>

          {selected === 'credit_card' && (
            <div className="px-6 pb-6 pt-2 space-y-6 animate-in fade-in slide-in-from-top-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-[9px] font-black text-slate-500 mb-1.5 uppercase tracking-widest">Número do Cartão</label>
                  <input name="number" value={cardData.number} onChange={handleCardChange} placeholder="0000 0000 0000 0000"
                    className="w-full bg-black/40 border border-white/10 px-4 py-3 rounded text-xs text-white outline-none focus:border-primary transition-colors font-mono"/>
                </div>
                <div className="col-span-2">
                  <label className="block text-[9px] font-black text-slate-500 mb-1.5 uppercase tracking-widest">Nome do Titular (Como no cartão)</label>
                  <input name="name" value={cardData.name} onChange={handleCardChange} placeholder="NOME IMPRESSO NO CARTÃO"
                    className="w-full bg-black/40 border border-white/10 px-4 py-3 rounded text-xs text-white outline-none focus:border-primary transition-colors uppercase"/>
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-500 mb-1.5 uppercase tracking-widest">Validade</label>
                  <input name="expiry" value={cardData.expiry} onChange={handleCardChange} placeholder="MM/AA"
                    className="w-full bg-black/40 border border-white/10 px-4 py-3 rounded text-xs text-white outline-none focus:border-primary transition-colors font-mono"/>
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-500 mb-1.5 uppercase tracking-widest">CVV</label>
                  <input name="cvv" value={cardData.cvv} onChange={handleCardChange} placeholder="000"
                    className="w-full bg-black/40 border border-white/10 px-4 py-3 rounded text-xs text-white outline-none focus:border-primary transition-colors font-mono"/>
                </div>
                <div className="col-span-2">
                  <label className="block text-[9px] font-black text-slate-500 mb-1.5 uppercase tracking-widest">Parcelamento (Com Juros)</label>
                  <select name="installments" value={cardData.installments} onChange={handleCardChange}
                    className="w-full bg-black/40 border border-white/10 px-4 py-3 rounded text-xs text-white outline-none focus:border-primary transition-colors">
                    {installmentOptions.map(opt => (
                      <option key={opt.count} value={opt.count} className="bg-background-dark">{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                onClick={() => onCommitPayment('credit_card', cardData)}
                disabled={loading || !cardData.number || !cardData.cvv}
                className="w-full bg-primary text-background-dark font-black py-4 text-xs uppercase tracking-[.2em] hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 rounded shadow-[0_5px_15px_rgba(255,193,7,0.2)]"
              >
                {loading ? 'PROCESSANDO CARTÃO...' : `CONFIRMAR PAGAMENTO - R$ ${installmentOptions.find(o => o.count == cardData.installments)?.total.toFixed(2)}`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Opção Boleto */}
      {!pixOnly && (
        <div className={`border-2 ${selected === 'boleto' ? 'border-primary bg-primary/5' : 'border-white/5 bg-surface/20'} transition-all duration-300 rounded-lg overflow-hidden`}>
          <div className="p-4 flex items-center justify-between cursor-pointer" onClick={() => setSelected('boleto')}>
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-slate-400 scale-125">receipt_long</span>
              <span className={`text-sm font-black uppercase tracking-wider ${selected === 'boleto' ? 'text-white' : 'text-slate-400'}`}>Boleto Bancário</span>
            </div>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selected === 'boleto' ? 'border-primary' : 'border-white/20'}`}>
              {selected === 'boleto' && <div className="w-2.5 h-2.5 bg-primary rounded-full"></div>}
            </div>
          </div>

          {selected === 'boleto' && (
            <div className="px-6 pb-6 pt-2 space-y-4 animate-in fade-in slide-in-from-top-2">
              <div className="bg-black/20 p-4 border-l-2 border-primary space-y-2">
                <p className="text-[10px] text-white/80 font-bold uppercase tracking-widest">Informação Importante</p>
                <p className="text-[9px] text-slate-500 uppercase leading-relaxed font-medium">Boleto pode levar até 3 dias úteis para compensar. Seus tickets serão reservados, mas a confirmação virá apenas após a liquidação bancária.</p>
              </div>
              <button
                onClick={() => onCommitPayment('boleto')}
                disabled={loading}
                className="w-full bg-primary text-background-dark font-black py-4 text-xs uppercase tracking-[.2em] hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 rounded"
              >
                {loading ? 'GERANDO BOLETO...' : `${actionLabel} VIA BOLETO`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Trust Badges - Estilo Profissional Google/SSL */}
      <div className="pt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 opacity-40 hover:opacity-100 transition-opacity duration-500">
        <div className="flex flex-col items-center gap-2">
          <span className="material-symbols-outlined text-primary text-xl">verified_user</span>
          <span className="text-[7px] font-black uppercase tracking-widest text-center">Google Safe<br/>Browsing</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <span className="material-symbols-outlined text-primary text-xl">lock</span>
          <span className="text-[7px] font-black uppercase tracking-widest text-center">SSL 256-bit<br/>Encryption</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <span className="material-symbols-outlined text-primary text-xl">shield_check</span>
          <span className="text-[7px] font-black uppercase tracking-widest text-center">PCI DSS<br/>Compliant</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <span className="material-symbols-outlined text-primary text-xl">security</span>
          <span className="text-[7px] font-black uppercase tracking-widest text-center">Anti-Fraud<br/>Intelligence</span>
        </div>
      </div>
      
      <p className="text-[7px] text-center text-slate-600 font-bold uppercase tracking-[.2em] pt-4">
        Ao confirmar, você aceita nossos Termos de Engajamento e a Política de Operações.
      </p>
    </div>
  );
}
