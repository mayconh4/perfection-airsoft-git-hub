-- Migração: Níveis de Confiança e Progressão Tática
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS trust_level INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS completed_drops INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS trust_score FLOAT DEFAULT 0.0;

-- Comentários para documentação
COMMENT ON COLUMN profiles.trust_level IS 'Nível de confiança tática (0=Recruta, 3=Sargento/Saque Instantâneo)';
COMMENT ON COLUMN profiles.completed_drops IS 'Quantidade de drops finalizados e entregues com sucesso';
