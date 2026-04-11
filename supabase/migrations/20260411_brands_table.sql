-- ============================================================
-- MIGRATION: Tabela de marcas dinâmica
-- ============================================================

CREATE TABLE IF NOT EXISTS public.brands (
  id         UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT    NOT NULL UNIQUE,
  slug       TEXT    NOT NULL UNIQUE,
  logo_url   TEXT,
  website    TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "brands_public_read"  ON public.brands FOR SELECT USING (true);
CREATE POLICY "brands_admin_write"  ON public.brands FOR ALL USING (auth.role() = 'service_role');

-- Seed: marcas já existentes no site
INSERT INTO public.brands (name, slug, logo_url, website) VALUES
  ('Cyma',            'cyma',            'https://logo.clearbit.com/cyma-airsoft.com',      'https://cyma-airsoft.com'),
  ('G&G Armament',    'geg-armament',    'https://logo.clearbit.com/guay2.com',             'https://guay2.com'),
  ('Krytac',          'krytac',          'https://logo.clearbit.com/krytac.com',            'https://krytac.com'),
  ('Tokyo Marui',     'tokyo-marui',     'https://logo.clearbit.com/tokyo-marui.co.jp',     'https://tokyo-marui.co.jp'),
  ('Ares',            'ares',            'https://logo.clearbit.com/aresairsoft.com',       'https://aresairsoft.com'),
  ('VFC',             'vfc',             'https://logo.clearbit.com/vfc-vr16.com',          'https://vfc-vr16.com'),
  ('Rossi',           'rossi',           'https://logo.clearbit.com/rossiairsoft.com.br',   'https://rossiairsoft.com.br'),
  ('KWA',             'kwa',             'https://logo.clearbit.com/kwausa.com',            'https://kwausa.com'),
  ('Cybergun',        'cybergun',        'https://logo.clearbit.com/cybergun.com',          'https://cybergun.com'),
  ('Lancer Tactical', 'lancer-tactical', 'https://logo.clearbit.com/lancertactical.com',   'https://lancertactical.com'),
  ('Classic Army',    'classic-army',    'https://logo.clearbit.com/classicarmyusa.com',   'https://classicarmyusa.com'),
  ('WE',              'we-airsoft',      'https://logo.clearbit.com/we-airsoft.com',        'https://we-airsoft.com')
ON CONFLICT (name) DO NOTHING;
