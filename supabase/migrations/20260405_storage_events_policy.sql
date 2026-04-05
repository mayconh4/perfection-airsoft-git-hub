-- ================================================
-- MIGRATION: Políticas de Storage para Eventos
-- Perfection Airsoft — MVP de Eventos
-- Data: 2026-04-05
-- ================================================

-- 1. Garantir que o bucket 'events' existe
INSERT INTO storage.buckets (id, name, public)
SELECT 'events', 'events', true
WHERE NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'events'
);

-- 2. Habilitar RLS no bucket (já vem por padrão em storage.objects)

-- 3. Políticas para o bucket 'events'

-- Permitir INSERT para usuários autenticados
-- Restrição opcional: apenas na pasta do próprio usuário (events/{user_id}/*)
CREATE POLICY "Allow authenticated upload to events"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'events');

-- Permitir SELECT público para visualização das capas das missões
CREATE POLICY "Allow public select from events"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'events');

-- Permitir UPDATE/DELETE para o dono do arquivo
CREATE POLICY "Allow owners to manage their event images"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'events' AND auth.uid()::text = (storage.foldername(name))[1]);
