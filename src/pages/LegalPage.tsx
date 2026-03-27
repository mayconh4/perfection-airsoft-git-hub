export function LegalPage() {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-2 mb-8">
        <div className="h-1 w-12 bg-primary"></div>
        <span className="text-primary text-xs font-black tracking-widest uppercase">Diretrizes da Missão</span>
      </div>
      <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tighter uppercase mb-8">Termos de Serviço</h1>

      <div className="space-y-8">
        {[
          { title: '1. Termos de Engajamento', content: 'Ao utilizar o site Perfection Airsoft e realizar compras em nossa plataforma, você declara ter no mínimo 18 anos de idade e estar ciente das leis vigentes sobre armas de pressão e airsoft em seu país/estado. As regras apresentadas aqui regem o uso da plataforma, a compra de produtos e a interação com nossos serviços.' },
          { title: '2. Política de Privacidade', content: 'Seus dados pessoais são tratados com a mesma segurança de uma operação classificada. Coletamos apenas as informações necessárias (nome, e-mail, CPF, endereço de entrega) para processar compras e melhorar sua experiência. Seus dados NUNCA serão compartilhados com terceiros não autorizados sem seu consentimento expresso, conforme a LGPD (Lei 13.709/2018).' },
          { title: '3. Política de Trocas e Devoluções', content: 'Itens podem ser devolvidos em até 7 dias corridos após o recebimento, desde que estejam em sua embalagem original, sem marcas de uso. Defeitos de fábrica são cobertos por garantia de 90 dias. Produtos personalizados ou de uso consumível (BBs, gás) não são elegíveis para troca.' },
          { title: '4. Responsabilidade de Uso', content: 'Todos os produtos vendidos na Perfection Airsoft são réplicas airsoft destinadas exclusivamente ao uso recreativo e esportivo. O uso indevido desses equipamentos é de total responsabilidade do comprador. A Perfection Airsoft não se responsabiliza por danos causados pelo mau uso dos itens adquiridos.' },
        ].map(section => (
          <div key={section.title} className="bg-surface border border-border-tactical p-6">
            <h2 className="text-sm font-bold tracking-widest text-primary uppercase mb-4">{section.title}</h2>
            <p className="text-sm text-slate-400 leading-relaxed">{section.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
