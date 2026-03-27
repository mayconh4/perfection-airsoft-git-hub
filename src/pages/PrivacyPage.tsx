export function PrivacyPage() {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-12 max-w-4xl mx-auto">
      <div className="flex items-center gap-2 mb-8 uppercase tracking-[0.3em] text-[10px] font-black text-primary">
        <div className="h-0.5 w-8 bg-primary"></div>
        Protocolo de Segurança
      </div>
      
      <h1 className="text-4xl font-black text-white tracking-tighter uppercase mb-2">Política de Privacidade</h1>
      <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-12">Tratamento de Dados e LGPD</p>

      <div className="space-y-12">
        <section className="bg-surface border border-border-tactical p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <span className="material-symbols-outlined text-6xl">security</span>
          </div>
          <h2 className="text-sm font-black text-primary uppercase tracking-widest mb-6 border-b border-primary/20 pb-2">1. Coleta de Inteligência</h2>
          <div className="text-sm text-slate-400 space-y-4 leading-relaxed">
            <p>A Perfection Airsoft coleta apenas os dados essenciais para o processamento de sua missão (compra). Isso inclui: Nome completo, CPF (obrigatório para nota fiscal de armas de pressão), E-mail, Telefone e Endereço de Extração (entrega).</p>
            <p>Essas informações são armazenadas em servidores criptografados e não são compartilhadas com agências de terceiros, exceto operadoras de logística e processadores de pagamento autorizados.</p>
          </div>
        </section>

        <section className="bg-surface border border-border-tactical p-8">
          <h2 className="text-sm font-black text-primary uppercase tracking-widest mb-6 border-b border-primary/20 pb-2">2. Uso de Cookies (Rastreadores)</h2>
          <div className="text-sm text-slate-400 space-y-4 leading-relaxed">
            <p>Utilizamos cookies táticos para manter sua sessão ativa e lembrar dos itens em seu arsenal (carrinho). Você pode desativar o rastreamento em seu navegador, mas isso pode comprometer a funcionalidade da plataforma de suprimentos.</p>
          </div>
        </section>

        <section className="bg-surface border border-border-tactical p-8">
          <h2 className="text-sm font-black text-primary uppercase tracking-widest mb-6 border-b border-primary/20 pb-2">3. Seus Direitos (LGPD)</h2>
          <div className="text-sm text-slate-400 space-y-4 leading-relaxed">
            <p>Conforme a Lei Geral de Proteção de Dados, você tem o direito de solicitar a extração ou exclusão total de seus dados de nossa base a qualquer momento, desde que não haja pendências de pedidos em trânsito.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
