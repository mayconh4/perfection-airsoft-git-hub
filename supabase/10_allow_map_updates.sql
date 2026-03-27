-- Permitir atualização de mapas para usuários públicos (provisório para testes).
-- Depois, isso será alterado apenas para "Team Admins" ou Donos do Mapa.

CREATE POLICY "Permitir atualizacao publica para testes" ON public.maps
  FOR UPDATE USING (true) WITH CHECK (true);
