// Lists every sourced text in js/data/ as one table: file, place in the file, the text, its source.
//   node scripts/sources.mjs                  print the table
//   node scripts/sources.mjs --out <file>     write it as a Markdown file
//   node scripts/sources.mjs --data <dir>     read the data from another folder (default: js/data)
// Exit code 1 when any source says "待確認" (still to be confirmed); those rows come first.
// A development tool: node built-ins only.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DATA_FILES } from '../js/data.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
if (args.includes('--out') && !opt('--out')) { console.error('--out needs a file path'); process.exit(2); }
const dataDir = resolve(opt('--data') ?? resolve(root, 'js/data'));
const outFile = opt('--out');

const join = (path, key) => (typeof key === 'number' ? `${path}[${key}]` : path ? `${path}.${key}` : key);

// What an object that has a source but no `text` says, in a readable line: its heading, its steps, its rows.
function describe(node) {
  const bits = [];
  for (const k of ['mark', 'title', 'head']) if (typeof node[k] === 'string') bits.push(node[k]);
  if (node.type) bits.unshift(`(${node.type})`);
  if (Array.isArray(node.steps)) bits.push(node.steps.filter((s) => typeof s === 'string').join(' → '));
  if (Array.isArray(node.rows)) bits.push(node.rows.map((r) => [r.label, r.value].filter((x) => typeof x === 'string').join(' ')).join('；'));
  return bits.filter(Boolean).join(' ');
}

// Every object that holds a string `source` gives one row, whether or not it has a `text`.
function collect(file, node, path, rows) {
  if (Array.isArray(node)) { node.forEach((v, i) => collect(file, v, join(path, i), rows)); return; }
  if (!node || typeof node !== 'object') return;
  if (typeof node.source === 'string') {
    rows.push({ file, path, text: typeof node.text === 'string' ? node.text : describe(node), source: node.source });
  }
  for (const k of Object.keys(node)) collect(file, node[k], join(path, k), rows);
}

const rows = [];
for (const f of DATA_FILES) collect(f, JSON.parse(readFileSync(resolve(dataDir, f), 'utf8')), '', rows);

const pending = (r) => r.source.includes('待確認');
const ordered = [...rows.filter(pending), ...rows.filter((r) => !pending(r))];
const cell = (s) => String(s).replace(/\|/g, '\|').replace(/\s*\n\s*/g, ' ');
const lines = [
  '# 來源對照表', '',
  `共 ${rows.length} 段，來源有 ${new Set(rows.map((r) => r.source)).size} 種，待確認 ${rows.filter(pending).length} 段。`, '',
  '| 檔案 | 位置 | 文字 | 來源 |', '|---|---|---|---|',
  ...ordered.map((r) => `| \`${r.file}\` | \`${cell(r.path)}\` | ${cell(r.text)} | ${cell(r.source)} |`),
  '',
];
const md = lines.join('\n');
if (outFile) writeFileSync(resolve(outFile), md, 'utf8'); else process.stdout.write(md);
console.error(`rows: ${rows.length}, distinct sources: ${new Set(rows.map((r) => r.source)).size}, pending: ${rows.filter(pending).length}`);
process.exit(rows.some(pending) ? 1 : 0);
