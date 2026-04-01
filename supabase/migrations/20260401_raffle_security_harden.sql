-- Migration: Raffle Security Harden (Marketplace Safety)
-- Garante que apenas operadores com subconta Asaas ativa possam criar drops.

-- 1. Habilitar RLS na tabela raffles (caso ainda não esteja)
ALTER TABLE public.raffles ENABLE ROW LEVEL SECURITY;

-- 2. Remover políticas de inserção existentes que sejam muito permissivas (opcional, dependendo do estado atual)
-- DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.raffles;

-- 3. Criar nova política de inserção restritiva baseada no Asaas Wallet ID
CREATE POLICY "Drops can only be created by verified Asaas operators" 
ON public.raffles
FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND asaas_wallet_id IS NOT NULL
  )
);

-- 4. Garantir que a política de visualização permita que todos vejam drops ativos
-- CREATE POLICY "Drops are viewable by everyone" 
-- ON public.raffles
-- FOR SELECT
-- USING (status = 'ativo');

-- 5. Garantir que apenas o criador possa editar seus próprios drops
CREATE POLICY "Creators can update their own drops"
ON public.raffles
FOR UPDATE
TO authenticated
USING (creator_id = auth.uid())
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND asaas_wallet_id IS NOT NULL
  )
);
