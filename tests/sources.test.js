import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, cpSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DATA_FILES } from '../js/data.js';
import { readDataFile } from './helpers/data.js';

// An independent count: every string `source` held by any object in any data file.
function countSources(node) {
  if (Array.isArray(node)) return node.reduce((n, v) => n + countSources(v), 0);
  if (!node || typeof node !== 'object') return 0;
  return (typeof node.source === 'string' ? 1 : 0) + Object.values(node).reduce((n, v) => n + countSources(v), 0);
}
const expected = DATA_FILES.reduce((n, f) => n + countSources(readDataFile(f)), 0);

const run = (...args) => spawnSync(process.execPath, ['scripts/sources.mjs', ...args], { encoding: 'utf8' });

describe('scripts/sources.mjs', () => {
  it('資料裡每一個來源都列成一行，沒有漏的', () => {
    expect(expected).toBeGreaterThan(150);
    const dir = mkdtempSync(join(tmpdir(), 'sp-src-'));
    const out = join(dir, 'sources.md');
    const r = run('--out', out);
    expect(r.status).toBe(0);
    expect(existsSync(out)).toBe(true);
    const rows = readFileSync(out, 'utf8').split('\n').filter((l) => /^\| `/.test(l));
    expect(rows.length).toBe(expected);
  });
  it('沒有 --out 就印出來', () => {
    const r = run();
    expect(r.status).toBe(0);
    expect(r.stdout.split('\n').filter((l) => /^\| `/.test(l)).length).toBe(expected);
  });
  it('沒有來源的 ledger 與物的循環也在表裡（有來源、沒有 text）', () => {
    const out = run().stdout;
    expect(out).toContain('days/farm.json');
    expect(out).toContain('intro.json');
    expect(out).toMatch(/ledger/);
  });
  it('來源寫著待確認：結束碼 1，而且那幾段排在最前面', () => {
    const dir = mkdtempSync(join(tmpdir(), 'sp-src-'));
    cpSync('js/data', dir, { recursive: true });
    const file = join(dir, 'ui.json');
    const ui = JSON.parse(readFileSync(file, 'utf8'));
    ui.start.fine = { text: '測試用的一句', source: '待確認' };
    writeFileSync(file, JSON.stringify(ui));
    const r = run('--data', dir);
    expect(r.status).toBe(1);
    const rows = r.stdout.split('\n').filter((l) => /^\| `/.test(l));
    expect(rows[0]).toContain('測試用的一句');
    expect(rows[0]).toContain('待確認');
  });
});
