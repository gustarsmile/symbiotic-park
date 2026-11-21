import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { SITE_URL, PARK_PATH } from '../js/config.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const home = read('index.html');
const day = read('day/index.html');

const IDS = ['stage', 'map', 'hud', 'clock', 'clock-t', 'clock-s', 'speed-btn', 'auto-btn', 'menu-btn',
  'who', 'who-face', 'who-name', 'who-close', 'who-do', 'who-why',
  'task', 'task-step', 'task-title', 'task-note', 'task-go',
  'sheet', 'sh-place', 'sh-title', 'sh-how', 'sh-stage', 'sh-status', 'sh-why', 'sh-next',
  'intro', 'start', 'end', 'load-error', 'load-retry'];

describe('html', () => {
  it('首頁只負責轉到 day/，而且帶著分享用的標籤', () => {
    expect(home).toMatch(/http-equiv="refresh" content="0; ?url=day\/"/);
    expect(home).toContain('<a href="day/">');
    expect(home).toContain(`property="og:url" content="${SITE_URL}"`);
    expect(home).toContain(`content="${SITE_URL}assets/og.png"`);
  });
  it('體驗園區的頁面：相對路徑、字型、標籤、沒有統計', () => {
    expect(day).toContain(`property="og:url" content="${SITE_URL}${PARK_PATH}"`);
    expect(day).toContain('<title>互助共生園區</title>');
    expect(day).toContain('viewport-fit=cover');
    expect(day).toContain('family=Noto+Sans+TC');
    expect(day).toContain('href="../css/park.css"');
    expect(day).toContain('<script type="module" src="../js/main.js">');
    expect(day).not.toMatch(/(href|src)="\//);
    expect(day).not.toMatch(/gtag|googletagmanager|analytics/);
  });
  it('後面的程式要用到的元素都在', () => {
    for (const id of IDS) expect(day).toContain(`id="${id}"`);
  });
});
