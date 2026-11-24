// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createHud } from '../js/ui/hud.js';
import { createPark } from '../js/engine/park.js';
import { createAuto } from '../js/engine/auto.js';
import { mountPage } from './helpers/page.js';
import { installFakeCanvas } from './helpers/canvas.js';
import { readData, readDataFile } from './helpers/data.js';
import { boot } from '../js/boot.js';
import { fill } from '../js/engine/text.js';
import { openTask } from './helpers/play.js';
import { STORAGE_KEY } from '../js/config.js';

let restore, data, park, auto;
const $ = (id) => document.getElementById(id);
beforeEach(() => { mountPage(); restore = installFakeCanvas(); data = readData(); park = createPark(data); park.beginWatch(); auto = createAuto(park); });
afterEach(() => restore());

describe('hud', () => {
  it('時鐘：時段字加上 12 小時制的時間，分鐘補到兩位', () => {
    const hud = createHud(park, auto, data, {});
    park.state.clock = 6 * 60 + 5; hud.update();
    expect($('clock-t').textContent).toBe(data.ui.period.dawn + ' 6:00');
    park.state.clock = 15 * 60 + 40; hud.update();
    expect($('clock-t').textContent).toBe(data.ui.period.afternoon + ' 3:40');
    park.state.clock = 19 * 60 + 30; hud.update();
    expect($('clock-t').textContent).toBe(data.ui.period.night + ' 7:30');
  });

  it('看園區的任務卡文字都來自資料，按鈕會叫 onMenu', () => {
    const onMenu = vi.fn();
    const hud = createHud(park, auto, data, {}, { onMenu });
    hud.update();
    expect($('task-go').textContent).toBe(data.ui.watch.go);
    expect($('task-go').disabled).toBe(false); expect($('task-go').hidden).toBe(false);
    $('task-go').click();
    expect(onMenu).toHaveBeenCalledTimes(1);
  });

  it('showInfo / hideInfo：第三行沒有字就收起來；有臉才放臉', () => {
    const hud = createHud(park, auto, data, {});
    const face = document.createElement('canvas');
    hud.showInfo('標題', '第二行', '第三行', face);
    expect($('who').hidden).toBe(false); expect($('who-face').firstChild).toBe(face);
    expect($('who-why').hidden).toBe(false);
    hud.showInfo('招牌', '介紹', '');
    expect($('who-why').hidden).toBe(true); expect($('who-face').firstChild).toBeNull();
    hud.hideInfo();
    expect($('who').hidden).toBe(true);
  });

  it('不在看園區、也不在角色模式（例如選單）時不改畫面上的字', () => {
    const hud = createHud(park, auto, data, {});
    park.state.mode = 'menu'; $('clock-t').textContent = 'keep';
    hud.update();
    expect($('clock-t').textContent).toBe('keep');
  });

  it('只做看園區：自動、加速、選單三顆鈕收著', () => {
    createHud(park, auto, data, {});
    for (const id of ['auto-btn', 'speed-btn', 'menu-btn']) expect($(id).hidden).toBe(true);
  });
});

describe('hud: 角色模式的任務卡', () => {
  const task = () => park.task;
  const walkUntilNear = () => { for (let i = 0; i < 4000 && !park.state.near; i++) park.tick(0.05); };

  it('任務卡的按鈕跟著狀態換字：帶我去 → 走過去中……（不能按）→ 這件事的動詞', () => {
    const hud = createHud(park, auto, data, {});
    park.beginRole('farm'); hud.update();
    expect($('task-step').textContent).toBe(fill(data.ui.task.step, { i: 1, t: data.days.farm.tasks.length }));
    expect($('task-title').textContent).toBe(task().title); expect($('task-note').textContent).toBe(task().note);
    expect($('task-go').textContent).toBe(data.ui.task.go); expect($('task-go').disabled).toBe(false); expect($('task-go').hidden).toBe(false);
    $('task-go').click();
    expect(park.state.guided).toBe(true); expect(park.player.path).not.toBeNull();
    hud.update();
    expect($('task-go').textContent).toBe(data.ui.task.walking); expect($('task-go').disabled).toBe(true);
    // walk on by hand: arriving while guided would open the scene by itself
    park.state.guided = false; walkUntilNear(); hud.update();
    expect(park.state.near).toBe(true);
    expect($('task-go').textContent).toBe(task().verb); expect($('task-go').disabled).toBe(false);
  });

  it('到了的時候按任務卡的鈕：打開這件事的特寫', () => {
    const hud = createHud(park, auto, data, {});
    park.beginRole('farm'); park.walkTo(task().spot, false); walkUntilNear(); hud.update();
    expect(park.state.scene).toBeNull();
    $('task-go').click();
    expect(park.state.scene).not.toBeNull();
  });

  it('特寫開著時任務卡收起來；這件事做完以後任務卡回來', () => {
    const hud = createHud(park, auto, data, {});
    park.beginRole('farm'); openTask(park); hud.update();
    expect($('task').hidden).toBe(true);
    const sc = park.state.scene;
    while (!sc.done) park.press(sc.auto());
    park.finishTask(); hud.update();
    expect($('task').hidden).toBe(false);
  });

  it('快轉中：卡片寫等一下，按鈕藏起來，時鐘變色', () => {
    const hud = createHud(park, auto, data, {});
    park.beginRole('farm', 5); park.state.ff = true; hud.update();
    expect($('task-title').textContent).toBe(fill(data.ui.task.waitTitle, { s: task().title }));
    expect($('task-note').textContent).toBe(task().wait);
    expect($('task-go').hidden).toBe(true);
    expect($('clock').classList.contains('ff')).toBe(true); expect($('clock-s').textContent).toBe(data.ui.task.ffClock);
    park.beginRole('farm', 8); park.state.ff = true; hud.update();
    expect(task().wait).toBeUndefined(); expect($('task-note').textContent).toBe(data.ui.task.ffNote);
    park.state.ff = false; hud.update();
    expect($('task-go').hidden).toBe(false); expect($('clock').classList.contains('ff')).toBe(false);
    expect($('clock-s').textContent).toBe(data.days.farm.name);
  });

  it('角色模式出現「換角色」鈕，按了叫 onMenu；看園區時收著', () => {
    const onMenu = vi.fn();
    const hud = createHud(park, auto, data, {}, { onMenu });
    hud.update(); expect($('menu-btn').hidden).toBe(true);
    park.beginRole('work'); hud.update();
    expect($('menu-btn').hidden).toBe(false); expect($('menu-btn').textContent).toBe(data.ui.menu);
    expect($('auto-btn').hidden).toBe(false); expect($('speed-btn').hidden).toBe(true);       // auto mode is off: no speed button
    $('menu-btn').click(); expect(onMenu).toHaveBeenCalledTimes(1);
    park.beginWatch(); hud.update(); expect($('menu-btn').hidden).toBe(true);
  });

  it('特寫打開時，點開的人物說明卡收起來，那個人繼續走', () => {
    const hud = createHud(park, auto, data, {});
    park.beginRole('farm'); const other = park.agents.find((a) => !a.player);
    park.select(other); hud.showPerson(other, false);
    expect($('who').hidden).toBe(false);
    openTask(park); hud.update();
    expect($('who').hidden).toBe(true); expect(park.state.sel).toBeNull(); expect(other.paused).toBe(false);
  });
});

describe('hud: 做完一天的紀錄（接到真的頁面）', () => {
  let queue, now, stops, store;
  const fileOf = (url) => String(url).split('/js/data/')[1] ?? String(url).split('data/')[1];
  const diskFetch = (url) => Promise.resolve({ ok: true, status: 200, json: async () => readDataFile(fileOf(url)) });
  const memory = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }; };
  const frame = (ms = 16) => { now += ms; queue.splice(0).forEach((cb) => cb(now)); };
  const start = async () => {
    const win = { document, devicePixelRatio: 1, innerWidth: 390, innerHeight: 844, addEventListener() {}, removeEventListener() {}, matchMedia: () => ({ matches: false }), requestAnimationFrame: (cb) => { queue.push(cb); return queue.length; }, cancelAnimationFrame() {}, performance: { now: () => now }, setTimeout: () => 0, clearTimeout() {} };
    store = memory();
    const r = await boot({ fetchFn: diskFetch, win, storage: store }); stops.push(r.stop); return r;
  };
  const toLastTask = (r, role) => {
    r.park.beginRole(role, data.days[role].tasks.length - 1); openTask(r.park); frame();
    const sc = r.park.state.scene;
    for (let i = 0; i < 400 && !sc.done; i++) { const id = sc.auto(); if (id === null) r.park.tick(0.1); else r.park.press(id); }
    frame();
  };
  beforeEach(() => { queue = []; now = 1000; stops = []; });
  afterEach(() => stops.forEach((s) => s()));

  it('手動做完最後一件：記一次，存起來，出現結尾卡', async () => {
    const r = await start();
    toLastTask(r, 'farm');
    $('sh-next').click();
    expect(r.park.state.mode).toBe('end');
    expect(r.record.done.farm).toBe(1);
    expect(JSON.parse(store.getItem(STORAGE_KEY)).done.farm).toBe(1);
    expect($('end').hidden).toBe(false); expect($('end').textContent).toContain(data.days.farm.line.text);
    frame(); frame();
    expect(r.record.done.farm).toBe(1);
    expect($('hud').hidden).toBe(true); expect($('sheet').hidden).toBe(true);
  });

  it('自動模式做完：不記；結尾卡一樣出現', async () => {
    const r = await start();
    r.park.beginRole('vol', data.days.vol.tasks.length - 1); r.auto.set(true);
    for (let i = 0; i < 8000 && r.park.state.mode !== 'end'; i++) frame();
    expect(r.park.state.mode).toBe('end');
    frame();
    expect(r.record.done.vol).toBeUndefined();
    expect(JSON.parse(store.getItem(STORAGE_KEY) ?? '{"done":{}}').done).toEqual({});
    expect($('end').hidden).toBe(false);
  });

  it('自動模式開著，手按最後的「收工」：也不記', async () => {
    const r = await start();
    toLastTask(r, 'acct');
    r.auto.on = true;
    $('sh-next').click();
    expect(r.park.state.mode).toBe('end'); expect(r.record.done.acct).toBeUndefined();
  });

  it('結尾卡的按鈕：再當一次回到那個角色的第一件事；看園區自己運轉回到看園區', async () => {
    const r = await start();
    toLastTask(r, 'learner'); $('sh-next').click();
    $('end-again').click();
    expect(r.park.state.mode).toBe('role'); expect(r.park.state.role).toBe('learner'); expect(r.park.state.ti).toBe(0);
    expect($('end').hidden).toBe(true); expect($('hud').hidden).toBe(false);
    toLastTask(r, 'learner'); $('sh-next').click();
    $('end-watch').click();
    expect(r.park.state.mode).toBe('watch'); expect($('end').hidden).toBe(true); expect($('hud').hidden).toBe(false);
  });

  it('點地面：走到那裡（不帶路）；有特寫開著時不走', async () => {
    const r = await start();
    r.park.beginRole('farm'); frame();
    const canvas = $('map'); canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 390, height: 844 });
    const tap = (x, y) => { const o = { pointerId: 1, clientX: x, clientY: y, pointerType: 'touch', bubbles: true }; canvas.dispatchEvent(new window.PointerEvent('pointerdown', o)); canvas.dispatchEvent(new window.PointerEvent('pointerup', o)); };
    expect(r.park.player.path).toBeNull();
    tap(20, 20);
    expect(r.park.player.path).not.toBeNull(); expect(r.park.state.guided).toBe(false);
    openTask(r.park); frame(); r.park.player.path = null;
    tap(20, 20);
    expect(r.park.player.path).toBeNull();
  });
});
