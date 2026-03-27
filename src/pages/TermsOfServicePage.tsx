import { useEffect } from 'react';
import { SEO } from '../components/SEO';

export default function TermsOfServicePage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen pt-32 pb-20 bg-background-dark">
      <SEO 
        title="Termos de Serviço | Perfection Airsoft" 
        description="Regras de engajamento e termos de serviço da plataforma Perfection Airsoft."
      />

      <div className="container mx-auto px-6 max-w-4xl">
        <header className="mb-16">
          <div className="flex items-center gap-4 mb-4">
            <span className="h-px w-12 bg-primary"></span>
            <span className="text-primary font-black uppercase tracking-[0.4em] text-xs">Protocolo Legal</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter mb-6">
            Termos de <span className="text-primary">Serviço</span>
          </h1>
          <p className="text-slate-500 text-sm uppercase tracking-widest font-bold">Última Atualização: 26 de Março de 2026</p>
        </header>

        <main className="space-y-12 text-slate-300 leading-relaxed font-mono text-sm border-l border-primary/20 pl-8">
          <section>
            <h2 className="text-white font-black uppercase tracking-widest mb-4 flex items-center gap-3">
              <span className="text-primary">01.</span> Aceitação de Protocolos
            </h2>
            <p>
              Ao acessar a plataforma Perfection Airsoft, o usuário (doravante denominado "Operador") aceita e concorda em cumprir estes termos. Caso não concorde com qualquer diretriz, a extração imediata do site é recomendada.
            </p>
          </section>

          <section>
            <h2 className="text-white font-black uppercase tracking-widest mb-4 flex items-center gap-3">
              <span className="text-primary">02.</span> Elegibilidade do Operador
            </h2>
            <p>
              A aquisição de réplicas de Airsoft no território nacional é restrita a maiores de 18 anos. É responsabilidade do Operador fornecer documentação tática legítima (CPF e ID) conforme solicitado para fins de emissão de Nota Fiscal e transporte.
            </p>
          </section>

          <section>
            <h2 className="text-white font-black uppercase tracking-widest mb-4 flex items-center gap-3">
              <span className="text-primary">03.</span> Conduta em Grupos do Ecossistema
            </h2>
            <p>
              Ao participar de grupos de WhatsApp sincronizados com a Perfection Airsoft, o Operador concorda que seu comportamento reflete na comunidade. Spam, toxicidade ou ofertas não autorizadas resultará na expulsão das fileiras da rede.
            </p>
          </section>

          <section>
            <h2 className="text-white font-black uppercase tracking-widest mb-4 flex items-center gap-3">
              <span className="text-primary">04.</span> Aquisição e Bilheteria
            </h2>
            <p>
              Tickets para missões/jogos são nominais e intransferíveis, salvo indicação contrária na "Briefing de Missão". Reembolsos para tickets de eventos só serão processados se solicitados com até 48h de antecedência à operação.
            </p>
          </section>

          <section>
            <h2 className="text-white font-black uppercase tracking-widest mb-4 flex items-center gap-3">
              <span className="text-primary">05.</span> Propriedade Intelectual
            </h2>
            <p>
              Todos os designs, interfaces HUD e algoritmos de extração são propriedade da Perfection Airsoft. A reprodução não aprovada será tratada como violação de segurança crítica.
            </p>
          </section>
        </main>

        <footer className="mt-20 pt-10 border-t border-white/5 text-center">
          <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em]">Fim do Documento - Perfection HQ</p>
        </footer>
      </div>
    </div>
  );
}
