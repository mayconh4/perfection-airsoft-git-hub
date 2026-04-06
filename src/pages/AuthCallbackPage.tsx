import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

/**
 * Página de callback para confirmação de email e recuperação de senha.
 * O Supabase redireciona para esta rota após clicar no link do email.
 * 
 * O token vem no formato:
 *   - Hash (PKCE off): /#access_token=...&type=signup
 *   - Query (PKCE on): /auth/callback?code=...
 */
export default function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      // 1. Verificar se existe 'code' na URL (padrão PKCE do Supabase moderno)
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');

      try {
        if (code) {
          // Troca explícita do código pela sessão (Handshake Tático)
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
        }

        // 2. Tentar obter a sessão consolidada
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        const next = urlParams.get('next') || '/dashboard';
        if (data.session) {
          // SUCESSO: Sessão estabelecida e e-mail confirmado.
          // Pequeno delay para garantir propagação de estado no AuthContext
          setTimeout(() => navigate(next), 1000);
        } else {
          // Nenhuma sessão — pode ser um link expirado
          navigate(`/login?error=link_expired&redirect=${encodeURIComponent(next)}`);
        }
      } catch (err: any) {
        console.error('Erro no callback de auth:', err.message);
        navigate('/login?error=confirmation_failed');
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background-dark gap-6">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary border-r-transparent" />
      <div className="text-center">
        <p className="text-primary font-black uppercase tracking-[0.4em] text-[10px] animate-pulse">
          VERIFICANDO IDENTIDADE...
        </p>
        <p className="text-slate-600 text-[9px] font-mono uppercase tracking-widest mt-2">
          CONFIRMANDO PROTOCOLO DE ACESSO
        </p>
      </div>
    </div>
  );
}
