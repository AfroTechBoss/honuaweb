const fs = require('fs');
let c = fs.readFileSync('components/screens/admin.tsx', 'utf8');
c = c.replace(/Â·/g, '·');   // Â· -> ·
c = c.replace(/â/g, '→'); // â†' -> →
c = c.replace(/â¢/g, '•'); // â€¢ -> •
c = c.replace(/â/g, '–'); // â€" -> –
c = c.replace(/â/g, '—'); // em dash
c = c.replace(/â/g, '‘'); // left single quote
c = c.replace(/â/g, '’'); // right single quote
c = c.replace(/Ã©/g, 'é');   // Ã© -> é
c = c.replace(/Ã¼/g, 'ü');   // Ã¼ -> ü
fs.writeFileSync('components/screens/admin.tsx', c, 'utf8');
console.log('done');
