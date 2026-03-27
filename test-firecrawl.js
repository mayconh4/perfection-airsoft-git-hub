const apiKey = 'fc-8c366cbd77114cb3b5d3dfd4bb61f170';
const url = 'https://www.arsenalsports.com/produto/vfc-rifle-airsoft-aeg-sig-sauer-mcx-virtus-sbr-black.html';

async function test() {
  console.log('Testing Firecrawl...');
  try {
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        url,
        formats: ['json']
      })
    });

    console.log('Status Code:', response.status);
    const data = await response.json();
    console.log('Response Body:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Fetch Error:', error);
  }
}

test();
