'use strict';
const TOKEN = 'sbp_0686f3a1dd1043f22d6431453716cfe93c9ab05d';
const REF = 'seewdqetyolfmqsiyban';

const sql = `
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
CREATE POLICY "Anyone can create orders" ON public.orders FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can create order items" ON public.order_items;
CREATE POLICY "Anyone can create order items" ON public.order_items FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can create raffle tickets" ON public.raffle_tickets;
CREATE POLICY "Anyone can create raffle tickets" ON public.raffle_tickets FOR INSERT TO public WITH CHECK (true);

SELECT tablename, policyname, cmd FROM pg_policies 
WHERE tablename IN ('orders','order_items','raffle_tickets') ORDER BY tablename, cmd;
`;

fetch('https://api.supabase.com/v1/projects/' + REF + '/database/query', {
    method: 'POST',
    headers: {
        'Authorization': 'Bearer ' + TOKEN,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
}).then(r => {
    console.log('Status:', r.status);
    return r.json();
}).then(d => {
    console.log('Result:', JSON.stringify(d).slice(0, 1000));
}).catch(e => console.error('ERRO:', e.message));
