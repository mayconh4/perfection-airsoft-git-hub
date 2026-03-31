
-- 🛡️ SISTEMA DE PRIVILÉGIOS TÁTICOS
-- Adiciona coluna de cargo se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'profiles' AND COLUMN_NAME = 'role') THEN
        ALTER TABLE public.profiles ADD COLUMN role TEXT DEFAULT 'user';
    END IF;
END $$;

-- 🎖️ PROMOÇÃO DE COMANDANTE (Admin)
UPDATE public.profiles 
SET role = 'admin' 
WHERE email = 'admin@perfectionairsoft.com.br';

-- 📝 POLÍTICAS DE SEGURANÇA RLS PARA ADMIN
-- Permite que Admins vejam todos os perfis
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" 
ON public.profiles FOR SELECT 
USING (
  auth.uid() IN (
    SELECT id FROM public.profiles WHERE role = 'admin'
  )
);

-- Permite que Admins atualizem status de KYC de qualquer um
DROP POLICY IF EXISTS "Admins can update kyc_status" ON public.profiles;
CREATE POLICY "Admins can update kyc_status" 
ON public.profiles FOR UPDATE 
USING (
  auth.uid() IN (
    SELECT id FROM public.profiles WHERE role = 'admin'
  )
)
WITH CHECK (
  auth.uid() IN (
    SELECT id FROM public.profiles WHERE role = 'admin'
  )
);
