const fs=require('fs'); const acorn=require('acorn');
const path='/home/shni/amayo/amayo/src/server/views/partials/dashboard/dashboard_items.ejs';
const s=fs.readFileSync(path,'utf8'); const m=s.match(/<script[^>]*>([\s\S]*?)<\/script>/i); const src=m[1];
const tok = acorn.tokenizer(src,{ecmaVersion:2020});
let t; while((t=tok.getToken()).type.label!=='eof'){
  if(t.start>=2600 && t.start<=3050){ console.log(t.start, t.end, t.type.label, t.value); }
}
console.log('done');
