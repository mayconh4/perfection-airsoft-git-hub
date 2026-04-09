const fs = require('fs');
const txt = fs.readFileSync('deploy_output.txt', 'utf16le');
console.log(txt);
