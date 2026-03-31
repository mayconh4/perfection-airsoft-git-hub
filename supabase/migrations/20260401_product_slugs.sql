-- ============================================
-- PRODUCT SLUGS: URL CLEAN HQ v2
-- Execute este SQL no SQL Editor do Supabase:
-- https://supabase.com.br/dashboard/project/seewdqetyolfmqsiyban/sql/new
-- ============================================

-- 1. ADICIONAR COLUNA SLUG
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- 2. FUNÇÃO AUXILIAR DE GERAÇÃO DE SLUG (CASE INSENSITIVE & CLEAN)
CREATE OR REPLACE FUNCTION public.generate_product_slug(name TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN lower(regexp_replace(regexp_replace(name, '[^a-zA-Z0-9\s]', '', 'g'), '\s+', '-', 'g'));
END;
$$ LANGUAGE plpgsql;

-- 3. ATUALIZAR PRODUTOS EXISTENTES
UPDATE public.products SET slug = public.generate_product_slug(name) WHERE slug IS NULL;

-- 4. TRIGGER PARA GERAÇÃO AUTOMÁTICA
CREATE OR REPLACE FUNCTION public.trg_fn_generate_product_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := public.generate_product_slug(NEW.name);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_product_slug ON public.products;
CREATE TRIGGER trg_generate_product_slug
BEFORE INSERT OR UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.trg_fn_generate_product_slug();
