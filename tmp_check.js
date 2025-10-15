const fs = require('fs');
const path = '/home/shni/amayo/amayo/src/server/views/partials/dashboard/dashboard_items.ejs';
const s = fs.readFileSync(path,'utf8');
const m = s.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
if(!m){ console.error('NO_SCRIPT'); process.exit(2); }
const src = m[1];
console.log('SCRIPT LENGTH:', src.length);
let stack = [];
const opens = {'(':')','[':']','{':'}'};
const closes = {')':'(',']':'[','}':'{'};
let inSingle=false, inDouble=false, inTemplate=false, inComment=false, inLineComment=false, escape=false;
let lastSingle=-1, lastDouble=-1, lastTemplate=-1;
for(let i=0;i<src.length;i++){
  const ch = src[i];
  const next = src[i+1] || '';
  if(inComment){ if(ch==='*' && next==='/' ){ inComment=false; i++; continue; } else continue; }
  if(inLineComment){ if(ch==='\n'){ inLineComment=false; continue; } else continue; }
  if(escape){ escape=false; continue; }
  if(ch==='\\') { escape=true; continue; }
  if(!inSingle && !inDouble && !inTemplate){
    if(ch==='/' && next==='*'){ inComment=true; i++; continue; }
    if(ch==='/' && next==='/'){ inLineComment=true; i++; continue; }
  }
  if(!inDouble && !inTemplate && ch==="'") { inSingle = !inSingle; if(inSingle) lastSingle = i; continue; }
  if(!inSingle && !inTemplate && ch==='"') { inDouble = !inDouble; if(inDouble) lastDouble = i; continue; }
  if(!inSingle && !inDouble && ch==='`') { inTemplate = !inTemplate; if(inTemplate) lastTemplate = i; continue; }
  if(inSingle || inDouble || inTemplate) continue;
  if(opens[ch]){ stack.push({ch, i}); continue; }
  if(closes[ch]){
    if(stack.length===0){ console.error('UNMATCHED_CLOSE', ch, 'at', i); process.exit(3); }
    const top = stack.pop();
    if(top.ch !== closes[ch]){ console.error('MISMATCH', top, 'close', ch, 'at', i); process.exit(4); }
  }
}
if(inSingle || inDouble || inTemplate) {
  console.error('UNTERMINATED_STRING');
  if(inSingle) console.error('lastSingle@', lastSingle, 'context=>', src.slice(Math.max(0,lastSingle-60), lastSingle+60));
  if(inDouble) console.error('lastDouble@', lastDouble, 'context=>', src.slice(Math.max(0,lastDouble-60), lastDouble+60));
  if(inTemplate) console.error('lastTemplate@', lastTemplate, 'context=>', src.slice(Math.max(0,lastTemplate-60), lastTemplate+60));
}
if(stack.length) console.error('UNMATCHED_OPEN', stack[stack.length-1], 'context=>', src.slice(Math.max(0,stack[stack.length-1].i-40), stack[stack.length-1].i+40));
console.log('DONE');
process.exit(0);
