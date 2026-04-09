/**
 * SCRIPT DE TESTE: SIMULAÇÃO DE WEBHOOK ASAAS (PRODUÇÃO)
 * Finalidade: Validar se a Edge Function processa corretamente o pagamento 
 * e dispara as notificações multicanal (E-mail e WhatsApp).
 */

const FUNCTION_URL = "https://seewdqetyolfmqsiyban.supabase.co/functions/v1/asaas-payment";
const WEBHOOK_TOKEN = "whsec_Ebnb6Ee92odJ-cuC3rABYmkD-Sopi45TrJn3nqDiRHk";

const mockPayload = {
  event: "PAYMENT_RECEIVED",
  payment: {
    id: "pay_test_123456",
    customer: "cus_test_789",
    externalReference: "6fac92c1-65f5-46b6-897d-69792404b407", // ID de um pedido real no seu banco para teste
    value: 150.00,
    billingType: "PIX",
    status: "RECEIVED",
    email: "cliente_teste@exemplo.com",
    mobilePhone: "11999999999"
  }
};

async function runTest() {
  console.log("🚀 Iniciando teste de Webhook Multicanal...");
  
  try {
    const response = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "asaas-access-token": WEBHOOK_TOKEN
      },
      body: JSON.stringify(mockPayload)
    });

    const result = await response.json();
    console.log("✅ Resposta da Edge Function:", result);
    
    if (response.ok) {
      console.log("\n[!] VERIFIQUE OS LOGS NO SUPABASE PARA CONFIRMAR:");
      console.log("- 'Status do pedido atualizado para pago'");
      console.log("- 'SMTP SUCCESS' (E-mail Hostinger)");
      console.log("- 'WhatsApp API' (Status do disparo Meta)");
    } else {
      console.error("❌ Falha no teste:", result);
    }
  } catch (error) {
    console.error("❌ Erro de conexão:", error);
  }
}

runTest();
