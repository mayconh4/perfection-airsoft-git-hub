import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const url = process.env.VITE_SUPABASE_URL || 'https://seewdqetyolfmqsiyban.supabase.co';
const key = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(url, key);

async function test() {
  const { data, error } = await supabase.from('products').select('*').eq('slug', 'army-armament-magazine-28r-for-gbb-hi-capa-r615').single();
  if (error) {
     console.error("ERRO:", error.message);
  } else {
     console.log("PRODUTO:", data.name);
     console.log("IMAGEM PRINCIPAL (image_url):", data.image_url);
     console.log("IMAGENS (images array):", data.images);
  }
}
test();
