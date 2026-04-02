-- ========================================================
-- PROTOCOLO DE RESTAURAÇÃO DE INTELIGÊNCIA HQ (OLHO DE DEUS)
-- ========================================================

-- 1. Garante que a coluna de e-mail exista na tabela de perfis
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'email') THEN
        ALTER TABLE public.profiles ADD COLUMN email TEXT;
    END IF;
END $$;

-- 2. Habilita a visibilidade total para o Administrador em public.profiles
-- IMPORTANTE: Substituir pelo e-mail exato do Administrador se for diferente.
DROP POLICY IF EXISTS "Admin can view all profiles" ON public.profiles;
CREATE POLICY "Admin can view all profiles" 
ON public.profiles FOR SELECT 
USING (
  (auth.jwt() ->> 'email') = 'admin@perfectionairsoft.com.br' 
  OR auth.uid() = id
);

-- 3. Função para sincronizar automaticamente o e-mail de auth.users para public.profiles
CREATE OR REPLACE FUNCTION public.handle_profile_sync()
RETURNS TRIGGER AS $$
BEGIN
  -- Atualiza o profile público com o e-mail da conta auth
  UPDATE public.profiles
  SET email = NEW.email
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Trigger para disparar na criação/atualização do usuário
DROP TRIGGER IF EXISTS on_auth_user_sync ON auth.users;
CREATE TRIGGER on_auth_user_sync
  AFTER INSERT OR UPDATE OF email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_profile_sync();

-- 5. Backfill: Sincroniza e-mails de usuários já existentes
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;

-- ========================================================
-- SISTEMA HQ ATUALIZADO: VISIBILIDADE OPERACIONAL 100%
-- ========================================================
