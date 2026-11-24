// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readData } from './helpers/data.js';
import { SOURCE_RE, isSourced } from './helpers/sourced.js';
import { mountPage } from './helpers/page.js';
import { installFakeCanvas } from './helpers/canvas.js';
import { pageRunner, memoryStorage, saved } from './helpers/boot.js';
import { openTask, playTask } from './helpers/play.js';
import { createStart } from '../js/ui/startView.js';
import { createPark } from '../js/engine/park.js';
import { createAuto } from '../js/engine/auto.js';
import { emptyRecord } from '../js/engine/store.js';

const d = readData();
const ROLES = ['farm', 'work', 'shop', 'acct', 'learner', 'vol', 'mentor'];
const $ = (id) => document.getElementById(id);
const btn = (id) => $('role-' + id);

describe('角色清單', () => {
  let restore, record, auto, start, hooks, t;
  const later = (ms = 400) => { t += ms; };          // a moment passes (the list ignores presses just after it appears)
  beforeEach(() => {
    mountPage(); restore = installFakeCanvas();
    record = emptyRecord(); auto = createAuto(createPark(d));
    hooks = { onRole: vi.fn(), onWatch: vi.fn(), onAbout: vi.fn() };
    t = 1000;
    start = createStart(d, record, auto, { ...hooks, now: () => t });
    start.show();
  });
  afterEach(() => restore());

  it('七顆角色按鈕，順序是農夫、加工、門市、帳務、學員、志工、導師', () => {
    const list = [...document.querySelectorAll('#roles .role')];
    expect(list.map((b) => b.dataset.role)).toEqual(ROLES);
    list.forEach((b, i) => {
      const day = d.days[ROLES[i]];
      expect(b.tagName).toBe('BUTTON'); expect(b.id).toBe('role-' + ROLES[i]);
      expect(b.querySelector('.role-text b').firstChild.textContent).toBe(day.name);
      expect(b.querySelector('.role-text small').textContent).toBe(day.desc);
      expect(b.querySelector('canvas')).not.toBeNull();
    });
    expect(list.map((b) => b.querySelector('b').firstChild.textContent)).toEqual(['一日農夫', '一日加工夥伴', '一日門市夥伴', '一日帳務夥伴', '一日學員', '一日志工', '一日導師']);
    // the watch button comes last, after the seven
    expect($('roles').lastElementChild).toBe($('watch-btn'));
    expect($('watch-btn').textContent).toBe(d.ui.start.watch);
  });

  it('清單上的字都來自資料：標題、說明、連結、自動模式的開關', () => {
    const ui = d.ui.start;
    expect(document.querySelector('#start .eyebrow').textContent).toBe('體驗園區');
    expect(document.querySelector('#start h1').textContent).toBe(ui.title);
    expect(document.querySelector('#start .lead').textContent).toBe(ui.lead);
    expect($('about-btn').textContent).toBe(ui.about);
    expect(document.querySelector('#start .auto-row b').textContent).toBe(ui.autoTitle);
    expect(document.querySelector('#start .auto-row small').textContent).toBe(ui.autoNote);
    expect($('auto-box').type).toBe('checkbox');
    expect(document.querySelector('#start .auto-row').getAttribute('for')).toBe('auto-box');
    expect(isSourced(ui.fine)).toBe(true);
    for (const p of ui.fine.source.split('；')) expect(p).toMatch(SOURCE_RE);
  });

  it('沒選過是淺色；選過變綠並標玩過；自己玩完兩次標玩過 2 次', () => {
    for (const id of ROLES) { expect(btn(id).classList.contains('played')).toBe(false); expect(btn(id).querySelector('.role-done').textContent).toBe(''); }
    record.tried.work = true; record.done.farm = 2; record.tried.farm = true; start.refresh();
    expect(btn('farm').classList.contains('played')).toBe(true); expect(btn('farm').textContent).toContain('✓ 玩過 2 次');
    expect(btn('work').textContent).toContain('✓ 玩過'); expect(btn('work').textContent).not.toContain('次');
    expect(btn('work').classList.contains('played')).toBe(true);
    expect(btn('vol').classList.contains('played')).toBe(false);
    expect(btn('farm').querySelector('.role-done').textContent).toBe('✓ 玩過 2 次');
    expect(btn('work').querySelector('.role-done').textContent).toBe('✓ 玩過');
  });

  // The tag that says where to begin: on the role named in the data, only until it has been picked.
  const tag = (id) => btn(id).querySelector('.role-first');
  const visible = (b) => [...b.querySelectorAll('.role-text b, .role-text b *')].filter((n) => !n.closest('[hidden]')).map((n) => (n.matches('b') ? n.firstChild.textContent : n.textContent)).filter(Boolean).join('|');

  it('還沒選過農夫：農夫的按鈕有「建議先從這裡開始」，其他按鈕沒有', () => {
    expect(d.ui.start.first).toEqual({ role: 'farm', label: '建議先從這裡開始' });
    expect(tag('farm')).not.toBeNull(); expect(tag('farm').hidden).toBe(false);
    expect(tag('farm').textContent).toBe(d.ui.start.first.label);
    expect(tag('farm').parentElement).toBe(btn('farm').querySelector('.role-text b'));       // on the name's line, next to where 玩過 goes
    expect(btn('farm').classList.contains('played')).toBe(false); expect(btn('farm').querySelector('.role-done').textContent).toBe('');
    for (const id of ROLES.slice(1)) { expect(tag(id)).toBeNull(); expect(btn(id).textContent).not.toContain(d.ui.start.first.label); }
    expect(document.querySelectorAll('#start .role-first')).toHaveLength(1);
    // the role comes from the data, not from the code
    const other = structuredClone(d); other.ui.start.first.role = 'acct';
    mountPage(); createStart(other, emptyRecord(), auto, {}).show();
    expect(document.querySelectorAll('#start .role-first')).toHaveLength(1);
    expect(btn('acct').querySelector('.role-first').textContent).toBe('建議先從這裡開始'); expect(tag('farm')).toBeNull();
  });

  it('選過農夫以後：標籤不見，顯示玩過', () => {
    expect(visible(btn('farm'))).toBe('一日農夫|建議先從這裡開始');
    later(); btn('farm').click();                              // picking it marks it tried
    expect(record.tried.farm).toBe(true);
    start.show();
    expect(tag('farm').hidden).toBe(true);
    expect(btn('farm').classList.contains('played')).toBe(true); expect(btn('farm').querySelector('.role-done').textContent).toBe('✓ 玩過');
    expect(visible(btn('farm'))).toBe('一日農夫|✓ 玩過');
    record.done.farm = 1; start.refresh();
    expect(tag('farm').hidden).toBe(true); expect(visible(btn('farm'))).toBe('一日農夫|✓ 玩過 1 次');
    // another role picked first does not take the tag away
    const fresh = emptyRecord(); fresh.tried.work = true;
    mountPage(); createStart(d, fresh, auto, {}).show();
    expect(tag('farm').hidden).toBe(false); expect(visible(btn('work'))).toBe('一日加工夥伴|✓ 玩過');
  });

  it('底下沒有「你當過」那一長行；小字講明是示意、名字與對話是例子、當志工不是真的報名', () => {
    record.done.farm = 2; record.tried.farm = true; record.done.vol = 1; start.refresh();
    const t = $('start').textContent; expect(t).not.toContain('你當過'); expect(t).toContain('人物的名字與對話是例子'); expect(t).toContain('不是真的報名'); expect(t).not.toMatch(/試作|第 \d+ 版/);
    expect($('start-fine').textContent).toBe('每個角色大約五分鐘。這是規劃中的示意：園區還沒選址，數字是示意，人物的名字與對話是例子。這裡的「當志工」是體驗，不是真的報名。');
    expect(d.ui.start.fine.source).toBe('口頭決定 2026-11-21');
    expect(t).not.toMatch(/分數|得分|排名|等級|徽章/);
  });

  it('按角色：先記下選過，再叫 onRole；按看園區、按連結各叫各的', () => {
    hooks.onRole.mockImplementation(() => { expect(record.tried.shop).toBe(true); });
    later(); btn('shop').click();
    expect(hooks.onRole).toHaveBeenCalledTimes(1); expect(hooks.onRole).toHaveBeenCalledWith('shop');
    expect(hooks.onWatch).not.toHaveBeenCalled(); expect(hooks.onAbout).not.toHaveBeenCalled();
    $('watch-btn').click(); expect(hooks.onWatch).toHaveBeenCalledTimes(1);
    $('about-btn').click(); expect(hooks.onAbout).toHaveBeenCalledTimes(1);
  });

  it('清單收起來以後，留在上面的按鈕按了沒有作用', () => {
    later(); start.hide();
    btn('farm').click(); $('watch-btn').click(); $('about-btn').click();
    expect(hooks.onRole).not.toHaveBeenCalled(); expect(hooks.onWatch).not.toHaveBeenCalled(); expect(hooks.onAbout).not.toHaveBeenCalled();
    expect(record.tried.farm).toBeUndefined();
  });

  it('自動模式的開關：打勾就開，跟著 auto 的狀態顯示', () => {
    expect($('auto-box').checked).toBe(false);
    later(); $('auto-box').click();
    expect(auto.on).toBe(true);
    auto.set(false); start.refresh();
    expect($('auto-box').checked).toBe(false);
    auto.set(true); start.show();
    expect($('auto-box').checked).toBe(true);
  });

  // A double tap on the button that brought the list up (直接開始, 換一個角色, …) must not press what is now under the finger.
  it('清單剛出現的 0.35 秒內按了不算：沒記選過、沒開始角色、沒切換；之後按才算', () => {
    later(100);
    btn('farm').click(); $('watch-btn').click(); $('about-btn').click(); $('auto-box').click();
    document.querySelector('#start .auto-row').click();
    expect(hooks.onRole).not.toHaveBeenCalled(); expect(hooks.onWatch).not.toHaveBeenCalled(); expect(hooks.onAbout).not.toHaveBeenCalled();
    expect(record.tried).toEqual({}); expect(auto.on).toBe(false); expect($('auto-box').checked).toBe(false);
    later(240); btn('farm').click();                             // 340 ms: still the same tap
    expect(hooks.onRole).not.toHaveBeenCalled(); expect(record.tried).toEqual({});
    later(60); btn('farm').click();                              // 400 ms
    expect(hooks.onRole).toHaveBeenCalledTimes(1); expect(hooks.onRole).toHaveBeenCalledWith('farm'); expect(record.tried.farm).toBe(true);
    $('auto-box').click(); expect(auto.on).toBe(true); expect($('auto-box').checked).toBe(true);
  });

  it('用鍵盤按（Enter 或空白鍵送出的 click）也一樣：剛出現時不算，之後才算', () => {
    const key = (b) => { b.focus(); b.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 0 })); };
    later(50);
    key(btn('work')); key($('watch-btn')); key($('auto-box'));
    expect(hooks.onRole).not.toHaveBeenCalled(); expect(hooks.onWatch).not.toHaveBeenCalled();
    expect(record.tried).toEqual({}); expect(auto.on).toBe(false); expect($('auto-box').checked).toBe(false);
    later();
    key(btn('work'));
    expect(hooks.onRole).toHaveBeenCalledWith('work'); expect(record.tried.work).toBe(true);
  });

  it('每次重新出現都重新算那 0.35 秒', () => {
    later(5000); start.hide(); start.show();
    later(100); btn('shop').click();
    expect(hooks.onRole).not.toHaveBeenCalled();
    later(); btn('shop').click();
    expect(hooks.onRole).toHaveBeenCalledWith('shop');
  });

  it('按鈕有焦點時打開清單，焦點移到第一個角色；沒有焦點時不搶', () => {
    start.hide(); document.activeElement?.blur?.();
    start.show();
    expect(document.activeElement === document.body || document.activeElement === null).toBe(true);
    start.hide();
    const other = document.createElement('button'); document.body.append(other); other.focus();
    start.show();
    expect(document.activeElement).toBe(btn('farm'));
  });
});

describe('角色清單接到真的頁面', () => {
  let restore, page;
  beforeEach(() => { mountPage(); restore = installFakeCanvas(); page = pageRunner(); });
  afterEach(() => { page.stop(); restore(); });
  const seen = { intro: true, tried: {}, done: {} };

  it('按角色：記下選過、存檔、開始那個角色', async () => {
    const storage = memoryStorage(seen);
    const r = await page.open({ storage });
    page.wait(); btn('shop').click();
    expect(r.record.tried.shop).toBe(true);
    expect(saved(storage).tried).toEqual({ shop: true });
    expect(r.park.state.mode).toBe('role'); expect(r.park.state.role).toBe('shop'); expect(r.park.state.ti).toBe(0);
    expect($('start').hidden).toBe(true); expect($('hud').hidden).toBe(false);
    page.frame();
    expect($('task-title').textContent).toBe(d.days.shop.tasks[0].title);
    // back on the list, it is green
    $('menu-btn').click();
    expect($('start').hidden).toBe(false); expect(btn('shop').classList.contains('played')).toBe(true);
  });

  it('連按兩下角色鈕：只開始一次', async () => {
    const r = await page.open({ storage: memoryStorage(seen) });
    const run0 = r.park.state.run;
    page.wait(); btn('farm').click(); btn('farm').click();
    expect(r.park.state.run).toBe(run0 + 1);
    expect(r.park.state.role).toBe('farm');
  });

  it('歡迎框的「直接開始」連按兩下：第二下落在清單上不算（沒有角色開始、沒記選過、沒存）；過一下再按才開始', async () => {
    const storage = memoryStorage();
    const r = await page.open({ storage });
    page.wait(); $('in-back').click();                          // 直接開始
    expect($('start').hidden).toBe(false);
    page.wait(50); btn('farm').click();                         // the second tap, 50 ms later
    expect(r.park.state.mode).toBe('menu'); expect(r.park.state.role).toBeNull();
    expect(r.record.tried).toEqual({}); expect(saved(storage).tried).toEqual({});
    expect($('start').hidden).toBe(false); expect($('hud').hidden).toBe(true);
    expect(btn('farm').classList.contains('played')).toBe(false); expect(btn('farm').querySelector('.role-first').hidden).toBe(false);
    page.wait(500); btn('farm').click();
    expect(r.park.state.mode).toBe('role'); expect(r.park.state.role).toBe('farm'); expect(saved(storage).tried).toEqual({ farm: true });
  });

  it('結尾卡的「換一個角色」與右上角的換角色連按兩下：第二下落在清單上不算', async () => {
    const storage = memoryStorage(seen);
    const r = await page.open({ storage });
    page.wait(); btn('acct').click();
    toLastTask(r, 'acct'); $('sh-next').click(); page.frame();
    expect($('end').hidden).toBe(false);
    page.wait(); $('end-menu').click(); page.wait(50); $('watch-btn').click(); btn('vol').click();
    expect(r.park.state.mode).toBe('menu'); expect(r.record.tried.vol).toBeUndefined(); expect(saved(storage).tried.vol).toBeUndefined();
    page.wait(); btn('work').click(); page.frame();
    expect(r.park.state.role).toBe('work');
    $('menu-btn').click(); page.wait(50); btn('mentor').click();
    expect(r.park.state.mode).toBe('menu'); expect(r.record.tried.mentor).toBeUndefined();
  });

  it('「收工」連按兩下：第二下落在結尾卡上不算（沒有重來一天、沒回清單、紀錄不變）；過一下再按才算', async () => {
    const storage = memoryStorage(seen);
    const r = await page.open({ storage });
    page.wait(); btn('farm').click();
    toLastTask(r, 'farm');
    $('sh-next').click();                                       // 收工, by hand
    expect($('end').hidden).toBe(false); expect(r.record.done.farm).toBe(1);
    const run = r.park.state.run, kept = JSON.stringify(saved(storage));
    page.wait(50); $('end-again').click(); $('end-menu').click(); $('end-watch').click();
    expect(r.park.state.mode).toBe('end'); expect(r.park.state.run).toBe(run);
    expect($('end').hidden).toBe(false); expect($('start').hidden).toBe(true);
    expect(JSON.stringify(saved(storage))).toBe(kept); expect(r.record.done.farm).toBe(1);
    page.wait(); $('end-again').click();
    expect(r.park.state.mode).toBe('role'); expect(r.park.state.run).toBe(run + 1); expect(r.park.state.ti).toBe(0);
  });

  it('存不了的瀏覽器：照樣能選角色', async () => {
    const throwing = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
    const deniedWin = { get localStorage() { throw new Error('denied'); } };
    for (const opts of [{ storage: undefined }, { storage: undefined, win: deniedWin }, { storage: throwing }]) {
      page.stop(); mountPage();
      const r = await page.open(opts);
      page.wait(); $('in-back').click();
      page.wait(); btn('vol').click();
      expect(r.park.state.mode).toBe('role'); expect(r.park.state.role).toBe('vol');
      expect($('start').hidden).toBe(true); expect($('hud').hidden).toBe(false);
      $('menu-btn').click();
      expect(btn('vol').classList.contains('played')).toBe(true);        // remembered for as long as the page is open
    }
  });

  it('先看園區自己運轉 → 看園區；看園區的卡片按鈕與右上角的換角色都回到清單', async () => {
    const r = await page.open({ storage: memoryStorage(seen) });
    page.wait(); $('watch-btn').click();
    expect(r.park.state.mode).toBe('watch'); expect($('start').hidden).toBe(true); expect($('hud').hidden).toBe(false);
    page.frame();
    expect($('task-go').textContent).toBe(d.ui.watch.go);
    $('task-go').click();
    expect(r.park.state.mode).toBe('menu'); expect($('start').hidden).toBe(false); expect($('hud').hidden).toBe(true);
    page.wait(); btn('mentor').click(); page.frame();
    $('menu-btn').click();
    expect(r.park.state.mode).toBe('menu'); expect($('start').hidden).toBe(false); expect($('hud').hidden).toBe(true);
    expect(btn('mentor').classList.contains('played')).toBe(true);
  });

  it('點開的人物說明卡，回清單再進來時已經收起來', async () => {
    const r = await page.open({ storage: memoryStorage(seen) });
    page.wait(); $('watch-btn').click(); page.frame();
    r.hud.showInfo('標題', '第二行', '');
    expect($('who').hidden).toBe(false);
    $('task-go').click(); page.wait(); btn('farm').click();
    expect($('who').hidden).toBe(true);
  });

  // Takes the park to a moment in the middle of the day, then leaves for the list and picks another role.
  const leaveAndSwitch = (r, to) => {
    $('menu-btn').click();
    expect(r.park.state.mode).toBe('menu'); expect($('hud').hidden).toBe(true); expect($('start').hidden).toBe(false);
    expect($('sheet').hidden).toBe(true);                              // at once, not on the next frame
    page.frame();
    page.wait(); btn(to).click();
    expect($('task-title').textContent).toBe(d.days[to].tasks[0].title);
    page.frame();
    const st = r.park.state;
    expect(st.mode).toBe('role'); expect(st.role).toBe(to); expect(st.ti).toBe(0);
    expect(st.scene).toBeNull(); expect(st.ff).toBe(false); expect(st.near).toBe(false); expect(st.guided).toBe(false); expect(st.sel).toBeNull();
    expect(r.park.player.id).toBe(d.days[to].who); expect(r.park.player.carry).toBeNull();
    expect($('sheet').hidden).toBe(true); expect($('end').hidden).toBe(true); expect($('hud').hidden).toBe(false);
    expect($('task').hidden).toBe(false); expect($('task-title').textContent).toBe(d.days[to].tasks[0].title);
    expect($('clock').classList.contains('ff')).toBe(false); expect($('clock-s').textContent).toBe(d.days[to].name);
    expect(document.querySelector('.auto-hit')).toBeNull();
  };

  it('玩到一半離開（特寫開著），換一個角色：從第一件事乾乾淨淨開始', async () => {
    const r = await page.open({ storage: memoryStorage(seen) });
    page.wait(); btn('farm').click(); openTask(r.park); page.frame();
    expect($('sheet').hidden).toBe(false);
    expect(r.park.task.place).toBe('gate'); expect($('sh-stage').textContent).toContain('慢慢說');     // the talk with the mentor at the gate
    leaveAndSwitch(r, 'work');
    const laolin = r.park.agents.find((a) => a.id === 'laolin');
    expect(laolin.day.some((e) => e.act === 'welcome' || e.act === 'guide')).toBe(false); expect(laolin.vis).toBe(0);
  });

  it('玩到一半離開（時間快轉中），換一個角色：從第一件事乾乾淨淨開始', async () => {
    const r = await page.open({ storage: memoryStorage(seen) });
    page.wait(); btn('farm').click();
    for (let i = 0; i < 8 && !r.park.state.ff; i++) playTask(r.park);
    expect(r.park.state.ff).toBe(true);
    page.frame();
    expect($('clock').classList.contains('ff')).toBe(true);
    leaveAndSwitch(r, 'acct');
  });

  it('玩到一半離開（自動模式在跑），換一個角色：從第一件事乾乾淨淨開始，自動模式還開著', async () => {
    const r = await page.open({ storage: memoryStorage(seen) });
    page.wait(); $('auto-box').click(); btn('learner').click();
    for (let i = 0; i < 6000 && !(r.park.state.scene && r.auto.target); i++) page.frame(50);
    expect(r.auto.target).not.toBeNull();
    page.frame();
    expect(document.querySelector('.auto-hit')).not.toBeNull();
    leaveAndSwitch(r, 'mentor');
    expect(r.auto.on).toBe(true); expect(r.auto.target).toBeNull(); expect(r.auto.reading).toBe(false);
    expect($('auto-box').checked).toBe(true);
  });

  it('接手角色時鏡頭直接對準你，不是從別處慢慢移過來；看園區時對準園區中央', async () => {
    const r = await page.open({ storage: memoryStorage(seen) });
    page.wait(); $('watch-btn').click(); r.view.cam.free = 3; r.view.cam.x = 100; r.view.cam.y = 100;
    $('task-go').click(); page.wait(); btn('shop').click();
    expect(r.view.cam.free).toBe(0);
    expect([r.view.cam.x, r.view.cam.y]).toEqual([r.park.player.x, r.park.player.y]);
    $('menu-btn').click(); r.view.cam.x = 100; page.wait(); $('watch-btn').click();
    expect([r.view.cam.x, r.view.cam.y]).toEqual([d.map.world.cx, d.map.world.cy]);
  });

  // Plays the role's last job by hand up to the point where only 收工 is left.
  const toLastTask = (r, role) => {
    r.park.beginRole(role, d.days[role].tasks.length - 1); openTask(r.park); page.frame();
    const sc = r.park.state.scene;
    for (let i = 0; i < 400 && !sc.done; i++) { const id = sc.auto(); if (id === null) r.park.tick(0.1); else r.park.press(id); }
    page.frame();
  };

  it('自己玩完一次：回清單是綠色「✓ 玩過 1 次」；收工連按兩下也只算一次', async () => {
    const storage = memoryStorage(seen);
    const r = await page.open({ storage });
    page.wait(); btn('farm').click();
    toLastTask(r, 'farm');
    $('sh-next').click(); $('sh-next').click(); page.frame(); page.frame();
    expect(r.record.done.farm).toBe(1); expect(saved(storage).done.farm).toBe(1);
    expect($('end').hidden).toBe(false);
    page.wait(); $('end-menu').click();
    expect($('end').hidden).toBe(true); expect($('start').hidden).toBe(false); expect(r.park.state.mode).toBe('menu');
    expect(btn('farm').classList.contains('played')).toBe(true);
    expect(btn('farm').querySelector('.role-done').textContent).toBe('✓ 玩過 1 次');
  });

  it('結尾卡：再當一次接同一個角色，自動模式還開著；看園區自己運轉到看園區', async () => {
    const r = await page.open({ storage: memoryStorage(seen) });
    page.wait(); $('auto-box').click(); btn('acct').click();
    toLastTask(r, 'acct');
    $('sh-next').click(); page.frame();
    expect($('end').hidden).toBe(false); expect(r.record.done.acct).toBeUndefined();
    page.wait(); $('end-again').click();
    expect(r.park.state.mode).toBe('role'); expect(r.park.state.role).toBe('acct'); expect(r.park.state.ti).toBe(0);
    expect(r.auto.on).toBe(true); expect($('start').hidden).toBe(true); expect($('hud').hidden).toBe(false);
    page.frame();
    expect($('auto-btn').hidden).toBe(false); expect($('auto-btn').textContent).toBe(d.ui.auto.on);
    toLastTask(r, 'acct'); $('sh-next').click(); page.frame();
    page.wait(); $('end-watch').click();
    expect(r.park.state.mode).toBe('watch'); expect($('end').hidden).toBe(true); expect($('start').hidden).toBe(true);
    // the bookkeeper was only run by auto mode: tried, but no count
    $('task-go').click();
    expect(btn('acct').querySelector('.role-done').textContent).toBe('✓ 玩過');
  });
});
