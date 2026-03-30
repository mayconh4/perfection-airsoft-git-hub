-- Atualização para suporte a Split Real
ALTER TABLE IF EXISTS public.financial_transactions 
ADD COLUMN IF NOT EXISTS payout_id TEXT,
ADD COLUMN IF NOT EXISTS payout_status TEXT DEFAULT 'pendente';

-- Garantir que a tabela existe (caso não exista por não estar nas migrations)
CREATE TABLE IF NOT EXISTS public.platform_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fixed_fee_per_ticket NUMERIC(10, 2) DEFAULT 2.50,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir config padrão se vazia
INSERT INTO public.platform_config (fixed_fee_per_ticket)
SELECT 2.50 WHERE NOT EXISTS (SELECT 1 FROM public.platform_config);
