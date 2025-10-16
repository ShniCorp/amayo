const fs = require('fs');
const path = 'src/server/public/assets/js/dashboard_items.js';
const src = fs.readFileSync(path, 'utf8');

let stack = [];
let inSingle = false, inDouble = false, inTpl = false;
let inLineComment = false, inBlockComment = false;

for (let i = 0; i < src.length; i++) {
  const ch = src[i];
  const prev = src[i - 1];
  const next = src[i + 1];

  // comments
  if (!inSingle && !inDouble && !inTpl) {
    if (!inBlockComment && ch === '/' && next === '/') { inLineComment = true; continue; }
    if (!inLineComment && ch === '/' && next === '*') { inBlockComment = true; i++; continue; }
  }
  if (inLineComment) { if (ch === '\n') inLineComment = false; continue; }
  if (inBlockComment) { if (ch === '*' && next === '/') { inBlockComment = false; i++; } continue; }

  // strings
  if (!inDouble && !inTpl && ch === "'" && prev !== '\\') { inSingle = !inSingle; continue; }
  if (!inSingle && !inTpl && ch === '"' && prev !== '\\') { inDouble = !inDouble; continue; }
  if (!inSingle && !inDouble && ch === '`' && prev !== '\\') { inTpl = !inTpl; continue; }
  if (inSingle || inDouble || inTpl) continue;

  if (ch === '(' || ch === '{' || ch === '[') stack.push({ ch, pos: i });
  if (ch === ')' || ch === '}' || ch === ']') {
    const last = stack.pop();
    if (!last) { console.log('UNMATCHED_CLOSE', ch, 'at index', i); process.exit(0); }
    const map = { '(': ')', '{': '}', '[': ']' };
    if (map[last.ch] !== ch) { console.log('MISMATCH', last.ch, 'opened at', last.pos, 'but closed by', ch, 'at', i); process.exit(0); }
  }
}

if (stack.length) {
  const last = stack[stack.length - 1];
  const upTo = src.slice(0, last.pos);
  const line = upTo.split('\n').length;
  const col = last.pos - upTo.lastIndexOf('\n');
  console.log('UNMATCHED_OPEN', last.ch, 'at index', last.pos, 'line', line, 'col', col);
  console.log('--- context ---');
  const start = Math.max(0, last.pos - 120);
  const end = Math.min(src.length, last.pos + 120);
  console.log(src.slice(start, end));
  process.exit(2);
}

console.log('BALANCED');
process.exit(0);
