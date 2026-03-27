-- ============================================
-- ADICIONANDO ENTRADA PARA RASTREIO DE ESTOQUE
-- ============================================

-- Adiciona a coluna source_url para referenciar de onde o produto veio
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS source_url TEXT;
