/**
 * Script tático de simulação de Webhook Asaas
 * Finaliza um pedido simulando a confirmação de pagamento do Pix via Sandbox.
 */

const SUPABASE_ANON_KEY = "SUA_CHAVE_ANON_AQUI"; // Pegar do arquivo .env ou do CheckoutPage.tsx
const EDGE_FUNCTION_URL = "http://localhost:54321/functions/v1/asaas-payment"; // Ajustar para sua porta local do supabase
const WEBHOOK_TOKEN = "whsec_Ebnb6Ee92odJ-cuC3rABYmkD-Sopi45TrJn3nqDiRHk";

async function simulatePixConfirmation(orderId) {
  console.log(`🚀 Iniciando simulação de confirmação Pix para o pedido: ${orderId}`);

  const payload = {
    event: "PAYMENT_RECEIVED",
    payment: {
      id: "pay_simulated_" + Date.now(),
      externalReference: orderId,
      status: "RECEIVED",
      value: 49.99,
      netValue: 48.00,
      billingType: "PIX",
      confirmedDate: new Date().toISOString().split('T')[0],
      paymentDate: new Date().toISOString().split('T')[0],
      clientPaymentDate: new Date().toISOString().split('T')[0],
      email: "operador_teste@perfection.com",
      mobilePhone: "11999999999"
    }
  };

  try {
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'asaas-access-token': WEBHOOK_TOKEN,
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ SUCESSO: Webhook processado pela Edge Function.');
      console.log('Result:', result);
      console.log('\n--- VERIFICAÇÃO ---');
      console.log('1. Olhe para a aba do seu navegador com o checkout aberto.');
      console.log('2. O modal "Protocolo Ativado" deve aparecer com a mensagem "Pix confirmado".');
    } else {
      console.error('❌ ERRO na Edge Function:', result);
    }
  } catch (error) {
    console.error('❌ FALHA na conexão:', error.message);
  }
}

// Para usar: node scripts/test_pix_webhook.js <ORDER_ID>
const orderId = process.argv[2];
if (!orderId) {
  console.error('ERRO: Informe o ID do pedido (ex: node scripts/test_pix_webhook.js f1b2...)');
  process.exit(1);
}

simulatePixConfirmation(orderId);
