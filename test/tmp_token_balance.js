const fs=require('fs'); const acorn=require('acorn');
const path='/home/shni/amayo/amayo/src/server/views/partials/dashboard/dashboard_items.ejs';
const s=fs.readFileSync(path,'utf8'); const m=s.match(/<script[^>]*>([\s\S]*?)<\/script>/i); if(!m){ console.error('NO_SCRIPT'); process.exit(2);} const src=m[1];
const tok = acorn.tokenizer(src, {ecmaVersion:2020});
let token;
const stack=[];
while((token=tok.getToken()).type.label!="eof"){
  const lb = token.type.label;
  if(lb==='(' || lb==='[' || lb==='{') stack.push({ch:lb, pos: token.start});
  if(lb===')' || lb===']' || lb==='}'){
    const expected = (lb===')'? '(' : (lb===']'? '[' : '{'));
    if(stack.length===0){ console.error('UNMATCHED_CLOSE', lb, 'at', token.start); process.exit(3); }
    const top = stack.pop();
    if(top.ch !== expected){ console.error('MISMATCH', top, 'vs', lb, 'at', token.start); process.exit(4); }
  }
}
if(stack.length) console.error('UNMATCHED_OPEN', stack[stack.length-1]); else console.log('BALANCED');
