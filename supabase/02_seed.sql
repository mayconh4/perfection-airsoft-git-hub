-- ============================================
-- SEED: Categorias + Produtos
-- Execute APÓS o schema (01_schema.sql)
-- ============================================

-- Categorias
INSERT INTO public.categories (slug, label, icon, description) VALUES
  ('rifles', 'Rifles', 'deployed_code', 'Rifles de assalto, DMR e CQB de alta performance'),
  ('pistolas', 'Pistolas', 'handyman', 'Sidearms GBB e NBB para operações secundárias'),
  ('snipers', 'Snipers', 'target', 'Bolt action e DMR de precisão para longo alcance'),
  ('acessorios', 'Acessórios', 'build', 'Miras, grips, lanternas e upgrades táticos'),
  ('equipamentos', 'Equipamentos', 'shield', 'Coletes, capacetes, luvas e proteção tática'),
  ('bbs', 'BBs & Gas', 'science', 'Munição, gás green, CO2 e suprimentos'),
  ('pecas', 'Peças', 'settings', 'Gearbox, molas, pistons e peças de reposição'),
  ('promocoes', 'Promoções', 'local_offer', 'Ofertas especiais e descontos limitados');

-- Produtos
INSERT INTO public.products (name, brand, price, old_price, image_url, badge, category_id, system, description, stock, specs) VALUES
  ('M4A1 MK18 MOD 1 NGRS', 'TOKYO MARUI', 6450.00, NULL,
   'https://lh3.googleusercontent.com/aida-public/AB6AXuBCY1PwNb2SmrJV1Gh1UJLsczLU7V5sLxcbPQyslLwEWWzJaYzdTITtqLWTcSF9It8jxagyZ6rOF39PCJn6VedrcA2w56-XTw2E5aK_PkjSB-vk1jZv6RxFgX1aFYN90SQR59SX6IGumKQEOszB2fBIdqrt4XcL7EphFHL2qByBhhmrrW8W7iVzjorR0rTGK22TpIxdeaHMU2t3m3yj5ChJk__6rv2-vFrSgYmfI43YXdJjtcE64CjSkyyBcCt1NFPG8oX-BIFG9qg',
   'Destaque', (SELECT id FROM public.categories WHERE slug = 'rifles'), 'AEG',
   'Sistema NGRS Next Generation com recuo elétrico realista. Construção full metal CNC.', 15,
   '{"fps": "380 (.20g)", "weight": "3.2kg", "length": "780mm", "barrel": "300mm 6.03mm", "mag_capacity": "82 BBs", "fire_modes": "Safe/Semi/Auto"}'),

  ('HK416 A5 AEG - RAL8000', 'UMAREX / VFC', 4890.00, NULL,
   'https://lh3.googleusercontent.com/aida-public/AB6AXuDvO7eSmNcSbHmNGmvwVCUgjgfWCdqaav_spARRKPyT2POA1e2iuPruDsW3a7XG1L171QcN3Bo0UboUAudTpWMjVqADw12cia_LZrvqHfNHigrKdtdRBoK8l6I3LeoYe5NicIAjPgfDPNgy1Zigj-CBWoKJwm04_dkFcQtaHt1dSG4JNwxdHRDFHxIg3jy3rfHyg7_IRqr_OUH1p2TTW6eoW-BnKsYiJD1PoehMOERwfxx0nPBP3lGOlw7V-ApWtsCMjNMK1CjnsrA',
   'Novo', (SELECT id FROM public.categories WHERE slug = 'rifles'), 'AEG',
   'Réplica licenciada HK416 com acabamento RAL8000 terrestre. Gearbox V2 aprimorada.', 8,
   '{"fps": "370 (.20g)", "weight": "3.5kg", "length": "740mm", "barrel": "275mm", "mag_capacity": "300 BBs", "fire_modes": "Safe/Semi/Auto"}'),

  ('WARSPORT LVOA-C FDE', 'KRYTAC', 5200.00, NULL,
   'https://lh3.googleusercontent.com/aida-public/AB6AXuCAp92IyHep9vKntZq_uTrHOJd4D80475NEYWW0lY9xEry1Msx6lEtgIhqmzQx_sTPMub3VXYy7Oppz6VouQzOAiCjtyr4xWeBXRs4DASeF8bkGMf67KoXKYRmMoOwmQSecjIdPdBrBkI3w6dPpqyme94NiBZ80b8oYrY2vNNroXAtiPTX1_9ORr65FY7RlxGQY8Ivk4kzpa_UnlcC6lEXp5NkX9UUN1nDUXS6PPSCQTohITEyimPS9Do-BtlEwQ8VaWc9sZ7tMmi8',
   NULL, (SELECT id FROM public.categories WHERE slug = 'rifles'), 'AEG',
   'Design LVOA exclusivo com handguard monolítico. Motor Krytac de alta torque.', 5,
   '{"fps": "350 (.20g)", "weight": "2.9kg", "length": "680mm", "barrel": "250mm", "mag_capacity": "300 BBs", "fire_modes": "Safe/Semi/Auto"}'),

  ('AK-105 ZENTICO CUSTOM', 'LCT AIRSOFT', 4250.00, NULL,
   'https://lh3.googleusercontent.com/aida-public/AB6AXuCCdrN4ncmY23Zg4lHG-fiqwK60FoDalaLxu0cLL4eFelyknims58jxWxEbeSotee4ALD1_jkewmAp99ecUamm7eEDQ6-SIrnUbwIVRIS13HKlKf_9gfY81IrG11LILtZXnUEBhpnkd0SWD3-YrhVFD-QAmHXoHyNV26ZjDpEX6MiQiYcAx9CX-cqYs-uzXJwU3o59Ul1k3_7UOirYPdzzynZxWbIUGo7A-9efztk2fe2lI1n4AHjqd7hO5z2d5ZeDyNqn_z2EmQYo',
   NULL, (SELECT id FROM public.categories WHERE slug = 'rifles'), 'AEG',
   'Plataforma AK com upgrade Zenitco completo. Corpo em aço estampado premium.', 3,
   '{"fps": "390 (.20g)", "weight": "3.8kg", "length": "940mm", "barrel": "360mm", "mag_capacity": "130 BBs", "fire_modes": "Safe/Semi/Auto"}'),

  ('ARP9 2.0 PDW AEG', 'G&G ARMAMENT', 2950.00, NULL,
   'https://lh3.googleusercontent.com/aida-public/AB6AXuCm-xJOYl15JqS-OBXk4UpWxY_jKqf0XqGyvcxHxpymk-BZtcu7e-5AM1lFCw7JSOWsgkJMnkO3q9533pO44ivsUOig6yqwP6oCJ7TqRMzN2PehwbMld26OEWiNQyiCqpMDBysEncSWfX-ZZA4y-_yeSycVyGdxc332ZfeW3qe1cXhdeFIr-gGX3X_acrh940o_rDq_FUNHAbPX1qAGJiRy7LasZIDyqTB8h0bOWXTYTRrmOQHTZeGnrHJjLKvOTj_fDAo8E039n-c',
   NULL, (SELECT id FROM public.categories WHERE slug = 'rifles'), 'AEG',
   'PDW ultra-compacto para CQB. Uma das melhores relações custo-benefício do mercado.', 20,
   '{"fps": "330 (.20g)", "weight": "2.1kg", "length": "500mm", "barrel": "128mm", "mag_capacity": "60 BBs", "fire_modes": "Safe/Semi/Auto"}'),

  ('M4A1 MWS GBBR ZET', 'TOKYO MARUI', 8900.00, NULL,
   'https://lh3.googleusercontent.com/aida-public/AB6AXuA-M5kcXl9yjnnDyQQ8hBboQMNIcwbrs1otGNEfKh7HKqvQvRT7rgA9xPty5YvsXRxLRBoIpMy8TqtSCQMd0pB_VDLFgAiv9V2K6qaA0ZmAngVfubbPSn0W5CSC307J0XmTt-6v83zLh0VAv7r5Z6fJO2damXNPIa8cn9hQsmTx96-FaRKOu1fYyMiAbnP30GzmfGCoQs35f7vueQ1WbGgoDjHQ3Mp3DX3M8fvvYF_6sE5QI7WIaIZvswfhQvJ_2a_IJB2bM3KJ_QM',
   NULL, (SELECT id FROM public.categories WHERE slug = 'rifles'), 'GBB',
   'O topo de linha da Tokyo Marui. Sistema ZET com bolt carrier reforçado e recuo devastador.', 2,
   '{"fps": "350 (.20g)", "weight": "3.1kg", "length": "780mm", "barrel": "250mm 6.03mm", "mag_capacity": "35 BBs", "fire_modes": "Safe/Semi/Auto"}'),

  ('GLOCK 17 GEN5 MOS GBB', 'TOKYO MARUI', 1890.00, NULL,
   'https://lh3.googleusercontent.com/aida-public/AB6AXuBCY1PwNb2SmrJV1Gh1UJLsczLU7V5sLxcbPQyslLwEWWzJaYzdTITtqLWTcSF9It8jxagyZ6rOF39PCJn6VedrcA2w56-XTw2E5aK_PkjSB-vk1jZv6RxFgX1aFYN90SQR59SX6IGumKQEOszB2fBIdqrt4XcL7EphFHL2qByBhhmrrW8W7iVzjorR0rTGK22TpIxdeaHMU2t3m3yj5ChJk__6rv2-vFrSgYmfI43YXdJjtcE64CjSkyyBcCt1NFPG8oX-BIFG9qg',
   NULL, (SELECT id FROM public.categories WHERE slug = 'pistolas'), 'GBB',
   'A pistola mais popular do mundo agora em Gen5 com MOS (Modular Optic System).', 25,
   '{"fps": "280 (.20g)", "weight": "720g", "length": "186mm", "barrel": "97mm", "mag_capacity": "25 BBs", "fire_modes": "Semi"}'),

  ('M40A5 BOLT ACTION', 'TOKYO MARUI', 3500.00, NULL,
   'https://lh3.googleusercontent.com/aida-public/AB6AXuCAp92IyHep9vKntZq_uTrHOJd4D80475NEYWW0lY9xEry1Msx6lEtgIhqmzQx_sTPMub3VXYy7Oppz6VouQzOAiCjtyr4xWeBXRs4DASeF8bkGMf67KoXKYRmMoOwmQSecjIdPdBrBkI3w6dPpqyme94NiBZ80b8oYrY2vNNroXAtiPTX1_9ORr65FY7RlxGQY8Ivk4kzpa_UnlcC6lEXp5NkX9UUN1nDUXS6PPSCQTohITEyimPS9Do-BtlEwQ8VaWc9sZ7tMmi8',
   NULL, (SELECT id FROM public.categories WHERE slug = 'snipers'), 'Spring',
   'Sniper bolt action de precisão. Ideal para jogos milsim e operações de longo alcance.', 7,
   '{"fps": "430 (.20g)", "weight": "4.2kg", "length": "1170mm", "barrel": "430mm 6.01mm", "mag_capacity": "9 BBs", "fire_modes": "Bolt Action"}'),

  ('RED DOT HOLOSIGHT T1', 'ELEMENT', 450.00, NULL,
   'https://lh3.googleusercontent.com/aida-public/AB6AXuCCdrN4ncmY23Zg4lHG-fiqwK60FoDalaLxu0cLL4eFelyknims58jxWxEbeSotee4ALD1_jkewmAp99ecUamm7eEDQ6-SIrnUbwIVRIS13HKlKf_9gfY81IrG11LILtZXnUEBhpnkd0SWD3-YrhVFD-QAmHXoHyNV26ZjDpEX6MiQiYcAx9CX-cqYs-uzXJwU3o59Ul1k3_7UOirYPdzzynZxWbIUGo7A-9efztk2fe2lI1n4AHjqd7hO5z2d5ZeDyNqn_z2EmQYo',
   NULL, (SELECT id FROM public.categories WHERE slug = 'acessorios'), NULL,
   'Mira red dot estilo Aimpoint T1 com mount QD. 11 níveis de intensidade.', 30,
   '{"type": "Red Dot", "battery": "CR2032", "mount": "20mm Picatinny"}'),

  ('PLATE CARRIER TACTICAL V2', 'EMERSON', 890.00, NULL,
   'https://lh3.googleusercontent.com/aida-public/AB6AXuDvO7eSmNcSbHmNGmvwVCUgjgfWCdqaav_spARRKPyT2POA1e2iuPruDsW3a7XG1L171QcN3Bo0UboUAudTpWMjVqADw12cia_LZrvqHfNHigrKdtdRBoK8l6I3LeoYe5NicIAjPgfDPNgy1Zigj-CBWoKJwm04_dkFcQtaHt1dSG4JNwxdHRDFHxIg3jy3rfHyg7_IRqr_OUH1p2TTW6eoW-BnKsYiJD1PoehMOERwfxx0nPBP3lGOlw7V-ApWtsCMjNMK1CjnsrA',
   NULL, (SELECT id FROM public.categories WHERE slug = 'equipamentos'), NULL,
   'Colete tático modular com sistema MOLLE. Aceita placas balísticas dummy.', 12,
   '{"material": "Cordura 1000D", "color": "Multicam", "size": "M-XL Ajustável"}'),

  ('BLS BBS 0.28G 3500UN', 'BLS', 120.00, NULL,
   'https://lh3.googleusercontent.com/aida-public/AB6AXuCm-xJOYl15JqS-OBXk4UpWxY_jKqf0XqGyvcxHxpymk-BZtcu7e-5AM1lFCw7JSOWsgkJMnkO3q9533pO44ivsUOig6yqwP6oCJ7TqRMzN2PehwbMld26OEWiNQyiCqpMDBysEncSWfX-ZZA4y-_yeSycVyGdxc332ZfeW3qe1cXhdeFIr-gGX3X_acrh940o_rDq_FUNHAbPX1qAGJiRy7LasZIDyqTB8h0bOWXTYTRrmOQHTZeGnrHJjLKvOTj_fDAo8E039n-c',
   NULL, (SELECT id FROM public.categories WHERE slug = 'bbs'), NULL,
   'BBs de alta precisão 0.28g. Polimento perfeito para uso em rifles e snipers.', 100,
   '{"weight": "0.28g", "quantity": "3500", "material": "Plástico Bio"}'),

  ('GEARBOX V2 COMPLETA CNC', 'SHS', 650.00, NULL,
   'https://lh3.googleusercontent.com/aida-public/AB6AXuA-M5kcXl9yjnnDyQQ8hBboQMNIcwbrs1otGNEfKh7HKqvQvRT7rgA9xPty5YvsXRxLRBoIpMy8TqtSCQMd0pB_VDLFgAiv9V2K6qaA0ZmAngVfubbPSn0W5CSC307J0XmTt-6v83zLh0VAv7r5Z6fJO2damXNPIa8cn9hQsmTx96-FaRKOu1fYyMiAbnP30GzmfGCoQs35f7vueQ1WbGgoDjHQ3Mp3DX3M8fvvYF_6sE5QI7WIaIZvswfhQvJ_2a_IJB2bM3KJ_QM',
   NULL, (SELECT id FROM public.categories WHERE slug = 'pecas'), NULL,
   'Gearbox V2 completa em alumínio CNC. Compatível com M4, MP5, G3.', 18,
   '{"material": "Alumínio CNC 7075", "compatibility": "M4/MP5/G3 V2", "bearings": "8mm Steel"}'),

  ('M4A1 CQBR BLOCK 1 GBB', 'TOKYO MARUI', 4299.00, 4890.00,
   'https://lh3.googleusercontent.com/aida-public/AB6AXuB6ca2V_ljfg0mveleYhDIXFR_bZOjb2jgyNN_5gMXYMlccE9ufQ8-AApmQKKbjACtg4YMteP2vkpxpwnXvkCksYilqpCMTKnecgtEH1z2laA-qXVPQda4cmD05R134oHxPEtCq811_dXHbBGl6M5bWpVua09FYTMI614CF0qJl0wWmck_ZR8_r7ylYE_Ba6TOhDiz4WmwfHuYQRf9pVuWXGITxAb9MuAxenBje0vVNt-oLmrKEUjWO-iihoSB8M3JREm2Y_w0ZF0I',
   'Promoção', (SELECT id FROM public.categories WHERE slug = 'promocoes'), 'GBB',
   'A plataforma M4A1 CQBR Block 1 com sistema ZET. Referência mundial em realismo GBB.', 4,
   '{"fps": "350 (.20g)", "weight": "3.1kg", "length": "700-780mm", "barrel": "250mm 6.03mm", "mag_capacity": "35 BBs", "fire_modes": "Safe/Semi/Auto"}');
