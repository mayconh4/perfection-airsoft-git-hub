-- ========================================================
-- PROTOCOLO DE PERSISTÊNCIA DE SORTEIO ÚNICO
-- ========================================================

-- 1. Adiciona campos de resultado definitivo na tabela de raffles
ALTER TABLE public.raffles 
ADD COLUMN IF NOT EXISTS winner_number INT,
ADD COLUMN IF NOT EXISTS drawn_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS draw_confirmed BOOLEAN DEFAULT FALSE;

-- 2. Comentário Informativo
COMMENT ON COLUMN public.raffles.winner_number IS 'Número sorteado definitivo e único.';
COMMENT ON COLUMN public.raffles.drawn_at IS 'Data e hora da extração oficial.';

-- 3. Visibilidade
-- Garante que todos possam ver quem ganhou
ALTER TABLE public.raffles ENABLE ROW LEVEL SECURITY;
-- (A política de SELECT já existe como true, então todos verão os novos campos)
