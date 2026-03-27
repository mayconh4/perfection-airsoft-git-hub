-- 1. Garante que as 4 categorias corretas existem e estão com o label certo que você pediu
INSERT INTO public.categories (slug, label, icon) VALUES 
('rifles', 'Rifles de Assalto', 'my_location'),
('pistolas', 'Pistolas & Sidearms', 'architecture'),
('snipers', 'Sniper de Precisão', 'target'),
('equipamentos', 'Equipamento Tático', 'shield')
ON CONFLICT (slug) DO UPDATE SET label = EXCLUDED.label, icon = EXCLUDED.icon;

-- 2. Atualiza os produtos que a inteligência artificial havia movido para categorias granulares
-- de volta para as 4 categorias genéricas corretas
UPDATE public.products SET category_id = (SELECT id FROM public.categories WHERE slug = 'rifles') WHERE category_id IN (SELECT id FROM public.categories WHERE slug IN ('rifle-assault', 'smg', 'lmg', 'shotgun'));

UPDATE public.products SET category_id = (SELECT id FROM public.categories WHERE slug = 'pistolas') WHERE category_id = (SELECT id FROM public.categories WHERE slug = 'pistola');

UPDATE public.products SET category_id = (SELECT id FROM public.categories WHERE slug = 'snipers') WHERE category_id = (SELECT id FROM public.categories WHERE slug = 'sniper');

-- 3. Agora que os produtos voltaram ao normal, removemos de vez aquelas categorias zumbis criadas!
DELETE FROM public.categories WHERE slug IN ('rifle-assault', 'smg', 'lmg', 'sniper', 'shotgun', 'pistola');
