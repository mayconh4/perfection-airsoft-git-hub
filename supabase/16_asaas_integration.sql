-- ============================================
-- 16_ASAAS_INTEGRATION.SQL
-- Adiciona campos de compliance (KYC) e split no perfil do usuário
-- Execute este script no SQL Editor do Supabase:
-- https://supabase.com/dashboard/project/seewdqetyolfmqsiyban/sql/new
-- ============================================

DO $$
BEGIN
  -- 1. Adiciona o ID da Wallet/Subconta gerada no Asaas
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='asaas_wallet_id') THEN
    ALTER TABLE public.profiles ADD COLUMN asaas_wallet_id TEXT;
  END IF;

  -- 2. Adiciona o CPF/CNPJ (Obrigatório por lei para split de pagamento)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='cpf_cnpj') THEN
    ALTER TABLE public.profiles ADD COLUMN cpf_cnpj TEXT;
  END IF;

  -- 3. Status da Verificação KYC (pending, approved, rejected)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='kyc_status') THEN
    ALTER TABLE public.profiles ADD COLUMN kyc_status TEXT DEFAULT 'pending';
  END IF;
  
  -- 4. Opcional: Tipo da Chave Pix (CPF, EMAIL, PHONE, RANDOM) exigido pelo Asaas
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='pix_key_type') THEN
    ALTER TABLE public.profiles ADD COLUMN pix_key_type TEXT;
  END IF;
END $$;
