-- ============================================
-- NEWSLETTER TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.newsletters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.newsletters ENABLE ROW LEVEL SECURITY;

-- Anyone can subscribe
CREATE POLICY "Anyone can subscribe to newsletter" ON public.newsletters
  FOR INSERT WITH CHECK (true);

-- Only service role / admin can view (adjust as needed for your admin panel)
CREATE POLICY "Only service role can view subscribers" ON public.newsletters
  FOR SELECT USING (auth.jwt() ->> 'role' = 'service_role');
