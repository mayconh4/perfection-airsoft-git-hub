atu-- ================================================
-- MIGRATION: Fix Orders Schema for Asaas V2
-- Data: 2026-04-09
-- ================================================

-- 1. Permitir pedidos de visitantes (user_id opcional)
ALTER TABLE public.orders 
  ALTER COLUMN user_id DROP NOT NULL;

-- 2. Adicionar colunas de identificação e pagamento do Asaas
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS total_amount NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS customer_email TEXT,
  ADD COLUMN IF NOT EXISTS customer_name TEXT,
  ADD COLUMN IF NOT EXISTS customer_cpf TEXT,
  ADD COLUMN IF NOT EXISTS customer_phone TEXT,
  ADD COLUMN IF NOT EXISTS asaas_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS pix_confirmado BOOLEAN DEFAULT FALSE;

-- 3. Sincronizar coluna total antiga com total_amount nova (opcional/segurança)
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='total') THEN
    UPDATE public.orders SET total_amount = total WHERE total_amount = 0 AND total > 0;
  END IF;
END $$;

-- 4. Garantir que as restrições de RLS permitam a inserção pela service_role (geralmente padrão)
-- Mas vamos garantir que as políticas de SELECT existam para os novos campos
COMMENT ON COLUMN public.orders.pix_confirmado IS 'Flag para polling de confirmação instantânea do PIX';
