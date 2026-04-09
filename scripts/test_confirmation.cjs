async function testCheckStatus() {
  const url = 'https://seewdqetyolfmqsiyban.supabase.co/functions/v1/asaas-payment';
  const anonKey = 'sbp_03d22afdf4304bbbe8a439f2ed15c34ccef36d34'; 

  const payload = {
    action: 'CHECK_STATUS',
    asaasId: 'pay_invalid_id' 
  };

  console.log('--- TESTANDO CHECK_STATUS (PRODUÇÃO) ---');
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    console.log('Resposta:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Erro no teste:', err.message);
  }
}

testCheckStatus();
