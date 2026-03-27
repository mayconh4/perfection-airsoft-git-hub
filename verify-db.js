const url = 'https://seewdqetyolfmqsiyban.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlZXdkcWV0eW9sZm1xc2l5YmFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NjY3NzksImV4cCI6MjA4OTI0Mjc3OX0.rDUTp0xPGEvnLd-UTw3RqMEquA3lJE4ESIP6dY1VwYY';

async function verify() {
  console.log('Fetching Categories...');
  try {
    const response = await fetch(`${url}/rest/v1/categories?select=id,label`, {
      method: 'GET',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    console.log('Categories:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

verify();
