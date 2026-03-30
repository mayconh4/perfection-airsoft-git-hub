-- 17_asaas_kyc_fields.sql
-- Adiciona os campos exigidos pela API do Asaas (Sandbox/Produção) para a criação de subcontas

DO $$
BEGIN
  -- Telefone/Celular (Obrigatório Asaas)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='phone') THEN
    ALTER TABLE public.profiles ADD COLUMN phone TEXT;
  END IF;

  -- Endereço: CEP (Obrigatório Asaas)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='cep') THEN
    ALTER TABLE public.profiles ADD COLUMN cep TEXT;
  END IF;

  -- Endereço: Cidade
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='city') THEN
    ALTER TABLE public.profiles ADD COLUMN city TEXT;
  END IF;
  
  -- Endereço: Estado/UF (Obrigatório Asaas)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='state') THEN
    ALTER TABLE public.profiles ADD COLUMN state TEXT;
  END IF;

  -- Endereço: Logradouro (Rua/Avenida)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='street') THEN
    ALTER TABLE public.profiles ADD COLUMN street TEXT;
  END IF;

  -- Endereço: Bairro (Obrigatório Asaas)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='neighborhood') THEN
    ALTER TABLE public.profiles ADD COLUMN neighborhood TEXT;
  END IF;

  -- Endereço: Número (Obrigatório Asaas)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='address_number') THEN
    ALTER TABLE public.profiles ADD COLUMN address_number TEXT;
  END IF;

  -- Endereço: Complemento (Opcional)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='complement') THEN
    ALTER TABLE public.profiles ADD COLUMN complement TEXT;
  END IF;
END $$;
