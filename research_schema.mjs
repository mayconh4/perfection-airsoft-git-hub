const URL = 'https://seewdqetyolfmqsiyban.supabase.co/rest/v1/orders?select=*&limit=1';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlZXdkcWV0eW9sZm1xc2l5YmFuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcxMzI3MzE3OSwiZXhwIjoyMDY4ODQ5MTc5fQ.t9l9_c_j_bX6C2I6Xq_7At4zjrxpsQ0vjZR4gOvzgZ3s7kBzyt';

async function check() {
  try {
    const resp = await fetch(URL, { headers: { 'apikey': KEY, 'Authorization': 'Bearer ' + KEY } });
    const data = await resp.json();
    if (data.length > 0) {
      console.log('Columns:', Object.keys(data[0]).join(', '));
    } else {
      console.log('No data found in orders table.');
    }
  } catch (e) {
    console.error('Error fetching schema:', e.message);
  }
}
check();
