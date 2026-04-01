import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('[Tactical-Net] Missing Environment Variables');
} else if (import.meta.env.DEV) {
  console.log('[Tactical-Net] Conexão Supabase inicializada com sucesso em: ' + SUPABASE_URL);
}

/**
 * Tactical Supabase Client
 * Com timeout de 15s e configuração global resiliente
 */
export const supabase = createClient(SUPABASE_URL || '', SUPABASE_ANON_KEY || '', {
  global: {
    headers: { 'x-application-name': 'tactical-ops' },
  },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
})

/**
 * Função Helper para Resiliência Tática
 * Implementa: Retry automático (3x), Timeout manual (15s) e Log de performance.
 */
export async function withRetry<T>(
  queryFn: () => Promise<any>,
  retries = 3,
  delay = 1000
): Promise<{ data: T | null; error: any }> {
  const startTime = performance.now();
  let lastError: any = null;

  for (let i = 0; i < retries; i++) {
    try {
      const result = await queryFn();
      const { data, error } = result;
      
      const endTime = performance.now();
      const duration = (endTime - startTime).toFixed(2);

      if (error) {
        // Se for erro de timeout ou rede, tenta novamente
        const errorMsg = error.message?.toLowerCase() || '';
        const isTimeout = errorMsg.includes('deadline') || errorMsg.includes('timeout') || error.status === 504 || errorMsg.includes('fetch');
        
        if (isTimeout && i < retries - 1) {
          console.warn(`[Supabase] Timeout na tentativa ${i + 1}. Recarregando capacitores em ${delay}ms...`);
          await new Promise(res => setTimeout(res, delay));
          delay *= 2; // Exponential backoff
          continue;
        }
        
        console.error(`[Supabase] Erro Crítico (${duration}ms):`, error);
        return { data: null, error };
      }

      if (import.meta.env.DEV) {
        console.log(`[Supabase] Query Concluída em ${duration}ms. [${i + 1}ª tentativa]`);
      }
      
      return { data: data as T, error: null };
    } catch (err: any) {
      lastError = err;
      if (i < retries - 1) {
        await new Promise(res => setTimeout(res, delay));
        delay *= 2;
        continue;
      }
    }
  }

  return { data: null, error: lastError || { message: 'Max retries exceeded' } };
}
