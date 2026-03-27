-- Cria a tabela de Avalia\u00e7\u00f5es e Coment\u00e1rios dos Mapas
CREATE TABLE IF NOT EXISTS public.map_reviews (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  map_id uuid REFERENCES public.maps(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  user_name text DEFAULT 'Operador An\u00f4nimo',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ativa RLS
ALTER TABLE public.map_reviews ENABLE ROW LEVEL SECURITY;

-- Permite leitura p\u00fablica dos relat\u00f3rios
CREATE POLICY "Map reviews viewable by everyone" ON public.map_reviews
  FOR SELECT USING (true);

-- Permite inser\u00e7\u00e3o p\u00fablica para testes (sem autentica\u00e7\u00e3o estrita inicial)
CREATE POLICY "Public review insert" ON public.map_reviews
  FOR INSERT WITH CHECK (true);
