const fs=require('fs'); const acorn=require('acorn');
const path='/home/shni/amayo/amayo/src/server/views/partials/dashboard/dashboard_items.ejs';
const s=fs.readFileSync(path,'utf8'); const m=s.match(/<script[^>]*>([\s\S]*?)<\/script>/i); if(!m){ console.error('NO_SCRIPT'); process.exit(2);} const src=m[1];
const lines=src.split('\n');
for(let i=1;i<=lines.length;i++){
  const chunk = lines.slice(0,i).join('\n');
  try{ acorn.parse(chunk,{ecmaVersion:2020}); }
  catch(err){ console.error('FAIL at line', i, 'message', err.message); console.error('Error loc', err.loc); console.error('Context:'); const start=Math.max(1,i-5); const end=Math.min(lines.length, i+2); for(let j=start;j<=end;j++){ console.error((j===i? '>' : ' ')+j.toString().padStart(4,' ')+'| '+lines[j-1]); } process.exit(1); }
}
console.log('ALL LINES PARSED OK');
