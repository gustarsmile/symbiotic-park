import { describe, it, expect, beforeEach } from 'vitest';
import { readData } from './helpers/data.js';
import { playTask, playDay, ALL_TASKS } from './helpers/play.js';
import { createPark } from '../js/engine/park.js';
import { toMin } from '../js/engine/time.js';

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
  it('清單有 46 組，從資料算出來', () => {
    expect(ALL_TASKS).toHaveLength(46);
    expect(ALL_TASKS.every(([id, i]) => d.days[id].tasks[i])).toBe(true);
  });
  it('接手農夫：06:16 開始，站在大門裡面', () => {
    park.beginRole('farm');
    expect(park.state).toMatchObject({ mode: 'role', role: 'farm', ti: 0, clock: 376, ff: false });
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
    expect(park.state.clock).toBe(460); park.tick(5); expect(park.state.clock).toBe(460);
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
    park.beginRole('farm'); playTask(park);
    expect(park.state).toMatchObject({ ti: 1, ff: true }); park.openScene(); expect(park.state.scene).toBe(null);
    for (let i = 0; i < 4000 && park.state.ff; i++) park.tick(0.05);
    expect(park.state.clock).toBeGreaterThanOrEqual(480); expect(park.state.clock).toBeLessThan(482);
  });
  it('快轉中電腦人物用快轉的速度走', () => {
    park.beginRole('farm'); playTask(park); expect(park.state.ff).toBe(true);
    let best = 0;
    for (let i = 0; i < 40 && park.state.ff; i++) {
      const before = park.agents.map((x) => [x.x, x.y, x.cur]);
      park.tick(0.05);
      park.agents.forEach((x, k) => { if (!x.player && x.cur === before[k][2]) best = Math.max(best, Math.hypot(x.x - before[k][0], x.y - before[k][1])); });
    }
    expect(best).toBeGreaterThan(66 * 0.05 + 0.5); expect(best).toBeLessThanOrEqual(220 * 0.05 + 1e-6);
  });
  it('做完一件事：手上換成這件事的東西，場景關掉', () => {
    park.beginRole('farm'); playTask(park);
    expect(park.player.carry).toBe(d.days.farm.tasks[0].carry); expect(park.state.scene).toBe(null); expect(park.state.near).toBe(false);
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
    for (const [id, ti] of [['farm', 3], ['farm', 7], ['vol', 6]]) {
      park.beginRole(id, ti); park.state.clock = toMin(park.task.hold);
      expect(playTask(park).rejected).toBe(0); expect(park.state.clock).toBe(toMin(d.days[id].tasks[ti].hold));
    }
  });
  it('場景的等待跟園區時鐘無關：時鐘停住時 advance 照樣每格被呼叫', () => {
    park.beginRole('farm', 3); park.state.clock = toMin(park.task.hold); walkIn();
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
});
