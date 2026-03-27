-- Migração: Adicionando Rastreamento de Fonte e Status de Disponibilidade
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS source_url TEXT,
ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT true;

-- Garantir que as taxas individuais existam (caso o comando anterior não tenha sido rodado)
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS tax_importer NUMERIC DEFAULT 25,
ADD COLUMN IF NOT EXISTS tax_admin NUMERIC DEFAULT 25,
ADD COLUMN IF NOT EXISTS tax_nf NUMERIC DEFAULT 3;
