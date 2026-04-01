import fs from 'fs';
const r = await fetch('https://www.perfectionairsoft.com.br/api/og?type=produto&slug=army-armament-magazine-28r-for-gbb-hi-capa-r615');
const text = await r.text();
const match = text.match(/<meta\s+property=["']og:image["']\s+content=["'](.*?)["']/);
fs.writeFileSync('out2.txt', match ? match[1] : 'NOT_FOUND');
console.log(match ? match[1] : 'NOT_FOUND');
