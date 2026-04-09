const TOKEN = 'sbp_95d6a1c0e40a378c5c704fc0110f21e724debe27';

async function testToken() {
    console.log('Testing token against Supabase Management API...');
    try {
        const resp = await fetch('https://api.supabase.com/v1/projects', {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        const data = await resp.json();
        if (resp.ok) {
            console.log('✅ TOKEN VALID! Projects found:', data.length);
            console.log('Project IDs:', data.map(p => p.id));
        } else {
            console.error('❌ TOKEN INVALID!', resp.status, data);
        }
    } catch (e) {
        console.error('Error:', e.message);
    }
}

testToken();
