-- ATUALIZAÇÃO DE CATEGORIAS DE ARMAMENTO
-- Execute no Editor SQL do Supabase.

-- 1. Inserir as novas categorias (ignora erro se o slug já existir)
INSERT INTO public.categories (slug, label, icon) VALUES 
('rifle-assault', 'Rifle Assault', 'crosshair'),
('smg', 'SMG', 'crosshair'),
('lmg', 'LMG', 'crosshair'),
('sniper', 'Sniper', 'crosshair'),
('shotgun', 'Shotgun', 'crosshair'),
('pistola', 'Pistola', 'crosshair')
ON CONFLICT (slug) DO NOTHING;

-- 2. Recategorizar os produtos atuais pelas keywords no nome
UPDATE public.products
SET category_id = (SELECT id FROM public.categories WHERE slug = 'sniper')
WHERE name ILIKE '%sniper%' OR name ILIKE '%msr%' OR name ILIKE '%l96%' OR name ILIKE '%vsr10%';

UPDATE public.products
SET category_id = (SELECT id FROM public.categories WHERE slug = 'pistola')
WHERE name ILIKE '%pistol%' OR name ILIKE '%hi-capa%' OR name ILIKE '%kl-92%' OR name ILIKE '%tt-33%' OR name ILIKE '%jw4%' OR name ILIKE '%viper%' OR name ILIKE '%glock%' OR name ILIKE '%1911%' OR name ILIKE '%sig sauer%';

UPDATE public.products
SET category_id = (SELECT id FROM public.categories WHERE slug = 'shotgun')
WHERE name ILIKE '%shotgun%' OR name ILIKE '%m870%' OR name ILIKE '%ksg%';

UPDATE public.products
SET category_id = (SELECT id FROM public.categories WHERE slug = 'lmg')
WHERE name ILIKE '%lmg%' OR name ILIKE '%m249%' OR name ILIKE '%rpk%' OR name ILIKE '%machine gun%';

UPDATE public.products
SET category_id = (SELECT id FROM public.categories WHERE slug = 'smg')
WHERE name ILIKE '%smg%' OR name ILIKE '%mp5%' OR name ILIKE '%ump%' OR name ILIKE '%p90%' OR name ILIKE '%vector%' OR name ILIKE '%arp9%' OR name ILIKE '%mp7%' OR name ILIKE '%mac-10%';

UPDATE public.products
SET category_id = (SELECT id FROM public.categories WHERE slug = 'rifle-assault')
WHERE name ILIKE '%rifle%' OR name ILIKE '%aeg%' OR name ILIKE '%m4 %' OR name ILIKE '%ak47%' OR name ILIKE '%ak74%' OR name ILIKE '%hk416%' OR name ILIKE '%carbine%' OR name ILIKE '%sbr%';
