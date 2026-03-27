import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';
import 'dotenv/config';

// O script tenta pegar as variáveis do seu arquivo .env na raiz (onde o Vite está configurado)
// Caso não existam, coloque manualmente aqui apenas para rodar o robô localmente.
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'COLOQUE_URL_AQUI';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'COLOQUE_KEY_AQUI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function syncStock() {
  console.log('--- INICIANDO VERIFICAÇÃO DE ESTOQUE (CUSTO ZERO) ---');
  
  // 1. Busca no Supabase os produtos que têm uma URL original salva
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, source_url, stock')
    .not('source_url', 'is', null);

  if (error) {
    console.error('Erro ao buscar produtos no banco:', error);
    return;
  }

  if (!products || products.length === 0) {
     console.log('Nenhum produto cadastrado possui "source_url". Atualize o seu banco de dados primeiro na raspagem!');
     return;
  }

  console.log(`Encontrados ${products.length} produtos para verificar. Iniciando rádio silêncio (requests espaçados)...`);

  let inStockCount = 0;
  let outOfStockCount = 0;
  let failedCount = 0;

  // 2. Checa as URLs uma a uma (com intervalo para não bloquear o IP)
  for (const product of products) {
    console.log(`[ALVO] Verificando: ${product.name}`);
    try {
      const response = await fetch(product.source_url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
           console.log(' => Produto removido do site Arsenal. Marcando como esgotado.');
           await supabase.from('products').update({ stock: 0 }).eq('id', product.id);
           outOfStockCount++;
        } else {
           console.warn(`[!] Erro HTTP ${response.status} ao acessar.`);
           failedCount++;
        }
        continue;
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      // Usando o texto puro da página para detectar a falta de estoque de forma ampla
      const pageText = $('body').text().toUpperCase();
      
      const isOutOfStock = pageText.includes('ESGOTADO') || pageText.includes('INDISPONÍVEL') || pageText.includes('OUT OF STOCK');
      const currentStock = isOutOfStock ? 0 : 10; // Estipula 10 se existir, 0 se não

      // 3. Atualiza no Supabase apenas se houver mudança no estoque para economizar chamadas
      if ((product.stock > 0 && isOutOfStock) || (product.stock === 0 && !isOutOfStock)) {
         await supabase.from('products').update({ stock: currentStock }).eq('id', product.id);
         console.log(` => UPDATE: Estoque modificado para ${currentStock}!`);
      } else {
         console.log(` => Nenhuma mudança detectada. Padrão mantido: ${product.stock}`);
      }

      if (isOutOfStock) outOfStockCount++;
      else inStockCount++;

      // Aguarda 2 segundos antes de tentar a próxima para não sobrecarregar o site deles
      await new Promise(r => setTimeout(r, 2000));

    } catch (err) {
      console.error(`Erro ao verificar:`, err.message);
      failedCount++;
    }
  }

  console.log('--- RELATÓRIO TÁTICO FINALIZADO ---');
  console.log(`Operacionais: ${inStockCount} | Esgotados: ${outOfStockCount} | Falhas/Baixas: ${failedCount}`);
}

syncStock();
