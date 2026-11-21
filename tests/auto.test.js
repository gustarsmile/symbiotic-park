import { describe, it, expect, beforeEach } from 'vitest';
import { createPark } from '../js/engine/park.js';
import { createAuto, AUTO, FAST, pace, readSeconds } from '../js/engine/auto.js';
import { toMin } from '../js/engine/time.js';
import { readData } from './helpers/data.js';

const DT = 0.05;
const data = readData();
let park, auto;
beforeEach(() => { park = createPark(data); auto = createAuto(park); });

// Drive park and auto together until the day ends; count presses the scene refused.
function run(p, a, maxSteps = 40000) {
  let rejected = 0, n = 0;
  const press = p.press.bind(p);
  p.press = (id) => { const r = press(id); if (!r.ok) rejected++; return r; };
  while (p.state.mode !== 'end' && n < maxSteps) { p.tick(DT); a.step(DT); n++; }
  p.press = press;
  return { seconds: n * DT, rejected };
}

function watchPresses(p) {
  const calls = [];
  const press = p.press.bind(p);
  p.press = (id) => { calls.push(id); return press(id); };
  return calls;
}

describe('auto', () => {
  it.each(['farm', 'work', 'shop', 'acct', 'learner', 'vol', 'mentor'])('%s：自動模式從第一件事跑到收工，沒有按錯', (id) => {
    auto.set(true); park.beginRole(id); const r = run(park, auto);
    expect(park.state.mode).toBe('end'); expect(r.rejected).toBe(0); expect(r.seconds).toBeLessThan(600);
  });

  it('每一下都先框起來再按', () => {
    auto.set(true); park.beginRole('farm');
    const calls = watchPresses(park);
    let framed = 0, n = 0;
    while (park.state.mode !== 'end' && n++ < 40000) {
      const before = calls.length, scene = park.state.scene;
      const expected = scene && !scene.done ? scene.auto() : null;
      const target = auto.target;
      park.tick(DT); auto.step(DT);
      if (calls.length > before) {
        // a press happened: the same id must already have been framed on an earlier step
        expect(target).not.toBeNull(); expect(calls[calls.length - 1]).toBe(target); expect(target).toBe(expected);
        expect(auto.target).toBeNull(); framed++;
      }
    }
    expect(framed).toBeGreaterThan(5); expect(park.state.mode).toBe('end');
  });

  it('解說停留的秒數看字數，最少 6 秒、最多 18 秒', () => {
    expect(readSeconds('短')).toBe(6); expect(readSeconds('字'.repeat(50))).toBeCloseTo(11, 5); expect(readSeconds('字'.repeat(500))).toBe(18);
  });

  it('解說停留時 reading 為真、countdown 遞減，其餘時間是 0', () => {
    auto.set(true); park.beginRole('farm');
    expect(auto.countdown).toBe(0); expect(auto.reading).toBe(false);
    let sawReading = false, wasReading = false, prev = Infinity, n = 0;
    while (park.state.mode !== 'end' && n++ < 40000) {
      park.tick(DT); auto.step(DT);
      if (auto.reading) {
        if (!wasReading) prev = Infinity;
        sawReading = true; expect(auto.countdown).toBeLessThanOrEqual(prev); prev = auto.countdown;
      } else expect(auto.countdown).toBe(0);
      wasReading = auto.reading;
    }
    expect(sawReading).toBe(true);
  });

  it('速度只有 1 和 1.5', () => { auto.setSpeed(1.5); expect(auto.speed).toBe(1.5); auto.setSpeed(2); expect(auto.speed).toBe(1); auto.setSpeed('x'); expect(auto.speed).toBe(1); });

  it('加快時字的部分 1.5 倍、走路與等時間 2 倍；只在自動模式的角色時間裡生效', () => {
    auto.setSpeed(1.5); auto.set(true);
    const p = pace(0.04, auto, 'role'); expect(p.move).toBeCloseTo(0.04 * FAST.move); expect(p.read).toBeCloseTo(0.04 * FAST.read);
    expect(p.move).toBeCloseTo(0.08); expect(p.read).toBeCloseTo(0.06);
    expect(pace(0.04, auto, 'watch')).toEqual({ move: 0.04, read: 0.04 });
    auto.set(false); expect(pace(0.04, auto, 'role')).toEqual({ move: 0.04, read: 0.04 });
    auto.set(true); auto.setSpeed(1); expect(pace(0.04, auto, 'role')).toEqual({ move: 0.04, read: 0.04 });
  });

  it('加快時七個角色照樣跑完、沒按錯', () => {
    for (const id of ['farm', 'work', 'shop', 'acct', 'learner', 'vol', 'mentor']) {
      const pk = createPark(data), a = createAuto(pk);
      a.setSpeed(1.5); a.set(true); pk.beginRole(id);
      let rejected = 0, n = 0; const press = pk.press.bind(pk);
      pk.press = (x) => { const r = press(x); if (!r.ok) rejected++; return r; };
      while (pk.state.mode !== 'end' && n++ < 40000) {
        const t = pace(DT, a, pk.state.mode);
        pk.tick(t.move); a.step(t.read);
      }
      expect(pk.state.mode).toBe('end'); expect(rejected).toBe(0);
    }
  });

  it('跑到一半關掉自動：框起來的目標清掉，之後不再自己按', () => {
    auto.set(true); park.beginRole('farm');
    const calls = watchPresses(park);
    let n = 0;
    while (auto.target === null && n++ < 40000) { park.tick(DT); auto.step(DT); }
    expect(auto.target).not.toBeNull();
    auto.set(false);
    expect(auto.target).toBeNull(); expect(auto.reading).toBe(false); expect(auto.on).toBe(false);
    const pressed = calls.length, ti = park.state.ti;
    for (let i = 0; i < 2000; i++) { park.tick(DT); auto.step(DT); }
    expect(calls.length).toBe(pressed); expect(park.state.ti).toBe(ti); expect(auto.target).toBeNull();
    expect(park.state.mode).toBe('role');
  });

  it('跑到一半換角色再開始：從新的一天第一件事接著跑完', () => {
    auto.set(true); park.beginRole('farm');
    for (let i = 0; i < 300; i++) { park.tick(DT); auto.step(DT); }
    park.toMenu(); park.beginRole('acct');
    expect(park.state.ti).toBe(0); expect(park.state.scene).toBeNull();
    const r = run(park, auto);
    expect(park.state.mode).toBe('end'); expect(r.rejected).toBe(0); expect(park.state.role).toBe('acct');
  });

  it('換角色之後沒有殘留的目標、讀秒或進度', () => {
    auto.set(true); park.beginRole('farm');
    let n = 0;
    while (auto.target === null && n++ < 40000) { park.tick(DT); auto.step(DT); }
    expect(auto.target).not.toBeNull();
    park.toMenu(); park.beginRole('acct'); park.tick(DT); auto.step(DT);
    expect(auto.target).toBeNull(); expect(auto.reading).toBe(false); expect(auto.countdown).toBe(0);
    expect(park.state.scene).toBeNull(); expect(park.state.ti).toBe(0);
  });

  it('園區的時鐘停在截止時間時，自動模式照樣跑得完那件事', () => {
    auto.set(true); park.beginRole('farm');
    park.state.clock = toMin(park.task.hold);
    const r = run(park, auto);
    expect(park.state.mode).toBe('end'); expect(r.rejected).toBe(0);
  });

  it('沒開自動、或在看熱鬧的時候，step 什麼都不做', () => {
    park.beginRole('farm');
    for (let i = 0; i < 400; i++) { park.tick(DT); auto.step(DT); }
    expect(park.state.scene).toBeNull(); expect(park.player.path).toBeNull();
    park.toMenu(); park.beginWatch(); auto.set(true);
    for (let i = 0; i < 200; i++) { park.tick(DT); auto.step(DT); }
    expect(park.state.mode).toBe('watch'); expect(auto.target).toBeNull();
  });

  it('時間常數沒變', () => {
    expect(AUTO).toEqual({ afterBegin: 1.2, afterToggle: 0.8, afterWalk: 0.6, sceneOpen: 1.8, highlight: 0.5,
      afterPress: 0.8, idle: 0.3, afterNext: 1.2, readBase: 3, readPerChar: 0.16, readMin: 6, readMax: 18 });
    expect(FAST).toEqual({ read: 1.5, move: 2 });
  });
});
