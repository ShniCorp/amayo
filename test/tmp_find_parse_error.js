const fs=require('fs'); const acorn=require('acorn');
const path='/home/shni/amayo/amayo/src/server/views/partials/dashboard/dashboard_items.ejs';
const s=fs.readFileSync(path,'utf8'); const m=s.match(/<script[^>]*>([\s\S]*?)<\/script>/i); if(!m){ console.error('NO_SCRIPT'); process.exit(2);} const src=m[1];
let low=0, high=src.length, bad=-1;
while(low<high){ const mid=Math.floor((low+high)/2); try{ acorn.parse(src.slice(0,mid),{ecmaVersion:2020}); low=mid+1; }catch(err){ bad=mid; high=mid; }}
console.log('first bad index approx', bad);
const start=Math.max(0,bad-120), end=Math.min(src.length,bad+120);
const snippet=src.slice(start,end);
console.log('snippet around bad:\n', snippet.replace(/\n/g,'\n'));
// also show line/col of bad via counting
const pre=src.slice(0,bad); const lines=pre.split('\n'); console.log('line',lines.length,'col',lines[lines.length-1].length+1);
