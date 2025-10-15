const fs = require('fs'); const acorn = require('acorn');
const path = '/home/shni/amayo/amayo/src/server/views/partials/dashboard/dashboard_items.ejs';
const s = fs.readFileSync(path,'utf8');
const m = s.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
if(!m){ console.error('NO_SCRIPT'); process.exit(2);} const src = m[1];
try{
  acorn.parse(src, {ecmaVersion:2020});
  console.log('ACORN OK');
}catch(err){
  console.error('ACORN ERR', err.message);
  if(err.loc){
    const lines = src.split('\n');
    const L = err.loc.line; const C = err.loc.column;
    console.error('at line', L, 'col', C);
    const start = Math.max(0, L-4); const end = Math.min(lines.length, L+2);
    for(let i=start;i<end;i++){
      const n = i+1; console.error((n===L? '>' : ' ') + n.toString().padStart(4,' ') + '| ' + lines[i]);
    }
  }
}
