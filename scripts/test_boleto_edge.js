
const ASAAS_PAYMENT_URL = 'https://seewdqetyolfmqsiyban.supabase.co/functions/v1/asaas-payment';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlZXdkcWV0eW9sZm1xc2l5YmFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NjY3NzksImV4cCI6MjA4OTI0Mjc3OX0.rDUTp0xPGEvnLd-UTw3RqMEquA3lJE4ESIP6dY1VwYY';

async function testBoleto() {
  const payload = {
    orderId: 'TEST_BOLETO_' + Date.now(),
    isGuest: true,
    total: 100.00,
    paymentMethod: 'boleto',
    customerData: { 
      name: 'Teste Boleto', 
      email: 'teste@exemplo.com', 
      cpf: '12345678909', 
      phone: '11999999999' 
    },
    items: [{
      product_id: 'prod_123',
      product_name: 'Produto Teste',
      product_price: 100.00,
      quantity: 1
    }]
  };

  try {
    const res = await fetch(ASAAS_PAYMENT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    console.log('Status:', res.status);
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

testBoleto();
