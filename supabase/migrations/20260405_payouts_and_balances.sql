-- ================================================
-- MIGRATION: Gestão Financeira (Saldos e Saques)
-- Perfection Airsoft — Módulo Financeiro MVP
-- Data: 2026-04-05
-- ================================================

-- 1. TABELA user_balances (Saldos Consolidados)
CREATE TABLE IF NOT EXISTS public.user_balances (
  user_id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  available_balance NUMERIC(10,2) DEFAULT 0.00 NOT NULL,
  pending_balance   NUMERIC(10,2) DEFAULT 0.00 NOT NULL,
  total_earned      NUMERIC(10,2) DEFAULT 0.00 NOT NULL,
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABELA payout_requests (Solicitações de Saque)
CREATE TABLE IF NOT EXISTS public.payout_requests (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount            NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  status            TEXT DEFAULT 'pending' NOT NULL 
                      CHECK (status IN ('pending', 'processing', 'paid', 'rejected')),
  pix_key           TEXT,
  pix_type          TEXT,
  receipt_url       TEXT,
  error_message     TEXT,
  processed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. Habilitar RLS
ALTER TABLE public.user_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;

-- 4. POLÍTICAS user_balances
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_balances' AND policyname = 'user_balances_read_own') THEN
    CREATE POLICY "user_balances_read_own" ON public.user_balances
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END; $$;

-- 5. POLÍTICAS payout_requests
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payout_requests' AND policyname = 'payout_requests_read_own') THEN
    CREATE POLICY "payout_requests_read_own" ON public.payout_requests
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END; $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payout_requests' AND policyname = 'payout_requests_insert_own') THEN
    CREATE POLICY "payout_requests_insert_own" ON public.payout_requests
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END; $$;

-- Admin vê tudo
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_balances' AND policyname = 'user_balances_admin_all') THEN
    CREATE POLICY "user_balances_admin_all" ON public.user_balances
      FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
      );
  END IF;
END; $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payout_requests' AND policyname = 'payout_requests_admin_all') THEN
    CREATE POLICY "payout_requests_admin_all" ON public.payout_requests
      FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
      );
  END IF;
END; $$;

-- 6. TRIGGER para criar user_balance automaticamente no cadastro do perfil
CREATE OR REPLACE FUNCTION public.handle_new_user_balance()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_balances (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_created_balance ON public.profiles;
CREATE TRIGGER on_profile_created_balance
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_balance();

-- 7. Função para atualizar saldo (usada por Edge Functions de pagamento)
CREATE OR REPLACE FUNCTION public.update_user_balance(
  p_user_id UUID,
  p_amount  NUMERIC,
  p_type    TEXT -- 'available' ou 'pending'
)
RETURNS VOID AS $$
BEGIN
  IF p_type = 'available' THEN
    UPDATE public.user_balances 
    SET 
      available_balance = available_balance + p_amount,
      total_earned = total_earned + p_amount,
      updated_at = NOW()
    WHERE user_id = p_user_id;
  ELSIF p_type = 'pending' THEN
    UPDATE public.user_balances 
    SET 
      pending_balance = pending_balance + p_amount,
      updated_at = NOW()
    WHERE user_id = p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Incializar saldos para perfis existentes
INSERT INTO public.user_balances (user_id)
SELECT id FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;
