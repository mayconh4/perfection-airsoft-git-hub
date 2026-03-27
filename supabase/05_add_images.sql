-- Este script serve para adicionar a coluna que armazenará as múltiplas imagens extras dos produtos.
-- Acesse o painel do Supabase -> SQL Editor -> Novo Query -> Cole e execute este código.

ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';

-- Atualizaçao opcional: Garante que os valores 'images' dos registros existentes sejam vazios (caso sejam null).
UPDATE public.products 
SET images = '{}' 
WHERE images IS NULL;
