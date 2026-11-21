import { describe, it, expect } from 'vitest';
import { readData } from './helpers/data.js';
import { createRng } from '../js/engine/rng.js';
import { createRoads } from '../js/engine/roads.js';
import { toMin, RATE, NPC_SPEED, DWELL, period, clockParts } from '../js/engine/time.js';
import { fill } from '../js/engine/text.js';
import { createAgents, resetAgent, settle, updateAgent, follow, moodOf } from '../js/engine/agents.js';

const d = readData();
const mk = () => ({ roads: createRoads(d.map), acts: d.acts, map: d.map, rng: createRng(1) });
const byName = (agents, name) => agents.find((a) => a.name === name);

// Walks agent a from 06:20 until it arrives; returns the clock at arrival.
function walkToFirstSpot(a, ctx) {
  let clock = toMin('06:20');
  for (let i = 0; i < 4000 && !a.arrived; i++) { updateAgent(a, 0.05, clock, NPC_SPEED, ctx); clock += RATE.idle * 0.05; }
  return clock;
}

describe('rng / time / text', () => {
  it('同一個種子給出同一串亂數，數值落在 [0,1)', () => {
    const a = createRng(7), b = createRng(7);
    const xs = [a(), a(), a()];
    expect(xs).toEqual([b(), b(), b()]);
    xs.forEach((x) => { expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThan(1); });
    expect(createRng(8)()).not.toBe(xs[0]);
  });
  it('toMin 與 period / clockParts', () => {
    expect(toMin('06:20')).toBe(380);
    expect(period(toMin('06:59'))).toBe('dawn');
    expect(period(toMin('07:00'))).toBe('morning');
    expect(period(toMin('11:00'))).toBe('noon');
    expect(period(toMin('13:00'))).toBe('afternoon');
    expect(period(toMin('17:00'))).toBe('dusk');
    expect(period(toMin('19:00'))).toBe('night');
    expect(clockParts(toMin('15:47'))).toEqual({ period: 'afternoon', h12: 3, mm: 40 });
    expect(clockParts(toMin('12:05')).h12).toBe(12);
  });
  it('fill 把 %鍵 換成值', () => {
    expect(fill('%n 在 %t 做 %s', { n: 'A', t: 'B', s: 'C' })).toBe('A 在 B 做 C');
  });
});

describe('agents', () => {
  it('建立時不改動原資料，day 多出 t（分鐘），人物帶 id 與 identity', () => {
    const before = JSON.stringify(d.people);
    const agents = createAgents(d.people, createRng(1));
    expect(JSON.stringify(d.people)).toBe(before);
    expect(agents).toHaveLength(d.people.length);
    const a = agents[0];
    expect(a.id).toBe(d.people[0].id);
    expect(a.identity).toBe(d.people[0].identity);
    expect(a.day[0].t).toBe(toMin(d.people[0].day[0].at));
    expect([a.x, a.y, a.vis, a.cur]).toEqual([0, 0, 0, -1]);
  });

  it('阿禾 06:20 出發，走到葉菜畦的定點開始採收', () => {
    const ctx = mk(), a = createAgents(d.people, ctx.rng)[0];
    walkToFirstSpot(a, ctx);
    expect(a.arrived).toBe(true); expect(a.act).toBe('harvest');
    expect(a.x).toBeCloseTo(539.2, 0); expect(a.y).toBeCloseTo(1094.4, 0);
  });

  it('到了一個地方至少待 8 分鐘才去下一處', () => {
    const ctx = mk(), a = createAgents(d.people, ctx.rng)[0];
    walkToFirstSpot(a, ctx);
    expect(a.arrived).toBe(true);
    expect(DWELL).toBe(8);
    const first = a.cur, t0 = a.since, nextAt = a.day[first + 1].t;
    // Pretend arrival happened just before the next entry is due.
    a.since = nextAt - 3;
    updateAgent(a, 0.05, nextAt, NPC_SPEED, ctx);
    expect(a.cur).toBe(first);
    expect(a.arrived).toBe(true);
    updateAgent(a, 0.05, nextAt + 4.99, NPC_SPEED, ctx);
    expect(a.cur).toBe(first);
    updateAgent(a, 0.05, nextAt + 5, NPC_SPEED, ctx);
    expect(a.cur).toBe(first + 1);
    expect(a.arrived).toBe(false);
    expect(t0).toBeLessThan(nextAt);
  });

  it('settle：中午 12:00 阿禾坐在餐桌', () => {
    const ctx = mk(), agents = createAgents(d.people, ctx.rng);
    settle(agents, 720, d.acts, d.map, ctx.rng);
    expect([agents[0].x, agents[0].y]).toEqual([1004, 786]);
    expect(agents[0].act).toBe('rest'); expect(agents[0].arrived).toBe(true);
  });

  it('還沒到上工時間的人看不見；進了辦公室的人也看不見', () => {
    const ctx = mk(), agents = createAgents(d.people, ctx.rng), q = byName(agents, '清明');
    settle(agents, toMin('06:00'), d.acts, d.map, ctx.rng);
    expect(q.vis).toBe(0); expect(q.cur).toBe(-1);
    settle(agents, toMin('09:00'), d.acts, d.map, ctx.rng);
    expect(q.act).toBe('ledger'); expect(q.vis).toBe(0);
    expect(byName(agents, '阿禾').vis).toBe(1);
  });

  it('被點住的人不動，放開以後重新上路', () => {
    const ctx = mk(), agents = createAgents(d.people, ctx.rng), a = agents[0];
    settle(agents, toMin('09:20'), d.acts, d.map, ctx.rng);
    const clock = toMin('10:40'); // the 10:30 entry is due and the dwell has passed
    a.paused = true;
    const [x, y, cur] = [a.x, a.y, a.cur];
    updateAgent(a, 1, clock, NPC_SPEED, ctx);
    expect([a.x, a.y, a.cur]).toEqual([x, y, cur]);
    expect(a.moving).toBe(false);
    a.paused = false; a.cur = -2;
    updateAgent(a, 0.05, clock, NPC_SPEED, ctx);
    expect(a.cur).toBe(3);
    expect(a.path).not.toBeNull();
    expect(a.arrived).toBe(false);
    expect([a.x, a.y]).not.toEqual([x, y]);
  });

  it('往畫面上方走時 up 為真', () => {
    const a = createAgents(d.people, createRng(1))[0];
    a.x = 100; a.y = 100; a.path = [[100, 100], [100, 0]]; a.pi = 0;
    expect(a.up).toBe(false);
    follow(a, 10);
    expect(a.up).toBe(true);
    a.path = [[a.x, a.y], [200, a.y]]; a.pi = 0;
    follow(a, 10);
    expect(a.up).toBe(false);
  });

  it('follow 走完路回傳 true，沒走完回傳 false', () => {
    const a = createAgents(d.people, createRng(1))[0];
    a.x = 0; a.y = 0; a.path = [[0, 0], [30, 0]]; a.pi = 0;
    expect(follow(a, 10)).toBe(false);
    expect(follow(a, 100)).toBe(true);
    expect([a.x, a.y]).toEqual([30, 0]);
  });

  it('一格特別久也不會出錯', () => {
    const ctx = mk(), a = createAgents(d.people, ctx.rng)[0];
    updateAgent(a, 5, toMin('06:20'), NPC_SPEED, ctx);
    expect(Number.isFinite(a.x) && Number.isFinite(a.y)).toBe(true);
  });

  it('resetAgent 把人放回入口外，清掉路徑', () => {
    const ctx = mk(), a = createAgents(d.people, ctx.rng)[0];
    a.cur = 3; a.vis = 1; a.arrived = true; a.paused = true; a.path = [[0, 0]];
    resetAgent(a, d.map, ctx.rng);
    expect([a.cur, a.vis, a.path, a.arrived, a.paused]).toEqual([-1, 0, null, false, false]);
    const w = d.map.world;
    expect(Math.hypot(a.x - w.cx, a.y - w.cy)).toBeCloseTo(d.map.spawn.r, 5);
  });

  it('相同種子給出相同的模擬結果', () => {
    const run = () => {
      const ctx = mk(), agents = createAgents(d.people, ctx.rng);
      settle(agents, toMin('08:00'), d.acts, d.map, ctx.rng);
      let clock = toMin('08:00');
      for (let i = 0; i < 200; i++) { agents.forEach((a) => updateAgent(a, 0.05, clock, NPC_SPEED, ctx)); clock += 0.2; }
      return agents.map((a) => [a.x, a.y, a.cur]);
    };
    expect(run()).toEqual(run());
  });

  it('moodOf：吃飯開心、彎腰工作專注、其餘微笑；沒到的人微笑', () => {
    const a = createAgents(d.people, createRng(1))[0];
    expect(moodOf(a, d.acts)).toBe('smile');
    a.arrived = true;
    a.act = 'eat'; expect(moodOf(a, d.acts)).toBe('happy');
    a.act = 'harvest'; expect(moodOf(a, d.acts)).toBe('focus');
    a.act = 'sort'; expect(moodOf(a, d.acts)).toBe('focus');
    a.act = 'stroll'; expect(moodOf(a, d.acts)).toBe('smile');
    a.player = true; a.act = 'eat'; expect(moodOf(a, d.acts)).toBe('smile');
  });
});
