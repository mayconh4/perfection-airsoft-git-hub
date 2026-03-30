-- ============================================
-- CRIAÇÃO DA TABELA PROFILES (USUÁRIOS / OPERADORES)
-- Execute este script no SQL Editor do Supabase:
-- https://supabase.com/dashboard/project/seewdqetyolfmqsiyban/sql/new
-- ============================================

-- 1. Criar a tabela `profiles` que se relaciona com `auth.users`
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  pix_key TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Habilitar o RLS (Segurança)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de Acesso
-- Todos podem ver perfis
CREATE POLICY "Public profiles are viewable by everyone" 
ON public.profiles FOR SELECT USING (true);

-- Usuários podem atualizar apenas seu próprio perfil
CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 4. Criar a Trigger para inserir automaticamente o perfil quando alguém se cadastra
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name',
    'user'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Excluir a trigger se já existir para recriar com segurança
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 5. Ligar a trigger à tabela auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 6. Populando a tabela com usuários que já existem (Migração de dados antigos)
INSERT INTO public.profiles (id, full_name, role)
SELECT id, raw_user_meta_data->>'full_name', 'user'
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- 7. Definir o primeiro usuário "admin@perfectionairsoft.com.br" como admin, se ele existir
UPDATE public.profiles 
SET role = 'admin' 
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'admin@perfectionairsoft.com.br'
);
