-- Create maps table for tactical fields registration
CREATE TABLE IF NOT EXISTS public.maps (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  operators_limit integer,
  guests_limit integer,
  has_structure boolean DEFAULT false,
  game_modes text[] DEFAULT '{}',
  has_referee boolean DEFAULT false,
  requires_fps_test boolean DEFAULT false,
  city text,
  state text,
  zip_code text,
  maps_url text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS (Row Level Security)
ALTER TABLE public.maps ENABLE ROW LEVEL SECURITY;

-- Allow public read access to maps
CREATE POLICY "Mapas s\u00e3o vis\u00edveis publicamente." ON public.maps
  FOR SELECT USING (true);

-- Allow public insert temporarily until Role Based Access (Team Admins) is implemented
CREATE POLICY "Permitir inser\u00e7\u00e3o publica para testes" ON public.maps
  FOR INSERT WITH CHECK (true);
