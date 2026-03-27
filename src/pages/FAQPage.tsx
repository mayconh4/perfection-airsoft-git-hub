import { useState, useEffect } from 'react';
import { SEO } from '../components/SEO';

const faqs = [
  {
    q: "Qual o prazo de despacho após a compra?",
    a: "Nossa Equipe de Logística (Logistics Ops) despacha o equipamento em até 24h úteis após a confirmação do pagamento. O código de rastreio é injetado no rádio do seu Dashboard assim que a transportadora confirma a extração."
  },
  {
    q: "Quais documentos preciso para comprar uma Airsoft?",
    a: "Por lei federal brasileira, você deve ser maior de 18 anos. Solicitamos apenas seu CPF e um documento de identificação com foto para emissão da nota fiscal eletrônica, que deve sempre acompanhar o equipamento."
  },
  {
    q: "Como funciona a garantia de 90 dias?",
    a: "Cobre defeitos de fabricação em engrenagens, motor e parte eletrônica. Danos por mau uso (quedas, baterias incompatíveis ou abertura do equipamento) anulam o protocolo de garantia."
  },
  {
    q: "Como recebo os tickets das missões (jogos)?",
    a: "Após a compra via plataforma, você receberá um QR Code Tático por e-mail e no seu Dashboard. Esse código será sua chave de entrada no campo de batalha."
  },
  {
    q: "As réplicas acompanham a ponta laranja?",
    a: "Sim. Todas as nossas réplicas são enviadas com o item de segurança obrigatório por lei (Ponta Laranja ou Vermelha). A remoção é de inteira responsabilidade do operador."
  }
];

export default function FAQPage() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen pt-32 pb-20 bg-background-dark">
      <SEO 
        title="Central de Ajuda | Perfection Airsoft" 
        description="Dúvidas frequentes e suporte operacional tático."
      />

      <div className="container mx-auto px-6 max-w-3xl">
        <header className="mb-16 text-center">
          <div className="flex items-center justify-center gap-4 mb-4">
            <span className="h-px w-12 bg-primary"></span>
            <span className="text-primary font-black uppercase tracking-[0.4em] text-xs">Briefing de Suporte</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter mb-4">
            Dúvidas <span className="text-primary">Frequentes</span>
          </h1>
          <p className="text-slate-500 text-xs uppercase tracking-widest font-bold">Central de Inteligência Operacional</p>
        </header>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div 
              key={index}
              className={`border border-border-tactical transition-all duration-300 ${activeIndex === index ? 'bg-surface border-primary/40' : 'bg-background-dark/50 hover:border-primary/20'}`}
            >
              <button 
                onClick={() => setActiveIndex(activeIndex === index ? null : index)}
                className="w-full flex items-center justify-between p-6 text-left group"
              >
                <span className={`text-xs font-black uppercase tracking-widest transition-colors ${activeIndex === index ? 'text-primary' : 'text-white'}`}>
                  {faq.q}
                </span>
                <span className={`material-symbols-outlined transition-transform duration-300 ${activeIndex === index ? 'rotate-180 text-primary' : 'text-slate-600'}`}>
                  expand_more
                </span>
              </button>
              
              <div 
                className={`overflow-hidden transition-all duration-300 ${activeIndex === index ? 'max-h-96' : 'max-h-0'}`}
              >
                <div className="p-6 pt-0 text-slate-400 text-xs font-mono leading-relaxed border-t border-white/5 mt-2">
                  <p className="pl-4 border-l-2 border-primary/20">
                    {faq.a}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-20 p-8 border border-dashed border-primary/20 text-center rounded-sm">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-6 leading-relaxed">
            Não encontrou a resposta tática que precisava? <br /> Acione o canal de emergência.
          </p>
          <a 
            href="/contato" 
            className="bg-primary text-background-dark font-black py-4 px-10 text-[10px] uppercase tracking-[0.3em] inline-block hover:bg-white transition-colors"
          >
            Abrir Chamado SAC
          </a>
        </div>
      </div>
    </div>
  );
}
