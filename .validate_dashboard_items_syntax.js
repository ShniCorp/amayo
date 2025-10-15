const fs = require('fs');
const path = 'src/server/views/partials/dashboard/dashboard_items.ejs';
try{
  const s = fs.readFileSync(path, 'utf8');
  const m = s.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
  if (!m) { console.error('NO_SCRIPT'); process.exit(2); }
  let script = m[1];
  // replace EJS output tags with empty string literal and remove other EJS tags
  script = script.replace(/<%=([\s\S]*?)%>/g, "''");
  script = script.replace(/<%[\s\S]*?%>/g, '');
  try {
    // quick balance scanner to find likely unclosed tokens
    (function scan() {
      const s2 = script;
      const stack = [];
      let inSingle = false, inDouble = false, inTpl = false;
      let inLineComment = false, inBlockComment = false;
      for (let i = 0; i < s2.length; i++) {
        const ch = s2[i];
        const prev = s2[i-1];
        // comments handling
        if (!inSingle && !inDouble && !inTpl) {
          if (!inBlockComment && ch === '/' && s2[i+1] === '/') { inLineComment = true; continue; }
          if (!inLineComment && ch === '/' && s2[i+1] === '*') { inBlockComment = true; i++; continue; }
        }
        if (inLineComment) { if (ch === '\n') inLineComment = false; continue; }
        if (inBlockComment) { if (ch === '*' && s2[i+1] === '/') { inBlockComment = false; i++; } continue; }
        // string toggles
        if (!inDouble && !inTpl && ch === '\'' && prev !== '\\') { inSingle = !inSingle; continue; }
        if (!inSingle && !inTpl && ch === '"' && prev !== '\\') { inDouble = !inDouble; continue; }
        if (!inSingle && !inDouble && ch === '`' && prev !== '\\') { inTpl = !inTpl; continue; }
        if (inSingle || inDouble || inTpl) continue;
        // brackets
        if (ch === '(' || ch === '{' || ch === '[') stack.push({ ch, pos: i });
        if (ch === ')' || ch === '}' || ch === ']') {
          const last = stack.pop();
          if (!last) { console.error('UNMATCHED_CLOSE', ch, 'at', i); break; }
          const map = { '(':')','{':'}','[':']' };
          if (map[last.ch] !== ch) { console.error('MISMATCH', last.ch, 'opened at', last.pos, 'but closed by', ch, 'at', i); break; }
        }
      }
      if (inSingle || inDouble || inTpl) console.error('UNTERMINATED_STRING_OR_TEMPLATE');
      if (inBlockComment) console.error('UNTERMINATED_BLOCK_COMMENT');
      if (stack.length) {
        const last = stack[stack.length-1];
        // compute line/col
        const upTo = s2.slice(0, last.pos);
        const line = upTo.split('\n').length;
        const col = last.pos - upTo.lastIndexOf('\n');
        console.error('UNMATCHED_OPEN', last.ch, 'at index', last.pos, 'line', line, 'col', col);
        const context = s2.slice(Math.max(0, last.pos-40), Math.min(s2.length, last.pos+40)).replace(/\n/g, '\\n');
        console.error('CONTEXT:', context);
      }
    })();

    // try acorn parse first for better diagnostics (if available)
    try {
      const acorn = require('acorn');
      acorn.parse(script, { ecmaVersion: 2020 });
    } catch (eac) {
      console.error('ACORN_PARSE_ERROR:' + (eac && eac.message ? eac.message : String(eac)));
      if (eac && eac.loc) console.error('loc', eac.loc);
      // fallthrough to vm.Script for older Node versions
    }
    const vm = require('vm');
    new vm.Script(script, { filename: 'dashboard_items_script.js' });
    console.log('OK');
    process.exit(0);
  } catch (e) {
    console.error('SYNTAX_ERROR:' + (e && e.message ? e.message : String(e)));
    if (e && e.stack) console.error(e.stack);
    if (e && typeof e.lineNumber !== 'undefined') console.error('line:' + e.lineNumber + ' col:' + (e.columnNumber||'?'));
    // print first 200 lines for inspection
    const lines = script.split('\n');
    for (let i = 0; i < Math.min(lines.length, 400); i++) {
      const n = (i+1).toString().padStart(4, ' ');
      console.error(n + ': ' + lines[i]);
    }
    process.exit(3);
  }
} catch (e) {
  console.error('READ_ERROR:' + e.message);
  process.exit(4);
}
