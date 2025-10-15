const fs=require('fs'); const acorn=require('acorn');
const path='/home/shni/amayo/amayo/src/server/views/partials/dashboard/dashboard_items.ejs';
const s=fs.readFileSync(path,'utf8'); const m=s.match(/<script[^>]*>([\s\S]*?)<\/script>/i); if(!m){ console.error('NO_SCRIPT'); process.exit(2);} const src=m[1];
const tok = acorn.tokenizer(src, {ecmaVersion:2020});
let t; const stack=[];
while((t=tok.getToken()).type.label!=='eof'){
  const lb = t.type.label;
  if(lb==='(' || lb==='[' || lb==='{'){
    stack.push({ch:lb,pos:t.start});
    if(t.start>2600 && t.start<3100) console.log('PUSH', lb, 'pos', t.start, 'stacklen', stack.length);
  }
  if(lb===')' || lb===']' || lb==='}'){
    const expected = (lb===')'? '(' : (lb===']'? '[' : '{'));
    if(t.start>2600 && t.start<3100) console.log('POP', lb, 'pos', t.start, 'expect', expected, 'stacklen(before)', stack.length);
    if(stack.length===0){ console.error('UNMATCHED_CLOSE', lb, 'at', t.start); process.exit(3); }
    const top = stack.pop();
    if(top.ch !== expected){ console.error('MISMATCH', top, 'vs', lb, 'at', t.start); process.exit(4); }
  }
}
console.log('FINISHED, stacklen', stack.length);
