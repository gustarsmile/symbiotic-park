import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { readData } from './helpers/data.js';
import { eachString } from './helpers/sourced.js';

// Lists every file under dir, with forward slashes. It skips what is never published: installed packages, git's own
// folder, the lock file, images, and the two git-ignored folders of work notes and browser captures.
const SKIP_DIRS = new Set(['node_modules', '.git', '.superpowers', '.playwright-mcp']);
const IMAGE = /\.(png|jpe?g|gif|webp|ico|svg)$/i;
function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name) || name === 'package-lock.json') continue;
    const p = join(dir, name).replace(/\\/g, '/');
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (!IMAGE.test(name)) out.push(p);
  }
  return out;
}
const code = (f) => readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

describe('公開前的守門', () => {
  it('walk 真的走得到檔案，也跳過不公開的資料夾', () => {
    const all = walk('.');
    expect(all).toContain('js/boot.js');
    expect(all.some((p) => p.startsWith('node_modules/') || p.startsWith('.superpowers/') || p.startsWith('.playwright-mcp/'))).toBe(false);
  });
  it('程式的字串裡沒有中文（內容都在資料檔）', () => {
    const files = walk('js').filter((p) => p.endsWith('.js') && !p.includes('/data/') && !p.endsWith('config.js'));
    expect(files.length).toBeGreaterThan(20);
    for (const f of files) expect(code(f), f).not.toMatch(/[　-〿一-鿿＀-￯]/);
  });
  it('程式不用 Object.hasOwn（iOS 15.4 以前沒有；用 hasOwnProperty.call）', () => {
    for (const f of walk('js').filter((p) => p.endsWith('.js'))) expect(code(f), f).not.toMatch(/Object\.hasOwn\b/);
  });
  it('engine 不碰畫面，也不用真實時間', () => {
    const files = walk('js/engine');
    expect(files.length).toBeGreaterThan(5);
    for (const f of files) expect(code(f), f).not.toMatch(/\bdocument\b|\bwindow\b|setTimeout|setInterval|Date\.now|performance\.now|requestAnimationFrame/);
  });
  it('會公開的檔案裡沒有本機路徑與信箱', () => {
    for (const f of walk('.').filter((p) => !p.endsWith('guard.test.js')))
      expect(readFileSync(f, 'utf8'), f).not.toMatch(/[A-Za-z]:\\Users\\|\/[a-z]\/Users\/|雲端硬碟|@gmail\.com/);
  });
  it('專案裡沒有設計文件、施工計畫與 WorldPeace 的文件', () => {
    for (const f of walk('.')) expect(f).not.toMatch(/設計文件|實作計畫|交接文件|運作設計|產品線規劃/);
  });
  it('整個網站沒有分數、排名、時間銀行的字眼', () => {
    let n = 0;
    eachString(readData(), (s) => { n++; expect(s).not.toMatch(/時間銀行|排行榜|積分|徽章|第 \d+ 名/); });
    expect(n).toBeGreaterThan(500);
  });
});
