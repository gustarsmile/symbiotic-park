import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
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
    expect(day).toContain('href="https://fonts.gstatic.com" crossorigin');
    expect(day).toContain('href="../css/park.css"');
    expect(day).toContain('<script type="module" src="../js/main.js">');
    expect(day).not.toMatch(/(href|src)="\//);
    expect(day).not.toMatch(/gtag|googletagmanager|analytics/);
  });
  it('後面的程式要用到的元素都在', () => {
    for (const id of IDS) expect(day).toContain(`id="${id}"`);
  });

  const LOADING = '園區載入中……';
  const NO_JS = '這個網站要開啟 JavaScript 才看得到。請換一個瀏覽器，或把 JavaScript 打開。';
  const openTag = (id) => new RegExp(`<div id="${id}"[^>]*>`).exec(day)[0];

  it('程式還沒載好時看得到「園區載入中……」（在一個面板裡）；其他層一開始都收著', () => {
    expect(openTag('start')).not.toMatch(/\bhidden\b/);
    expect(day).toMatch(new RegExp(`<div id="start" class="overlay">\\s*<div class="panel" id="loading">\\s*<p class="lead">${LOADING}</p>`));
    for (const id of ['hud', 'sheet', 'intro', 'end', 'load-error']) expect(openTag(id), id).toMatch(/\bhidden\b/);
  });

  it('沒開 JavaScript：兩個頁面都有一句說明；體驗頁把「載入中」那行藏起來', () => {
    expect(day).toMatch(new RegExp(`<div class="panel" id="loading">\\s*<p class="lead">${LOADING}</p>\\s*<noscript><p class="lead">${NO_JS}</p></noscript>\\s*</div>`));
    expect(day).toMatch(/<head>[\s\S]*<noscript><style>#loading > \.lead\{display:none\}<\/style><\/noscript>[\s\S]*<\/head>/);
    expect(home).toContain(`<noscript><p>${NO_JS}</p></noscript>`);
    expect(home).toMatch(/http-equiv="refresh" content="0; ?url=day\/"/);       // no script needed to get to day/
    expect(home).not.toMatch(/<script/);
  });

  it('程式檔載不到時的備援：模組後面一小段一般的程式，掛在模組的 error 上、打開再試一次、按了重新載入；裡面沒有中文', () => {
    const scripts = [...day.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)].map((m) => ({ attrs: m[1], body: m[2] }));
    expect(scripts.map((s) => s.attrs.trim())).toEqual(['type="module" src="../js/main.js"', '']);
    const hook = scripts[1].body;
    expect(hook).toContain(`querySelector('script[type="module"]')`);
    expect(hook).toContain(`addEventListener('error'`);
    expect(hook).toContain(`getElementById('load-error').hidden = false`);
    expect(hook).toContain('location.reload()');
    expect(hook).not.toMatch(/[　-〿一-鿿＀-￯]/);
  });
  it('分享預覽圖是 1200×630 的 PNG；小圖示存在', () => {
    const b = readFileSync('assets/og.png');
    expect(b.readUInt32BE(16)).toBe(1200); expect(b.readUInt32BE(20)).toBe(630);
    expect(existsSync('assets/favicon.png')).toBe(true);
    expect(day).toContain('rel="icon" type="image/png" href="../assets/favicon.png"');
    expect(home).toContain('href="assets/favicon.png"');
  });
});
