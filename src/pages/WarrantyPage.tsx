export function WarrantyPage() {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-12 max-w-4xl mx-auto">
      <div className="flex items-center gap-2 mb-8 uppercase tracking-[0.3em] text-[10px] font-black text-primary">
        <div className="h-0.5 w-8 bg-primary"></div>
        Garantia de Missão
      </div>
      
      <h1 className="text-4xl font-black text-white tracking-tighter uppercase mb-2">Trocas e Devoluções</h1>
      <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-12">Suporte e Manutenção Tática</p>

      <div className="space-y-10">
        <section className="bg-surface border border-border-tactical p-8">
          <h2 className="text-sm font-black text-primary uppercase tracking-widest mb-6">Arrependimento de Compra (7 Dias)</h2>
          <p className="text-sm text-slate-400 leading-relaxed">Conforme o CDC, você tem 7 dias corridos para desistir da compra. O equipamento deve estar **IMPECÁVEL**, na caixa original e com todos os lacres intactos. Caso haja marcas de uso ou falta de acessórios, a devolução será recusada.</p>
        </section>

        <section className="bg-surface border border-border-tactical p-8">
          <h2 className="text-sm font-black text-primary uppercase tracking-widest mb-6">Garantia Contra Defeitos (90 Dias)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm text-slate-400">
            <div className="space-y-4">
              <p className="font-bold text-white uppercase text-xs tracking-widest">O que cobre:</p>
              <ul className="list-disc list-inside space-y-2">
                <li>Falhas mecânicas internas de fábrica</li>
                <li>Defeitos eletrônicos (em AEGs com Mosfet)</li>
                <li>Vazamentos em magazines GBB (primeiro uso)</li>
              </ul>
            </div>
            <div className="space-y-4">
              <p className="font-bold text-red-500 uppercase text-xs tracking-widest">O que NÃO cobre:</p>
              <ul className="list-disc list-inside space-y-2">
                <li>Quedas ou uso de BBs de má qualidade</li>
                <li>Abertura do equipamento por terceiros</li>
                <li>Uso de baterias incorretas (ex: 11.1v em armas 7.4v)</li>
              </ul>
            </div>
          </div>
        </section>

        <div className="bg-black/40 border border-white/5 p-8 text-center italic">
          <p className="text-slate-500 text-xs mb-4">"Um operador é tão bom quanto seu equipamento. Nós garantimos que o seu nunca te deixe na mão."</p>
          <p className="text-primary font-black text-[10px] uppercase tracking-[0.3em]">- Armeiro Chefe</p>
        </div>
      </div>
    </div>
  );
}
