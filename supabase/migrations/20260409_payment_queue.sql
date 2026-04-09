-- Criar fila de processamento de webhooks
CREATE TABLE IF NOT EXISTS public.payment_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  external_reference TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, processed, failed
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_payment_events_ref ON public.payment_events(external_reference);
CREATE INDEX IF NOT EXISTS idx_payment_events_status ON public.payment_events(status);

-- Habilitar realtime para tabela orders se não estiver habilitado
-- Isso garante que a atualização de status dispare evento no frontend
begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime;
commit;

alter publication supabase_realtime add table public.orders;

-- Função auxiliar para tratar o status com "confirmed"
-- O webhook salvará `confirmed` como solicitado
