import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    // Atualiza o estado para que o próximo render mostre a UI de fallback
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log interno do erro (pode ser enviado para Sentry ou similar)
    console.error('[OPERATIONAL FAILURE]:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
          <div className="size-20 bg-primary/10 flex items-center justify-center mb-6 border border-primary/20">
            <span className="material-symbols-outlined text-primary text-4xl animate-pulse">report</span>
          </div>
          <h1 className="text-xl font-black text-white uppercase tracking-[0.3em] mb-4 italic">
            Falha no Protocolo
          </h1>
          <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest max-w-xs leading-relaxed">
            Houve um erro inesperado na transmissão de dados. 
            Por favor, recarregue a página ou contate o suporte tático.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-8 px-8 py-3 bg-primary text-black font-black text-[10px] uppercase tracking-widest hover:bg-white transition-all"
          >
            Recarregar Sistema
          </button>
          
          {/* Mensagem discreta solicitada pelo usuário */}
          <p className="mt-12 text-[8px] text-white/20 font-black uppercase tracking-widest">
            Erro, contate o suporte
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}
