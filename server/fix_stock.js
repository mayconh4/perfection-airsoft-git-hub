import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_KEY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixStock() {
  console.log('--- Aplicando Patch de Estoque: Definindo todos os itens zerados para 10 ---');
  const { data, error } = await supabase
    .from('products')
    .update({ stock: 10 })
    .or('stock.eq.0,stock.is.null');

  if (error) {
    console.error('Erro ao atualizar banco:', error);
  } else {
    console.log('Sucesso! Produtos agora estão disponíveis para venda.');
  }
}

fixStock();
