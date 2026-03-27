export function ShippingPage() {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-12 max-w-4xl mx-auto">
      <div className="flex items-center gap-2 mb-8 uppercase tracking-[0.3em] text-[10px] font-black text-primary">
        <div className="h-0.5 w-8 bg-primary"></div>
        Logística e Extração
      </div>
      
      <h1 className="text-4xl font-black text-white tracking-tighter uppercase mb-2">Envios e Prazos</h1>
      <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-12">Fluxo de Suprimentos Táticos</p>

      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-surface border border-border-tactical p-8">
            <span className="material-symbols-outlined text-primary text-3xl mb-4">local_shipping</span>
            <h3 className="text-xs font-black text-white uppercase tracking-widest mb-4">Prazo de Processamento</h3>
            <p className="text-sm text-slate-400 leading-relaxed">Após a confirmação de pagamento, sua carga leva de 24h a 48h úteis para ser preparada, inspecionada e despachada.</p>
          </div>
          <div className="bg-surface border border-border-tactical p-8">
             <span className="material-symbols-outlined text-primary text-3xl mb-4">map</span>
             <h3 className="text-xs font-black text-white uppercase tracking-widest mb-4">Cobertura Nacional</h3>
             <p className="text-sm text-slate-400 leading-relaxed">Operamos em todo o território brasileiro via transportadoras especializadas no transporte de equipamentos de airsoft.</p>
          </div>
        </div>

        <section className="bg-surface border border-border-tactical p-8">
          <h2 className="text-sm font-black text-primary uppercase tracking-widest mb-6 border-b border-primary/20 pb-2">Rastreamento de Carga</h2>
          <div className="text-sm text-slate-400 space-y-4 leading-relaxed">
            <p>Assim que o despacho for realizado, um código de rastreio será enviado para seu e-mail e disponibilizado em seu **Dashboard de Operador**. Você poderá acompanhar o deslocamento em tempo real através do site da transportadora parceira.</p>
          </div>
        </section>

        <div className="p-4 bg-primary/10 border border-primary/20 flex gap-4 items-center">
           <span className="material-symbols-outlined text-primary">warning</span>
           <p className="text-[10px] text-primary font-black uppercase tracking-widest italic">Atenção: Armas de airsoft devem ser transportadas obrigatoriamente com a Nota Fiscal anexada à caixa.</p>
        </div>
      </div>
    </div>
  );
}
