import fs from 'fs';
import path from 'path';

const PROJECT_REF = 'seewdqetyolfmqsiyban';
const envFile = process.cwd() + '/.env.deploy';
let TOKEN = '';
if (fs.existsSync(envFile)) {
    const content = fs.readFileSync(envFile, 'utf8');
    const match = content.match(/^SUPABASE_ACCESS_TOKEN=(.+)$/m);
    if (match) TOKEN = match[1].trim();
}

const sql = `
CREATE TABLE IF NOT EXISTS public.payment_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  external_reference TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT DEFAULT 'pending', 
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_payment_events_ref ON public.payment_events(external_reference);
CREATE INDEX IF NOT EXISTS idx_payment_events_status ON public.payment_events(status);

begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime;
commit;

alter publication supabase_realtime add table public.orders;
`;

async function run() {
    try {
        const resp = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query: sql })
        });
        const data = await resp.text();
        console.log('Status', resp.status);
        console.log('Result:', data);
    } catch (err) {
        console.error('Error', err);
    }
}

run();
