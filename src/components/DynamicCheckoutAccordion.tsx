import { useState, useMemo, useEffect } from 'react';

type PaymentMethod = 'pix' | 'credit_card' | 'boleto' | 'wallet';

interface Props {
  amount: number;
  loading: boolean;
  pixOnly?: boolean;
  onCommitPayment: (method: PaymentMethod, data?: any) => void;
  actionLabel?: string;
  paymentData?: any; // Dados do pagamento gerado (QR Code, Boleto, etc)
  activeMethod?: string; // Método que está com pagamento ativo
}

export function DynamicCheckoutAccordion({ 
  amount, 
  loading, 
  pixOnly = false, 
  onCommitPayment, 
  actionLabel = 'PAGAR AGORA',
  paymentData,
  activeMethod
}: Props) {
  const [selected, setSelected] = useState<PaymentMethod>((activeMethod as PaymentMethod) || 'pix');
  
  // Sincroniza a aba aberta se um pagamento for gerado externamente
  useEffect(() => {
    if (activeMethod) {
      setSelected(activeMethod as PaymentMethod);
    }
  }, [activeMethod]);

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
      <h2 className="text-xl font-black text-center text-white mb-8 uppercase tracking-widest italic">
        Configuração de <span className="text-primary">Pagamento</span>
      </h2>

      {/* Opção PIX */}
      <div className={`border-2 ${selected === 'pix' ? 'border-primary bg-primary/5 shadow-[0_0_15px_rgba(255,193,7,0.1)]' : 'border-white/5 bg-surface/20'} transition-all duration-300 rounded-lg overflow-hidden`}>
        <div className="p-5 flex items-center justify-between cursor-pointer group" onClick={() => setSelected('pix')}>
          <div className="flex items-center gap-4">
            <span className={`material-symbols-outlined text-[#00bdae] scale-125 transition-transform group-hover:rotate-12 ${selected === 'pix' ? 'opacity-100' : 'opacity-40'}`}>pix</span>
            <div>
              <span className={`text-sm font-black uppercase tracking-wider block ${selected === 'pix' ? 'text-white' : 'text-slate-500'}`}>Pix Instantâneo</span>
              {activeMethod === 'pix' && paymentData && (
                <span className="text-[8px] font-bold text-primary animate-pulse uppercase tracking-widest">● Pagamento Aguardando</span>
              )}
            </div>
          </div>
          <span className={`material-symbols-outlined text-white/20 transition-transform duration-300 ${selected === 'pix' ? 'rotate-180 text-primary' : ''}`}>expand_more</span>
        </div>

        {selected === 'pix' && (
          <div className="px-6 pb-6 pt-2 space-y-5 animate-in fade-in slide-in-from-top-2">
            {activeMethod === 'pix' && paymentData ? (
              <div className="bg-black/40 p-6 border border-primary/20 rounded-lg text-center space-y-4">
                <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Escaneie o QR Code</h4>
                <div className="bg-white p-3 rounded-xl inline-block shadow-2xl">
                   <img src={`data:image/png;base64,${paymentData.qr_code_base64}`} alt="QR PIX" className="w-40 h-40" />
                </div>
                <div className="space-y-2">
                  <p className="text-[9px] font-bold text-slate-500 uppercase">Ou copie o código:</p>
                  <div className="flex gap-2">
                    <input readOnly value={paymentData.qr_code} className="flex-1 bg-black/60 border border-white/10 px-3 py-2 text-[9px] font-mono text-white/50 truncate rounded" />
                    <button onClick={() => { navigator.clipboard.writeText(paymentData.qr_code); alert('Copiado!'); }} className="px-3 py-2 bg-primary text-black font-black uppercase text-[9px] rounded">Copiar</button>
                  </div>
                </div>
                <div className="text-[8px] text-slate-600 font-bold uppercase animate-pulse">Aguardando confirmação tática do sistema...</div>
              </div>
            ) : (
              <>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                  Liberação imediata após a confirmação. O QR Code será gerado após clicar no botão abaixo.
                </p>
                <button
                  onClick={() => onCommitPayment('pix')}
                  disabled={loading}
                  className="w-full bg-primary text-background-dark font-black py-4 text-xs uppercase tracking-[.2em] hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 rounded"
                >
                  {loading ? 'GERANDO ACESSO...' : `${actionLabel} VIA PIX`}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Opção Cartão de Crédito */}
      {!pixOnly && (
        <div className={`border-2 ${selected === 'credit_card' ? 'border-primary bg-primary/5' : 'border-white/5 bg-surface/20'} transition-all duration-300 rounded-lg overflow-hidden`}>
          <div className="p-5 flex items-center justify-between cursor-pointer group" onClick={() => setSelected('credit_card')}>
            <div className="flex items-center gap-4">
              <span className={`material-symbols-outlined text-amber-500 scale-125 transition-transform group-hover:rotate-12 ${selected === 'credit_card' ? 'opacity-100' : 'opacity-40'}`}>credit_card</span>
              <span className={`text-sm font-black uppercase tracking-wider ${selected === 'credit_card' ? 'text-white' : 'text-slate-500'}`}>Cartão de Crédito</span>
            </div>
            <span className={`material-symbols-outlined text-white/20 transition-transform duration-300 ${selected === 'credit_card' ? 'rotate-180 text-primary' : ''}`}>expand_more</span>
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
                {loading ? 'AUTORIZANDO OPERAÇÃO...' : `CONFIRMAR PAGAMENTO - R$ ${installmentOptions.find(o => o.count == cardData.installments)?.total.toFixed(2)}`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Opção Boleto */}
      {!pixOnly && (
        <div className={`border-2 ${selected === 'boleto' ? 'border-primary bg-primary/5' : 'border-white/5 bg-surface/20'} transition-all duration-300 rounded-lg overflow-hidden`}>
          <div className="p-5 flex items-center justify-between cursor-pointer group" onClick={() => setSelected('boleto')}>
            <div className="flex items-center gap-4">
              <span className={`material-symbols-outlined text-slate-400 scale-125 transition-transform group-hover:rotate-12 ${selected === 'boleto' ? 'opacity-100' : 'opacity-40'}`}>receipt_long</span>
              <div>
                <span className={`text-sm font-black uppercase tracking-wider block ${selected === 'boleto' ? 'text-white' : 'text-slate-500'}`}>Boleto Bancário</span>
                {activeMethod === 'boleto' && paymentData && (
                  <span className="text-[8px] font-bold text-primary animate-pulse uppercase tracking-widest">● Boleto Disponível</span>
                )}
              </div>
            </div>
            <span className={`material-symbols-outlined text-white/20 transition-transform duration-300 ${selected === 'boleto' ? 'rotate-180 text-primary' : ''}`}>expand_more</span>
          </div>

          {selected === 'boleto' && (
            <div className="px-6 pb-6 pt-2 space-y-5 animate-in fade-in slide-in-from-top-2">
              {activeMethod === 'boleto' && paymentData ? (
                <div className="bg-black/40 p-6 border border-primary/20 rounded-lg text-center space-y-5 text-wrap overflow-hidden">
                  <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Boleto Gerado com Sucesso</h4>
                  
                  <div className="space-y-4">
                    <div className="bg-black/60 p-4 border border-white/5 rounded">
                      <p className="text-[8px] text-slate-500 uppercase font-black mb-2">Linha Digitável:</p>
                      <p className="text-[10px] font-mono text-primary break-all">{paymentData.identificationField}</p>
                    </div>

                    <div className="flex gap-2">
                      <button onClick={() => { navigator.clipboard.writeText(paymentData.identificationField); alert('Linha copiada!'); }} 
                        className="flex-1 bg-white/5 border border-white/10 text-white font-black py-3 text-[9px] uppercase tracking-widest hover:bg-white/10 rounded">
                        Copiar Código
                      </button>
                      <a href={paymentData.bankSlipUrl} target="_blank" rel="noreferrer" 
                        className="flex-1 bg-primary text-black font-black py-3 text-[9px] uppercase tracking-widest hover:brightness-110 rounded">
                        Ver PDF
                      </a>
                    </div>
                  </div>
                  <p className="text-[8px] text-slate-600 font-bold uppercase">Compensação em até 3 dias úteis.</p>
                </div>
              ) : (
                <>
                  <div className="bg-black/20 p-4 border-l-2 border-primary space-y-2">
                    <p className="text-[9px] text-slate-500 uppercase leading-relaxed font-bold">O boleto leva até 3 dias úteis para compensar. Seus tickets serão reservados, mas a confirmação virá apenas após a liquidação.</p>
                  </div>
                  <button
                    onClick={() => onCommitPayment('boleto')}
                    disabled={loading}
                    className="w-full bg-primary text-background-dark font-black py-4 text-xs uppercase tracking-[.2em] hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 rounded"
                  >
                    {loading ? 'GERANDO BOLETO...' : `${actionLabel} VIA BOLETO`}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Trust Badges */}
      <div className="pt-8 grid grid-cols-4 gap-4 opacity-50">
        <div className="flex flex-col items-center gap-2">
          <span className="material-symbols-outlined text-primary text-lg">verified_user</span>
          <span className="text-[6px] font-black uppercase tracking-widest text-center">Protocolo Seguro</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <span className="material-symbols-outlined text-primary text-lg">lock</span>
          <span className="text-[6px] font-black uppercase tracking-widest text-center">SSL 256-bit</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <span className="material-symbols-outlined text-primary text-lg">shield_check</span>
          <span className="text-[6px] font-black uppercase tracking-widest text-center">PCI DSS</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <span className="material-symbols-outlined text-primary text-lg">security</span>
          <span className="text-[6px] font-black uppercase tracking-widest text-center">Anti-Fraude</span>
        </div>
      </div>
    </div>
  );
}
