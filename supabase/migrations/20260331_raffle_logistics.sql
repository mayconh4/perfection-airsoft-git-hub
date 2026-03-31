-- Migração: Suporte a Vencedores e Escrow Logístico
CREATE TABLE IF NOT EXISTS raffle_winners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raffle_id UUID REFERENCES raffles(id) ON DELETE CASCADE,
  winner_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  tracking_code TEXT,
  delivery_status TEXT DEFAULT 'pending_shipment', -- pending_shipment, shipped, delivered
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  confirmed_by_winner BOOLEAN DEFAULT FALSE,
  payout_released BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(raffle_id) -- Apenas um vencedor por rifa nesta versão
);

-- Habilitar RLS
ALTER TABLE raffle_winners ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
CREATE POLICY "Public can view winners" ON raffle_winners FOR SELECT USING (true);
CREATE POLICY "Winners can update their own confirmation" ON raffle_winners FOR UPDATE USING (auth.uid() = winner_id);
CREATE POLICY "Organizers can update logistics" ON raffle_winners FOR UPDATE 
  USING (auth.uid() IN (SELECT creator_id FROM raffles WHERE id = raffle_id));
