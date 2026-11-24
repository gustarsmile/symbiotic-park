import { describe, it, expect, beforeEach } from 'vitest';
import { readData } from './helpers/data.js';
import { openTask, playTask, playDay, ALL_TASKS } from './helpers/play.js';
import { createPark } from '../js/engine/park.js';
import { toMin, NEAR } from '../js/engine/time.js';

const d = readData();
let park;
beforeEach(() => { park = createPark(d); });
const walkIn = () => { park.walkTo(park.task.spot, true); for (let i = 0; i < 4000 && !park.state.scene; i++) park.tick(0.05); };

describe('園區模擬核心', () => {
  it('開機是選單，時鐘照看園區的走法在後面跑', () => {
    expect(park.state).toMatchObject({ mode: 'menu', role: null, scene: null, sel: null });
    expect(park.player).toBe(null); expect(park.task).toBe(null); expect(park.day).toBe(null);
    const c = park.state.clock; park.tick(1); expect(park.state.clock).toBeCloseTo(c + 4.2, 6);
  });
  it('清單有 47 組，從資料算出來', () => {
    expect(ALL_TASKS).toHaveLength(47);
    expect(ALL_TASKS.every(([id, i]) => d.days[id].tasks[i])).toBe(true);
  });
  it('接手農夫：06:12 開始，站在大門裡面', () => {
    park.beginRole('farm');
    expect(park.state).toMatchObject({ mode: 'role', role: 'farm', ti: 0, clock: 372, ff: false });
    expect(park.player.id).toBe('ahe'); expect([park.player.x, park.player.y]).toEqual(d.map.start);
    expect(park.day.id).toBe('farm'); expect(park.task).toBe(d.days.farm.tasks[0]);
  });
  it('接手第 3 件事：站在上一件的地點、拿著上一件的東西，時鐘提早 14 分', () => {
    park.beginRole('farm', 2);
    const prev = d.days.farm.tasks[1];
    expect([park.player.x, park.player.y]).toEqual(prev.spot); expect(park.player.carry).toBe(prev.carry);
    expect(park.state.clock).toBe(toMin(d.days.farm.tasks[2].at) - 14);
  });
  it('時鐘到了截止時間就停住，一格再久也不會超過', () => {
    park.beginRole('farm'); for (let i = 0; i < 1200; i++) park.tick(0.05);
    expect(park.state.clock).toBe(388); park.tick(5); expect(park.state.clock).toBe(388);
  });
  it('帶路走到了就自己開場景', () => {
    park.beginRole('farm'); park.walkTo(park.task.spot, true);
    for (let i = 0; i < 4000 && !park.state.scene; i++) park.tick(0.05);
    expect(park.state.scene).toBeTruthy(); expect(park.state.near).toBe(true);
  });
  it('場景還沒做完，finishTask 什麼都不做', () => {
    park.beginRole('farm'); walkIn();
    expect(park.state.scene.done).toBe(false);
    const carry = park.player.carry;
    expect(park.finishTask()).toBe(null);
    expect(park.state.ti).toBe(0); expect(park.state.scene).toBeTruthy(); expect(park.state.mode).toBe('role'); expect(park.player.carry).toBe(carry);
  });
  it('提早做完就快轉到下一件事的時間，快轉中不能開場景', () => {
    park.beginRole('farm', 1); playTask(park);
    expect(park.state).toMatchObject({ ti: 2, ff: true }); park.openScene(); expect(park.state.scene).toBe(null);
    for (let i = 0; i < 4000 && park.state.ff; i++) park.tick(0.05);
    expect(park.state.clock).toBeGreaterThanOrEqual(480); expect(park.state.clock).toBeLessThan(482);
  });
  it('快轉中電腦人物用快轉的速度走', () => {
    park.beginRole('farm', 1); playTask(park); expect(park.state.ff).toBe(true);
    let best = 0;
    for (let i = 0; i < 40 && park.state.ff; i++) {
      const before = park.agents.map((x) => [x.x, x.y, x.cur]);
      park.tick(0.05);
      park.agents.forEach((x, k) => { if (!x.player && x.cur === before[k][2]) best = Math.max(best, Math.hypot(x.x - before[k][0], x.y - before[k][1])); });
    }
    expect(best).toBeGreaterThan(66 * 0.05 + 0.5); expect(best).toBeLessThanOrEqual(220 * 0.05 + 1e-6);
  });
  it('做完一件事：手上換成這件事的東西，場景關掉', () => {
    park.beginRole('farm', 1); playTask(park);
    expect(park.player.carry).toBe(d.days.farm.tasks[1].carry); expect(park.player.carry).not.toBeNull(); expect(park.state.scene).toBe(null); expect(park.state.near).toBe(false);
  });
  it.each(['farm', 'work', 'shop', 'acct', 'learner', 'vol', 'mentor'])('%s：手動的走法走得完一整天，沒有一次被擋', (id) => {
    park.beginRole(id); const r = playDay(park);
    expect(r.rejected).toBe(0); expect(park.state.mode).toBe('end'); expect(park.state.ti).toBe(d.days[id].tasks.length - 1);
    expect(r.seconds).toBeGreaterThan(0);
  });
  it('最後一件做完回 end，ti 留在最後一件，之後時鐘照 end 的速度走', () => {
    const last = d.days.farm.tasks.length - 1;
    park.beginRole('farm', last);
    const orig = park.finishTask; const seen = [];
    park.finishTask = () => { const r = orig.call(park); seen.push(r); return r; };
    playTask(park);
    expect(seen).toEqual(['end']); expect(park.state.mode).toBe('end'); expect(park.state.ti).toBe(last);
    const c = park.state.clock; park.tick(1); expect(park.state.clock).toBeCloseTo(c + 3, 6);
  });
  it('玩得慢也做得完：時鐘停在截止時間，要等一下的三個場景照樣做完', () => {
    for (const [id, ti] of [['farm', 4], ['farm', 8], ['vol', 6]]) {
      park.beginRole(id, ti); park.state.clock = toMin(park.task.hold);
      expect(playTask(park).rejected).toBe(0); expect(park.state.clock).toBe(toMin(d.days[id].tasks[ti].hold));
    }
  });
  it('場景的等待跟園區時鐘無關：時鐘停住時 advance 照樣每格被呼叫', () => {
    park.beginRole('farm', 4); park.state.clock = toMin(park.task.hold); walkIn();
    let got = 0; const sc = park.state.scene; const adv = sc.advance; sc.advance = (s) => { got += s; adv.call(sc, s); };
    const c = park.state.clock; park.tick(0.5); park.tick(0.25);
    expect(got).toBeCloseTo(0.75, 6); expect(park.state.clock).toBe(c);
  });
  it('做到一半換角色：新的一天是乾淨的', () => {
    park.beginRole('farm'); walkIn();
    park.select(park.agents[3]); const run = park.state.run;
    park.toMenu(); expect(park.state).toMatchObject({ mode: 'menu', scene: null, sel: null, ff: false }); expect(park.agents.some((a) => a.player || a.paused)).toBe(false);
    park.beginRole('vol'); expect(park.state.run).toBe(run + 2); expect(park.state).toMatchObject({ role: 'vol', ti: 0, scene: null }); expect(park.player.id).toBe('chunzhi');
  });
  it('錯開只在那個角色的一天裡有效', () => {
    park.beginRole('shop'); expect(park.agents[0].day.some((e) => e.act === 'shopkeep')).toBe(false);
    park.beginWatch(); expect(park.agents[0].day.some((e) => e.act === 'shopkeep')).toBe(true);
    park.beginRole('shop'); park.toMenu(); expect(park.agents[0].day.some((e) => e.act === 'shopkeep')).toBe(true);
  });
  it('看園區：跑完一整天會從清晨重來，沒有人掉出地圖', () => {
    park.beginWatch(); expect(park.state.clock).toBe(375); let wrapped = false, prev = 375;
    for (let i = 0; i < 9000; i++) { park.tick(0.05); if (park.state.clock < prev) wrapped = true; prev = park.state.clock; }
    expect(wrapped).toBe(true); for (const a of park.agents) expect(Number.isFinite(a.x) && Number.isFinite(a.y)).toBe(true);
  });
  it('同一個種子，同樣的操作，同樣的結果', () => {
    const run = () => { const p = createPark(d); p.beginWatch(); for (let i = 0; i < 600; i++) p.tick(0.05); return p.agents.map((a) => [a.x, a.y]); };
    expect(run()).toEqual(run());
  });
  it('點住的人不走；接手的那個人點不住', () => {
    park.beginRole('farm');
    const who = park.agents.find((a) => !a.player);
    park.select(who); expect(park.state.sel).toBe(who); expect(who.paused).toBe(true); expect(who.path).toBe(null);
    const at = [who.x, who.y]; for (let i = 0; i < 100; i++) park.tick(0.05);
    expect([who.x, who.y]).toEqual(at);
    park.release(); expect(park.state.sel).toBe(null); expect(who.paused).toBe(false); expect(who.cur).toBe(-2);
    const me = park.player; park.select(me); expect(me.paused).toBe(false); expect(park.state.sel).toBe(null);
  });
  it('沒有開著的場景時 press 回 ok:false', () => { expect(park.press('x')).toEqual({ ok: false, tip: null }); });
  it('快轉時一格很長也不會跳過下一件事的時間', () => {
    park.beginRole('farm', 1); playTask(park); expect(park.state.ff).toBe(true);
    const at = toMin(d.days.farm.tasks[2].at), hold = toMin(d.days.farm.tasks[2].hold);
    park.tick(60); expect(park.state.clock).toBe(at);
    park.tick(0.05); expect(park.state.ff).toBe(false);
    for (let i = 0; i < 3000; i++) { park.tick(0.05); expect(park.state.clock).toBeLessThanOrEqual(hold); }
  });
  it('收工之後時鐘過了截止時間也會從清晨重來', () => {
    park.beginRole('farm', d.days.farm.tasks.length - 1); playTask(park); expect(park.state.mode).toBe('end');
    let wrapped = false;
    for (let i = 0; i < 9000; i++) { park.tick(0.05); if (park.state.clock < 500) wrapped = true; expect(park.state.clock).toBeLessThanOrEqual(1180); }
    expect(wrapped).toBe(true); expect(park.state.clock).toBeLessThan(1180);
    for (const a of park.agents) expect(Number.isFinite(a.x) && Number.isFinite(a.y)).toBe(true);
  });
  it('接手角色的參數不對就丟錯，什麼都不變，之後還能照常走', () => {
    park.beginRole('farm');
    const snap = JSON.parse(JSON.stringify({ ...park.state, scene: null, sel: null }));
    const agents = park.agents;
    expect(() => park.beginRole('nope')).toThrow(/nope/);
    expect(() => park.beginRole('farm', 99)).toThrow(/99/);
    expect(() => park.beginRole('farm', 1.5)).toThrow(/1.5/);
    expect(JSON.parse(JSON.stringify({ ...park.state, scene: null, sel: null }))).toEqual(snap);
    expect(park.agents).toBe(agents);
    expect(() => park.tick(0.05)).not.toThrow();
  });
  it('快轉中回選單或換角色：一天是乾淨的', () => {
    park.beginRole('farm', 1); playTask(park); expect(park.state.ff).toBe(true);
    let run = park.state.run; park.toMenu();
    expect(park.state).toMatchObject({ mode: 'menu', ff: false, scene: null, run: run + 1 });
    park.beginRole('farm', 1); playTask(park); expect(park.state.ff).toBe(true);
    park.beginRole('vol');
    expect(park.state).toMatchObject({ role: 'vol', ti: 0, ff: false, scene: null }); expect(park.player.id).toBe('chunzhi');
  });
});

describe('當農夫時的老林', () => {
  const laolin = () => park.agents.find((a) => a.id === 'laolin');
  const spotOf = (act) => d.days.farm.npc.find((o) => o.add && o.add.act === act).add.spot;

  it('大門口那一幕：你走幾步（超過 NEAR、不到 120）到老林旁邊，跟他隔 30 到 45', () => {
    const job = d.days.farm.tasks[0], gate = spotOf('welcome');
    const fromStart = Math.hypot(job.spot[0] - d.map.start[0], job.spot[1] - d.map.start[1]);
    expect(fromStart).toBeGreaterThan(NEAR); expect(fromStart).toBeLessThanOrEqual(120);
    const apart = Math.hypot(job.spot[0] - gate[0], job.spot[1] - gate[1]);
    expect(apart).toBeGreaterThanOrEqual(30); expect(apart).toBeLessThanOrEqual(45);
    park.beginRole('farm'); park.tick(0.05);
    expect(park.state.near).toBe(false);                     // the talk does not open where you come in
    walkIn();
    expect([park.player.x, park.player.y]).toEqual(job.spot); expect(park.state.scene).not.toBeNull();
    expect([laolin().x, laolin().y]).toEqual(gate);
  });

  it('一開始（06:12）老林就站在大門口：看得見、到了、沒有在走，你說話的時候他也不走開', () => {
    park.beginRole('farm');
    expect(park.state.clock).toBe(372);
    const a = laolin();
    expect([a.x, a.y]).toEqual(spotOf('welcome')); expect(a.vis).toBe(1); expect(a.act).toBe('welcome');
    expect(a.arrived).toBe(true); expect(a.path).toBeNull();
    walkIn();                                               // the talk at the gate is open; the clock runs up to its hold
    expect(park.task.place).toBe('gate'); expect(park.state.scene).not.toBeNull();
    for (let i = 0; i < 400; i++) park.tick(0.05);
    expect(park.state.clock).toBe(toMin(d.days.farm.tasks[0].hold));
    expect([a.x, a.y]).toEqual(spotOf('welcome')); expect(a.vis).toBe(1); expect(a.moving).toBe(false);
  });

  it('說完話，老林走去葉菜畦；你採收的時候他就在旁邊陪你', () => {
    park.beginRole('farm'); playTask(park);
    expect(park.state.ti).toBe(1);
    openTask(park);                                         // at the beds, the harvest is open
    const a = laolin(), hold = toMin(park.task.hold);
    for (let i = 0; i < 4000 && !(a.arrived && a.act === 'guide'); i++) park.tick(0.05);
    expect(a.act).toBe('guide'); expect(a.arrived).toBe(true); expect([a.x, a.y]).toEqual(spotOf('guide'));
    expect(park.state.clock).toBeLessThan(hold); expect(park.state.scene).not.toBeNull();
    expect(Math.hypot(a.x - park.player.x, a.y - park.player.y)).toBeLessThan(NEAR);
  });

  it('特寫開著時離開，換別的角色：老林照原本的作息，大門口沒有人等', () => {
    park.beginRole('farm'); walkIn();
    expect(park.state.scene).not.toBeNull(); expect(laolin().act).toBe('welcome');
    const original = d.people.find((p) => p.id === 'laolin').day;
    for (const role of ['work', 'learner', 'shop']) {
      park.toMenu(); park.beginRole(role);
      expect(park.state.scene).toBeNull();
      const a = laolin();
      expect(a.day.map(({ at, via, spot, act }) => ({ at, via, spot, act }))).toEqual(original);
      expect(a.vis).toBe(0); expect(a.cur).toBe(-1);         // every one of these days starts before 09:10, his first entry
    }
    park.toMenu(); park.beginRole('mentor');
    expect(laolin().player).toBe(true); expect(laolin().day.some((e) => e.act === 'welcome' || e.act === 'guide')).toBe(false);
    park.beginWatch();
    expect(laolin().day.some((e) => e.act === 'welcome' || e.act === 'guide')).toBe(false);
  });
});
