const url = 'https://seewdqetyolfmqsiyban.supabase.co/rest/v1';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlZXdkcWV0eW9sZm1xc2l5YmFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NjY3NzksImV4cCI6MjA4OTI0Mjc3OX0.rDUTp0xPGEvnLd-UTw3RqMEquA3lJE4ESIP6dY1VwYY';

async function check() {
  console.log('Checking Database Configuration...');
  try {
    const response = await fetch(`${url}/admin_config?select=*`, {
      method: 'GET',
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
    });
    const data = await response.json();
    console.log('Config Table:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error checking config:', err);
  }
}
check();
