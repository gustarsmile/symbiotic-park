// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { boot } from '../js/boot.js';
import { mountPage } from './helpers/page.js';
import { installFakeCanvas } from './helpers/canvas.js';
import { readDataFile } from './helpers/data.js';

// Answers every data request from disk, like the site would.
const fileOf = (url) => String(url).split('/js/data/')[1] ?? String(url).split('data/')[1];
const diskFetch = (url) => {
  try {
    const body = readDataFile(fileOf(url));
    return Promise.resolve({ ok: true, status: 200, json: async () => body });
  } catch { return Promise.resolve({ ok: false, status: 404, json: async () => ({}) }); }
};
const memory = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }; };

let restore, queue, now, stops, hidden;
const makeWin = (over = {}) => ({
  document, devicePixelRatio: 1, innerWidth: 390, innerHeight: 844,
  addEventListener() {}, removeEventListener() {},
  matchMedia: () => ({ matches: false }),
  requestAnimationFrame: (cb) => { queue.push(cb); return queue.length; },
  cancelAnimationFrame() {},
  performance: { now: () => now },
  setTimeout: () => 0, clearTimeout() {},          // the data's time limit never runs out here unless a test says so
  ...over,
});
// Runs the queued animation frame callbacks once, `ms` later than the last one.
const frame = (ms = 16) => { now += ms; const cbs = queue.splice(0); cbs.forEach((cb) => cb(now)); };
// Lets `ms` pass without a frame (the welcome and the list ignore presses just after they appear).
const wait = (ms = 400) => { now += ms; };
const run = async (opts = {}) => { const win = makeWin(opts.win); const r = await boot({ fetchFn: diskFetch, win, storage: memory(), ...opts, win }); stops.push(r.stop); return { ...r, win }; };
// Opens the page the way a first visitor would and goes to watching the park: past the welcome, then the list's watch button.
const watching = async (opts) => {
  const r = await run(opts);
  wait(); document.getElementById('in-back').click(); wait(); document.getElementById('watch-btn').click();
  expect(r.park.state.mode).toBe('watch');
  return r;
};

beforeEach(() => {
  mountPage(); restore = installFakeCanvas(); queue = []; now = 1000; stops = []; hidden = false;
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
});
afterEach(() => { stops.forEach((s) => s?.()); restore(); delete document.hidden; });

describe('boot', () => {
  it('資料載不到：出現說明與再試一次，不是空白', async () => {
    await expect(boot({ fetchFn: () => Promise.reject(new Error('offline')), win: makeWin(), storage: memory() })).rejects.toThrow();
    expect(document.getElementById('load-error').hidden).toBe(false);
    expect(document.getElementById('load-retry').textContent.length).toBeGreaterThan(0);
    expect(document.getElementById('hud').hidden).toBe(true);
    expect(queue).toHaveLength(0);
  });

  it('按再試一次會重新載入；這次成功就把說明收起來', async () => {
    let online = false, asked = 0;
    const fetchFn = (url) => { asked++; return online ? diskFetch(url) : Promise.reject(new Error('offline')); };
    const win = makeWin();
    await expect(boot({ fetchFn, win, storage: memory() })).rejects.toThrow();
    const err = document.getElementById('load-error');
    expect(err.hidden).toBe(false);
    const askedBefore = asked;
    online = true;
    document.getElementById('load-retry').click();
    await vi.waitFor(() => expect(err.hidden).toBe(true));
    expect(asked).toBeGreaterThan(askedBefore);
    expect(win.__park.park.state.mode).toBe('menu');
    expect(document.getElementById('intro').hidden).toBe(false);
    stops.push(win.__park.stop);
  });

  it('再試一次又失敗：說明還在，再按還是可以再試（按鈕不會疊出多次載入）', async () => {
    let asked = 0;
    const win = makeWin();
    const fetchFn = () => { asked++; return Promise.reject(new Error('offline')); };
    await expect(boot({ fetchFn, win, storage: memory() })).rejects.toThrow();
    const err = document.getElementById('load-error'), btn = document.getElementById('load-retry');
    const perTry = asked;
    btn.click();
    await vi.waitFor(() => expect(asked).toBe(perTry * 2));
    await new Promise((r) => setTimeout(r, 10));
    expect(err.hidden).toBe(false);
    btn.click();
    await vi.waitFor(() => expect(asked).toBe(perTry * 3));
    await new Promise((r) => setTimeout(r, 10));
    expect(asked).toBe(perTry * 3);
    expect(err.hidden).toBe(false);
  });

  it('再試一次連按兩下：載入中第二下不算，只啟動一次（一條動畫迴圈、一個 __park）', async () => {
    let online = false, release, asked = 0;
    const gate = new Promise((r) => { release = r; });
    const fetchFn = (url) => { asked++; return online ? gate.then(() => diskFetch(url)) : Promise.reject(new Error('offline')); };
    const win = makeWin();
    await expect(boot({ fetchFn, win, storage: memory() })).rejects.toThrow();
    const btn = document.getElementById('load-retry'), perTry = asked;
    online = true;
    btn.click(); btn.click();
    expect(btn.disabled).toBe(true);
    release();
    await vi.waitFor(() => expect(document.getElementById('load-error').hidden).toBe(true));
    expect(asked).toBe(perTry * 2);                 // one retry's worth of requests, not two
    expect(queue).toHaveLength(1);                  // one frame loop
    expect(btn.disabled).toBe(false);
    stops.push(win.__park.stop);
  });

  it('資料載好之後開場失敗（例如畫不出圖）：還是看得到說明和再試一次，沒有動畫迴圈、沒有掛上監聽', async () => {
    const proto = globalThis.HTMLCanvasElement.prototype, fake = proto.getContext;
    proto.getContext = () => null;
    const adds = [];
    const win = makeWin({ addEventListener: (t) => adds.push(t) });
    await expect(boot({ fetchFn: diskFetch, win, storage: memory() })).rejects.toThrow();
    proto.getContext = fake;
    expect(document.getElementById('load-error').hidden).toBe(false);
    expect(document.getElementById('load-retry').disabled).toBe(false);
    expect(document.getElementById('hud').hidden).toBe(true);
    expect(queue).toHaveLength(0);
    expect(adds).toEqual([]);
    expect(win.__park).toBeUndefined();
    // and a retry once drawing works again succeeds
    document.getElementById('load-retry').click();
    await vi.waitFor(() => expect(document.getElementById('load-error').hidden).toBe(true));
    stops.push(win.__park.stop);
  });

  it('資料一直沒來：20 秒時放棄，出現再試一次，「載入中」那一行收起來', async () => {
    let limit = null, giveUp = null;
    const win = makeWin({ setTimeout: (fn, ms) => { giveUp = fn; limit = ms; return 7; }, clearTimeout() {} });
    expect(document.getElementById('loading')).not.toBeNull(); expect(document.getElementById('start').hidden).toBe(false);
    const p = boot({ fetchFn: () => new Promise(() => {}), win, storage: memory() });
    let settled = false; p.catch(() => {}).finally(() => { settled = true; });
    await Promise.resolve();
    expect(limit).toBe(20000); expect(settled).toBe(false); expect(document.getElementById('load-error').hidden).toBe(true);
    giveUp();
    await expect(p).rejects.toThrow();
    expect(document.getElementById('load-error').hidden).toBe(false);
    expect(document.getElementById('load-retry').disabled).toBe(false);
    expect(document.getElementById('start').hidden).toBe(true);
    expect(queue).toHaveLength(0);
  });

  it('載入成功：歡迎框或角色清單一出來，「載入中」那一行就不見了', async () => {
    expect(document.getElementById('loading')).not.toBeNull();
    await run();
    expect(document.getElementById('loading')).toBeNull(); expect(document.getElementById('start').textContent).not.toContain('載入中');
    expect(document.getElementById('intro').hidden).toBe(false);
  });

  // The page's own few lines for when the program cannot be loaded at all (no module code runs then).
  const page = readFileSync(resolve(process.cwd(), 'day/index.html'), 'utf8');
  const pageBody = /<body[^>]*>([\s\S]*)<\/body>/.exec(page)[1];
  const hook = [...pageBody.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  // The body as it is, scripts left out, then the module's tag put back as an inert copy (happy-dom would try to load it):
  // the tag the page's lines look for, at the same place.
  const mountWithHook = () => {
    const tag = /<script type="module"[^>]*><\/script>/.exec(pageBody)[0];
    document.body.innerHTML = pageBody.replace(tag, '<i id="module-here"></i>').replace(/<script>[\s\S]*?<\/script>/g, '');
    const mod = document.createElement('script');
    mod.type = 'text/plain'; mod.setAttribute('src', /src="([^"]+)"/.exec(tag)[1]);
    document.getElementById('module-here').replaceWith(mod);
    mod.setAttribute('type', 'module');
    const reload = vi.fn();
    new Function('document', 'location', hook[0])(document, { reload });
    return reload;
  };

  it('程式檔（main.js 或它引用的檔）載不到：頁面上那一小段把「載入中」換成再試一次，按了重新載入頁面', () => {
    expect(hook).toHaveLength(1);
    const reload = mountWithHook();
    const err = document.getElementById('load-error');
    expect(err.hidden).toBe(true); expect(document.getElementById('start').hidden).toBe(false);
    expect(document.getElementById('load-retry').onclick).toBeNull();            // nothing is touched until the error comes
    document.querySelector('script[type="module"]').dispatchEvent(new Event('error'));
    expect(err.hidden).toBe(false); expect(document.getElementById('start').hidden).toBe(true);
    document.getElementById('load-retry').click();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('程式載好了以後由 boot 自己處理：那一小段不插手（再試一次是重新載入資料，不是重新整理頁面）', async () => {
    const reload = mountWithHook();
    let online = false;
    const fetchFn = (url) => (online ? diskFetch(url) : Promise.reject(new Error('offline')));
    const win = makeWin();
    await expect(boot({ fetchFn, win, storage: memory() })).rejects.toThrow();
    expect(document.getElementById('load-error').hidden).toBe(false);
    online = true;
    document.getElementById('load-retry').click();
    await vi.waitFor(() => expect(document.getElementById('load-error').hidden).toBe(true));
    expect(reload).not.toHaveBeenCalled();
    stops.push(win.__park.stop);
  });

  it('其中一個檔回 404 也算載不到', async () => {
    const fetchFn = (url) => (String(url).endsWith('days/vol.json') ? Promise.resolve({ ok: false, status: 404, json: async () => ({}) }) : diskFetch(url));
    await expect(boot({ fetchFn, win: makeWin(), storage: memory() })).rejects.toThrow(/days\/vol\.json/);
    expect(document.getElementById('load-error').hidden).toBe(false);
  });

  it('資料是照模組的位置找的，不是照頁面：請求的網址以 js/data/ 結尾的資料夾為底', async () => {
    const urls = [];
    const win = makeWin();
    const r = await boot({ fetchFn: (u) => { urls.push(String(u)); return diskFetch(u); }, win, storage: memory() });
    stops.push(r.stop);
    expect(urls.length).toBeGreaterThan(10);
    expect(urls.every((u) => /\/js\/data\/[\w/]+\.json$/.test(u))).toBe(true);
  });

  it('成功：第一次打開出現歡迎框，園區在背後（選單模式），控制列收著，並把 __park 交出來', async () => {
    const { park, auto, data, record, win } = await run();
    expect(park.state.mode).toBe('menu');
    expect(document.getElementById('intro').hidden).toBe(false);
    expect(document.getElementById('hud').hidden).toBe(true);
    expect(document.getElementById('start').hidden).toBe(true);
    expect(document.getElementById('end').hidden).toBe(true);
    expect(document.getElementById('load-error').hidden).toBe(true);
    expect(win.__park.park).toBe(park); expect(win.__park.auto).toBe(auto);
    expect(data.ui.watch.title).toBeTruthy(); expect(record.tried).toEqual({});
    expect(document.getElementById('map').getAttribute('aria-label')).toBe(data.ui.mapLabel);
    expect(document.getElementById('auto-btn').hidden).toBe(true);
    expect(document.getElementById('speed-btn').hidden).toBe(true);
    expect(document.getElementById('menu-btn').hidden).toBe(true);
  });

  it('看園區的任務卡與時鐘用的是資料裡的字', async () => {
    const { data } = await watching();
    frame();
    const ui = data.ui;
    expect(document.getElementById('clock-t').textContent).toMatch(new RegExp('^' + ui.period.dawn + ' \\d{1,2}:\\d\\d$'));
    expect(document.getElementById('clock-s').textContent).toBe(ui.watch.clock);
    expect(document.getElementById('task-step').textContent).toBe(ui.watch.step);
    expect(document.getElementById('task-title').textContent).toBe(ui.watch.title);
    expect(document.getElementById('task-note').textContent).toBe(ui.watch.note);
    expect(document.getElementById('task-go').textContent).toBe(ui.watch.go);
  });

  it('每一格：時鐘往前走；分頁在背景時整格跳過', async () => {
    const { park } = await run();
    frame(); frame(16);
    const c0 = park.state.clock;
    frame(16);
    expect(park.state.clock).toBeGreaterThan(c0);
    hidden = true;
    const c1 = park.state.clock;
    frame(16); frame(16);
    expect(park.state.clock).toBe(c1);
    hidden = false;
    frame(16);
    expect(park.state.clock).toBeGreaterThan(c1);
  });

  it('分頁在背景一小時再回來：時鐘只多走 0.05 秒的量，不暴衝', async () => {
    const { park } = await run();
    frame(); frame(16);
    hidden = true; frame(16);
    hidden = false;
    const c0 = park.state.clock;
    frame(60 * 60 * 1000);
    expect(park.state.clock - c0).toBeLessThanOrEqual(4.2 * 0.05 + 1e-9);
    expect(park.state.clock - c0).toBeGreaterThan(0);
  });

  it('每一格先用 pace 再 tick：自動模式的快轉只在角色模式（看園區照常 1 倍）', async () => {
    const { park, auto } = await watching();
    frame(); frame(16);
    auto.set(true); auto.setSpeed(1.5);
    const c0 = park.state.clock;
    frame(16);
    expect(park.state.clock - c0).toBeCloseTo(4.2 * 0.016, 6);
  });

  // Steps the park until somebody who can be tapped is on the map.
  const someoneOut = ({ park }) => {
    for (let i = 0; i < 4000 && !park.agents.some((a) => a.vis >= 0.5 && !a.player); i++) park.tick(0.05);
    const a = park.agents.find((x) => x.vis >= 0.5 && !x.player);
    expect(a).toBeTruthy();
    return a;
  };
  const screenOf = (view, a) => [(a.x - view.cam.x) * view.cam.s + view.W / 2, (a.y - 36 - view.cam.y) * view.cam.s + view.H / 2];
  const canvasOf = () => document.getElementById('map');
  const tap = (x, y) => {
    const c = canvasOf();
    const mk = (type) => new window.PointerEvent(type, { clientX: x, clientY: y, pointerId: 7, pointerType: 'touch', bubbles: true });
    c.dispatchEvent(mk('pointerdown')); c.dispatchEvent(mk('pointerup'));
  };

  it('點一個人：他停下、轉向你，說明卡有名字・身分、在做什麼、為什麼；點空白處收起來、他繼續走', async () => {
    const r = await watching();
    const { park, data, view } = r;
    const a = someoneOut(r);
    frame(); frame(16);
    const was = a.moving;
    const [sx, sy] = screenOf(view, a);
    tap(sx, sy);
    const ui = data.ui, id = data.identities[a.identity], act = data.acts[a.act];
    expect(park.state.sel).toBe(a);
    expect(a.paused).toBe(true); expect(a.moving).toBe(false);
    const who = document.getElementById('who');
    expect(who.hidden).toBe(false);
    expect(document.getElementById('who-name').textContent).toBe(a.name + ui.info.sep + id.name);
    expect(document.getElementById('who-do').textContent).toBe((was ? ui.info.going : ui.info.now) + act.does.text + ui.info.end);
    expect(document.getElementById('who-why').textContent).toBe(id.why.text);
    expect(document.getElementById('who-why').hidden).toBe(false);
    expect(document.getElementById('who-face').querySelector('canvas')).not.toBeNull();
    // a frame later he is still standing there
    const x0 = a.x, y0 = a.y; frame(16); frame(16);
    expect([a.x, a.y]).toEqual([x0, y0]);
    // tap empty ground: the card goes, he walks on
    tap(1, 1);
    expect(park.state.sel).toBeNull(); expect(a.paused).toBe(false); expect(who.hidden).toBe(true);
  });

  it('再點同一個人：收起說明、他繼續走', async () => {
    const r = await watching();
    const a = someoneOut(r); frame(); frame(16);
    const [sx, sy] = screenOf(r.view, a);
    tap(sx, sy); expect(r.park.state.sel).toBe(a);
    tap(sx, sy);
    expect(r.park.state.sel).toBeNull(); expect(a.paused).toBe(false);
    expect(document.getElementById('who').hidden).toBe(true);
  });

  it('點招牌：出說明（名字加地方的介紹），沒有第三行', async () => {
    const r = await watching();
    frame(); frame(16);
    const rect = r.view.labelRects[0];
    expect(rect).toBeTruthy();
    const label = r.data.map.labels.find((l) => l.key === rect.key);
    tap(rect.x + rect.w / 2, rect.y + rect.h / 2);
    expect(document.getElementById('who').hidden).toBe(false);
    expect(document.getElementById('who-name').textContent).toBe(label.name);
    expect(document.getElementById('who-do').textContent).toBe(label.about.text);
    expect(document.getElementById('who-why').hidden).toBe(true);
    expect(r.park.state.sel).toBeNull();
  });

  it('拖一下地圖不算點：不會出說明卡，鏡頭跟著手動、3 秒內不自動跟', async () => {
    const r = await watching();
    frame(); frame(16);
    const c = canvasOf(), x0 = r.view.cam.x;
    const mk = (type, x) => new window.PointerEvent(type, { clientX: x, clientY: 300, pointerId: 3, pointerType: 'touch', bubbles: true });
    c.dispatchEvent(mk('pointerdown', 200)); c.dispatchEvent(mk('pointermove', 150)); c.dispatchEvent(mk('pointermove', 100)); c.dispatchEvent(mk('pointerup', 100));
    expect(document.getElementById('who').hidden).toBe(true);
    expect(r.view.cam.free).toBe(3);
    expect(r.view.cam.x).toBeCloseTo(x0 + 100 / r.view.cam.s, 5);
  });

  it('關閉鈕：收起說明、放開那個人', async () => {
    const r = await watching();
    const a = someoneOut(r); frame(); frame(16);
    tap(...screenOf(r.view, a));
    document.getElementById('who-close').click();
    expect(document.getElementById('who').hidden).toBe(true);
    expect(r.park.state.sel).toBeNull(); expect(a.paused).toBe(false);
    expect(document.getElementById('who-close').textContent).toBe(r.data.ui.info.close);
  });

  it('滑鼠移開被點的人 90 像素以上，他才繼續走', async () => {
    const r = await watching();
    const a = someoneOut(r); frame(); frame(16);
    const [sx, sy] = screenOf(r.view, a);
    tap(sx, sy);
    const move = (x, y) => canvasOf().dispatchEvent(new window.PointerEvent('pointermove', { clientX: x, clientY: y, pointerId: 1, pointerType: 'mouse', bubbles: true }));
    move(sx + 60, sy); expect(r.park.state.sel).toBe(a);
    move(sx + 95, sy); expect(r.park.state.sel).toBeNull(); expect(a.paused).toBe(false);
  });

  it('滑鼠移到人身上游標變手指，移開變回來', async () => {
    const r = await watching();
    const a = someoneOut(r); frame(); frame(16);
    const [sx, sy] = screenOf(r.view, a);
    const move = (x, y) => canvasOf().dispatchEvent(new window.PointerEvent('pointermove', { clientX: x, clientY: y, pointerId: 1, pointerType: 'mouse', bubbles: true }));
    move(sx, sy); expect(canvasOf().style.cursor).toBe('pointer');
    move(1, 1); expect(canvasOf().style.cursor).toBe('');
  });

  it('看園區時卡片上的「選一個角色」：回到角色清單，控制列收起來', async () => {
    const { park } = await watching();
    document.getElementById('task-go').click();
    expect(park.state.mode).toBe('menu');
    expect(document.getElementById('start').hidden).toBe(false);
    expect(document.getElementById('hud').hidden).toBe(true);
  });
});
