const fs = require('fs');
const path = '/home/shni/amayo/amayo/src/server/views/partials/dashboard/dashboard_items.ejs';
const s = fs.readFileSync(path,'utf8');
const m = s.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
if(!m){ console.error('NO_SCRIPT'); process.exit(2); }
const src = m[1].replace(/\r\n/g,'\n');
const lines = src.split('\n');
for(let i=0;i<lines.length;i++){
  console.log((i+1).toString().padStart(4,' ')+': '+lines[i]);
}
console.log('TOTAL LINES:', lines.length);
