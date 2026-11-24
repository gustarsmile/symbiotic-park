import { describe, it, expect, beforeEach } from 'vitest';
import { createPark } from '../js/engine/park.js';
import { createAuto, AUTO, FAST, pace, readSeconds, lineSeconds } from '../js/engine/auto.js';
import { toMin } from '../js/engine/time.js';
import { readData } from './helpers/data.js';
import { playScene } from './helpers/days.js';

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

  // Auto mode alone on one job: when each press happened (in the seconds auto mode is handed), the line a person
  // says on screen right after it, and when the job was finished.
  function pressesIn(role, ti, speed = 1) {
    const pk = createPark(data), a = createAuto(pk);
    a.setSpeed(speed); a.set(true); pk.beginRole(role, ti);
    const out = []; let t = 0, rejected = 0, opened = null;
    const press = pk.press.bind(pk);
    pk.press = (id) => { const r = press(id); if (!r.ok) rejected++; out.push({ t, line: pk.state.scene.view().show?.text ?? null }); return r; };
    for (let n = 0; n < 40000 && pk.state.mode === 'role' && pk.state.ti === ti; n++) {
      const p = pace(DT, a, pk.state.mode); pk.tick(p.move); a.step(p.read);
      if (opened === null && pk.state.scene) opened = t;            // the close-up appeared during this step
      t += p.read;
    }
    return { presses: out, opened, finished: t, rejected, step: DT * (speed === 1.5 ? FAST.read : 1) };
  }
  const gaps = (r) => r.presses.slice(1).map((p, i) => p.t - r.presses[i].t);
  // A pause of w seconds, then the highlight, then the press: counted in whole steps (and summed in floating point),
  // so up to five steps more.
  const near = (g, w, step) => { expect(g).toBeGreaterThanOrEqual(w - 1e-9); expect(g).toBeLessThan(w + 5 * step + 1e-9); };

  it('一句話要讀的秒數：3 秒加每個字 0.16 秒，最少 3 秒、最多 18 秒', () => {
    expect(lineSeconds('')).toBe(3); expect(lineSeconds('短')).toBeCloseTo(3.16, 9);
    expect(lineSeconds('字'.repeat(25))).toBeCloseTo(7, 9); expect(lineSeconds('字'.repeat(200))).toBe(18);
    expect(lineSeconds('字'.repeat(10))).toBeLessThan(readSeconds('字'.repeat(10)));          // a short line waits less than a short explanation
  });

  it('特寫裡換了一句人說的話：至少等 3 秒才按下一步；沒有人說話的步驟照舊', () => {
    const talk = data.days.farm.tasks[0];
    for (const speed of [1, 1.5]) {
      // the talk at the gate: each reply is read before the next is pressed, the last one before the explanation is
      const r = pressesIn('farm', 0, speed);
      expect(r.rejected).toBe(0);
      expect(r.presses.map((p) => p.line)).toEqual(talk.scene.steps.map((s) => s.show.text));
      gaps(r).forEach((g, i) => {
        const want = lineSeconds(r.presses[i].line) + AUTO.highlight;
        expect(g).toBeGreaterThanOrEqual(3); near(g, want, r.step);
      });
      const last = r.presses.at(-1);
      expect(r.finished - last.t).toBeGreaterThanOrEqual(lineSeconds(last.line) + readSeconds(talk.why.text) - 1e-9);
      // the harvest: six taps, then the phone; nobody speaks, so the pause after each press is as before
      const h = pressesIn('farm', 1, speed);
      expect(h.presses).toHaveLength(7); expect(h.presses.every((p) => p.line === null)).toBe(true);
      gaps(h).forEach((g) => near(g, AUTO.afterPress + AUTO.highlight, h.step));
    }
    // an existing scene with a line in a steps part: the volunteer's dinner (four bowls, then the newcomer at the door)
    const v = pressesIn('vol', 4), vg = gaps(v);
    expect(v.presses.map((p) => p.line)).toEqual([null, null, null, data.days.vol.tasks[4].scene[1].show.text, data.days.vol.tasks[4].scene[1].steps[0].show.text]);
    vg.slice(0, 3).forEach((g) => near(g, AUTO.afterPress + AUTO.highlight, DT));
    near(vg[3], lineSeconds(v.presses[3].line) + AUTO.highlight, DT);
  });

  it('特寫一打開就有人說話：第一句也等讀得完才按；打開時沒有人說話的特寫照舊', () => {
    const talk = data.days.farm.tasks[0].scene;
    for (const speed of [1, 1.5]) {
      const r = pressesIn('farm', 0, speed);
      expect(r.opened).not.toBeNull();
      expect(r.presses[0].t - r.opened).toBeGreaterThanOrEqual(lineSeconds(talk.show.text) - 1e-9);
      near(r.presses[0].t - r.opened, lineSeconds(talk.show.text) + AUTO.highlight, r.step);
      const h = pressesIn('farm', 1, speed);                       // the harvest opens on six bunches and no words
      near(h.presses[0].t - h.opened, AUTO.sceneOpen + AUTO.highlight, h.step);
    }
    expect(lineSeconds(talk.show.text)).toBeGreaterThan(AUTO.sceneOpen);
  });

  it('農夫整輪自動跑到結尾卡，沒有一次被擋', () => {
    for (const speed of [1, 1.5]) {
      const pk = createPark(data), a = createAuto(pk);
      a.setSpeed(speed); a.set(true); pk.beginRole('farm');
      const calls = watchPresses(pk);
      let rejected = 0, n = 0, real = 0; const press = pk.press;
      pk.press = (x) => { const r = press(x); if (!r.ok) rejected++; return r; };
      const tis = new Set();
      while (pk.state.mode !== 'end' && n++ < 40000) { const t = pace(DT, a, pk.state.mode); pk.tick(t.move); a.step(t.read); real += DT; tis.add(pk.state.ti); }
      expect(pk.state.mode).toBe('end'); expect(rejected).toBe(0);
      expect([...tis]).toEqual(data.days.farm.tasks.map((_, i) => i));        // every job, in order, the talk at the gate first
      expect(calls).toHaveLength(data.days.farm.tasks.reduce((k, t) => k + playScene(t.scene), 0)); expect(real).toBeLessThan(600);
    }
  });

  // The visitor taps the countdown button (「好，下一件事（n）」) by hand one second into the reading pause: the button
  // calls park.finishTask() itself, behind auto mode's back.
  const tapDuringReading = (pk, a, go) => {
    let n = 0;
    while (!(a.reading && readSeconds(pk.task.why.text) - a.countdown >= 1) && n++ < 40000) go();
    expect(a.reading).toBe(true);
    return pk.finishTask();
  };

  it('讀解說時自己按下一件事（倒數鈕）：自動模式馬上接著走，下一件事的解說照樣停留整段', () => {
    for (const role of ['vol', 'work', 'farm']) {
      const pk = createPark(data), a = createAuto(pk);
      a.set(true); pk.beginRole(role);
      const go = () => { pk.tick(DT); a.step(DT); };
      expect(tapDuringReading(pk, a, go)).toBe('next');
      go();
      expect.soft(a.reading, role).toBe(false); expect.soft(a.countdown, role).toBe(0); expect.soft(a.target, role).toBeNull();
      // no leftover countdown: once the clock has caught up (fast-forward), auto mode sets off for the next job within afterNext
      let still = 0, n = 0;
      while (!pk.state.guided && !pk.state.scene && n++ < 40000) { if (!pk.state.ff) still += DT; go(); }
      expect.soft(still, role).toBeLessThanOrEqual(AUTO.afterNext + 2 * DT + 1e-9);
      // the next job's explanation is on screen for its whole reading pause before auto mode turns the page
      const ti = pk.state.ti, why = pk.task.why.text;
      while (!pk.state.scene?.done && n++ < 40000) go();
      let shown = 0;
      while (pk.state.ti === ti && pk.state.mode === 'role' && n++ < 40000) { go(); shown += DT; }
      expect(pk.state.ti).toBe(ti + 1);
      expect.soft(shown, role).toBeGreaterThanOrEqual(readSeconds(why) - 1e-9);
      expect(shown, role).toBeLessThan(readSeconds(why) + AUTO.readMax);
    }
  });

  it('最後一件事讀解說時自己按收工：結尾卡的時候自動模式不留著讀秒、倒數或框', () => {
    const pk = createPark(data), a = createAuto(pk);
    a.set(true); pk.beginRole('farm', data.days.farm.tasks.length - 1);
    const go = () => { pk.tick(DT); a.step(DT); };
    expect(tapDuringReading(pk, a, go)).toBe('end');
    go();
    expect(pk.state.mode).toBe('end');
    expect(a.reading).toBe(false); expect(a.countdown).toBe(0); expect(a.target).toBeNull();
  });

  it('時間常數沒變', () => {
    expect(AUTO).toEqual({ afterBegin: 1.2, afterToggle: 0.8, afterWalk: 0.6, sceneOpen: 1.8, highlight: 0.5,
      afterPress: 0.8, idle: 0.3, afterNext: 1.2, readBase: 3, readPerChar: 0.16, readMin: 6, readMax: 18, lineMin: 3 });
    expect(FAST).toEqual({ read: 1.5, move: 2 });
  });
});
