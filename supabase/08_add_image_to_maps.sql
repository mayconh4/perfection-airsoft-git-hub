-- Adiciona coluna de imagem na tabela de mapas
ALTER TABLE public.maps ADD COLUMN IF NOT EXISTS image_url text;

-- Cria o bucket de armazenamento (storage) para os mapas se não existir
INSERT INTO storage.buckets (id, name, public) VALUES ('maps', 'maps', true) ON CONFLICT DO NOTHING;

-- Permite leitura publica das imagens
CREATE POLICY "Map images viewable by everyone" ON storage.objects
  FOR SELECT USING (bucket_id = 'maps');

-- Permite upload de imagens (temporariamente aberto para testes)
CREATE POLICY "Map images uploadable" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'maps');
