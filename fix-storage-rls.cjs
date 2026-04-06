'use strict';
const TOKEN = 'sbp_0335f32e65cc6e7e9c22015533ff2c03bb033c0e';
const REF = 'seewdqetyolfmqsiyban';

const sql = `
-- LIBERAR BUCKET EVENTS
INSERT INTO storage.buckets (id, name, public) 
VALUES ('events', 'events', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- POLÍTICA DE UPLOAD
DROP POLICY IF EXISTS "Allow authenticated upload to events" ON storage.objects;
CREATE POLICY "Allow authenticated upload to events" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'events');

-- POLÍTICA DE LEITURA
DROP POLICY IF EXISTS "Allow public read from events" ON storage.objects;
CREATE POLICY "Allow public read from events" 
ON storage.objects FOR SELECT 
TO public 
USING (bucket_id = 'events');

-- LIBERAR TABELA DE EVENTOS
DROP POLICY IF EXISTS "Allow authenticated insert missions" ON public.events;
CREATE POLICY "Allow authenticated insert missions" 
ON public.events FOR INSERT 
TO authenticated 
WITH CHECK (true);
`;

fetch('https://api.supabase.com/v1/projects/' + REF + '/database/query', {
    method: 'POST',
    headers: {
        'Authorization': 'Bearer ' + TOKEN,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
}).then(r => {
    console.log('📡 STATUS:', r.status);
    return r.json();
}).then(d => {
    console.log('📋 RETORNO:', JSON.stringify(d, null, 2));
    if (d.error || (Array.isArray(d) && d[0]?.error)) {
        console.error('❌ FALHA NO PROTOCOLO');
    } else {
        console.log('✅ PROTOCOLO DE SEGURANÇA ATIVADO: UPLOAD LIBERADO.');
    }
}).catch(e => console.error('🚫 ERRO:', e.message));
