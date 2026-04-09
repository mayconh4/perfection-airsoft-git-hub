import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf8');
const urlMatch = envContent.match(/VITE_SUPABASE_URL=(.+)/);
const keyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY=(.+)/);

const SUPABASE_URL = urlMatch[1].trim();
const SUPABASE_ANON_KEY = keyMatch[1].trim();

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testRLS() {
  console.log('Testing RLS for anon key on "orders" table...');
  
  // Try to find an order
  const { data: order, error: fetchError } = await supabase.from('orders').select('id').limit(1).single();
  
  if (fetchError) {
    console.error('Fetch error (maybe table empty or RLS):', fetchError.message);
    return;
  }
  
  console.log('Found order:', order.id);
  
  // Try to update it (this is what the proxy does)
  const { error: updateError } = await supabase.from('orders').update({ status: 'pago' }).eq('id', order.id);
  
  if (updateError) {
    console.error('Update error (Likely RLS):', updateError.message);
  } else {
    console.log('✅ Update SUCCESSFUL with anon key (RLS might be weak or disabled)');
  }
}

testRLS();
