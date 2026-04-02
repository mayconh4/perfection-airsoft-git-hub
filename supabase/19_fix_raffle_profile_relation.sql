-- ========================================================
-- PROTOCOLO DE CONEXÃO TÁTICA (RELAÇÃO RAFFLES <-> PROFILES)
-- ========================================================

-- 1. Garante que a coluna creator_id em raffles seja uma Foreign Key para public.profiles
-- Isso permite o join automático no Supabase select('*, profiles(*)')

DO $$ 
BEGIN 
    -- Remove restrição antiga se existir (para evitar conflitos)
    ALTER TABLE IF EXISTS public.raffles DROP CONSTRAINT IF EXISTS raffles_creator_id_fkey;
    
    -- Adiciona a nova chave estrangeira apontando para a tabela de perfis
    ALTER TABLE public.raffles 
    ADD CONSTRAINT raffles_creator_id_fkey 
    FOREIGN KEY (creator_id) 
    REFERENCES public.profiles(id) 
    ON DELETE CASCADE;
END $$;

-- 2. Notifica o PostgREST para recarregar o esquema (opcional, automático)
NOTIFY pgrst, 'reload schema';

-- ========================================================
-- RELAÇÃO SINCRONIZADA: INTELIGÊNCIA HQ LIBERADA
-- ========================================================
