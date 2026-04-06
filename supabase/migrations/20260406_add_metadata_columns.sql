-- Migração: Adiciona suporte a produtos virtuais (tickets de eventos)
-- Data: 2026-04-06

-- 1. Adiciona coluna metadata em cart_items (se não existir)
ALTER TABLE public.cart_items 
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT NULL;

-- 2. Adiciona coluna metadata em order_items (se não existir)  
ALTER TABLE public.order_items 
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT NULL;

-- 3. Permite product_id nulo em cart_items (para tickets — produto virtual sem FK)
ALTER TABLE public.cart_items 
  ALTER COLUMN product_id DROP NOT NULL;

-- 4. Permite product_id nulo em order_items (para tickets)
ALTER TABLE public.order_items 
  ALTER COLUMN product_id DROP NOT NULL;
