import { expect } from 'vitest';
import { createScene } from '../../js/engine/scenes/index.js';
import { SOURCE_RE, isSourced, eachSourced, eachString } from './sourced.js';

// The icon names the drawing code knows (Task 9).
export const ICONS = ['veg', 'vegBad', 'grass', 'bundle', 'box', 'crate', 'tray', 'trayFull', 'tea', 'bucket', 'bucketEmpty',
  'bowl', 'cell', 'cellSown', 'tagged', 'priced', 'herbbox', 'emptybox', 'coin', 'pot', 'phone', 'sensor'];

// Numbers made up for the game. A job that mentions one must say 示意 somewhere.
export const MADE_UP = /4\.5 小時|500 元|3,000 元|先留 20 元|10 枚盈餘|低於 10|昨天.*4 格|50、.*20、.*22、.*8/;

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const TASK_TEXT = ['placeName', 'title', 'note', 'verb', 'head'];

const partsOf = (scene) => (Array.isArray(scene) ? scene : [scene]);
const nonEmpty = (s) => typeof s === 'string' && s !== '';

// Every value in a part that the scene table marks as Sourced.
function sourcedOf(part) {
  switch (part.type) {
    case 'sort': return part.tips;
    case 'quiz': return part.q.map((q) => q.tip);
    case 'order': return [part.tip];
    case 'tick': return part.items;
    case 'any': return part.opts.map((o) => o.reply);
    case 'jars': return [part.full];
    default: return [];
  }
}

// Every person a part names: its own who, each question's who, done.who, show.who, people, show.people[].id.
function peopleOf(part) {
  const ids = [];
  const fromShow = (show) => {
    if (!show) return;
    if (show.who !== undefined) ids.push(show.who);
    if (show.people) ids.push(...show.people.map((p) => p.id));
  };
  if (part.who !== undefined) ids.push(part.who);
  if (part.type === 'quiz') { part.q.forEach((q) => { if (q.who !== undefined) ids.push(q.who); }); if (part.done.who !== undefined) ids.push(part.done.who); }
  if (part.people) ids.push(...part.people);
  if (part.type === 'steps') { fromShow(part.show); part.steps.forEach((st) => fromShow(st.show)); }
  return ids;
}

// Every icon a part draws.
function iconsOf(part) {
  const out = [];
  const add = (v) => { if (v !== undefined) out.push(v); };
  if (part.type === 'taps') { part.items.forEach((it) => { add(it.icon); add(it.iconDone); }); add(part.meter); }
  if (part.type === 'sort') { part.items.forEach((it) => add(it.icon)); part.cats.forEach((c) => add(c.icon)); }
  if (part.type === 'steps') { [part, ...part.steps].forEach((st) => { if (st.show) add(st.show.icon); add(st.token); }); }
  if (part.type === 'handout') { add(part.give); add(part.back); }
  return out;
}

// Shape checks that the auto() run alone would not catch (a wrong press is never made there).
function checkPart(part, where) {
  const w = (s) => `${where}: ${s}`;
  switch (part.type) {
    case 'taps':
      expect(part.items.length, w('taps items')).toBeGreaterThan(0);
      part.items.forEach((it) => { expect(nonEmpty(it.icon), w('taps icon')).toBe(true); expect(nonEmpty(it.aria), w('taps aria')).toBe(true); });
      expect(nonEmpty(part.count), w('taps count')).toBe(true);
      break;
    case 'sort':
      expect(part.cats.length, w('sort cats')).toBeGreaterThanOrEqual(2);
      expect(part.tips, w('one tip per category')).toHaveLength(part.cats.length);
      part.items.forEach((it) => {
        expect(Number.isInteger(it.cat) && it.cat >= 0 && it.cat < part.cats.length, w('sort cat in range')).toBe(true);
        expect(nonEmpty(it.label) || nonEmpty(it.icon), w('sort card shows something')).toBe(true);
      });
      expect(new Set(part.items.map((it) => it.cat)).size, w('sort items are not all in one category')).toBeGreaterThan(1);
      expect(nonEmpty(part.count), w('sort count')).toBe(true);
      break;
    case 'quiz':
      expect(part.q.length, w('quiz questions')).toBeGreaterThan(0);
      part.q.forEach((q) => { for (const f of ['say', 'good', 'bad']) expect(nonEmpty(q[f]), w(`quiz ${f}`)).toBe(true); expect(q.good).not.toBe(q.bad); });
      expect(nonEmpty(part.done.text), w('quiz done text')).toBe(true);
      expect([undefined, 0, 1], w('quiz flip')).toContain(part.flip);
      if (part.q.length > 1) expect(nonEmpty(part.count), w('quiz count')).toBe(true);
      break;
    case 'order':
      expect([...part.show].sort((a, b) => a - b), w('order show is a permutation')).toEqual(part.steps.map((_, k) => k));
      break;
    case 'tick':
      expect(part.items.length, w('tick items')).toBeGreaterThan(0);
      if (part.who !== undefined) expect(nonEmpty(part.say), w('tick say')).toBe(true);
      break;
    case 'any':
      expect(part.opts.length, w('any options')).toBeGreaterThan(0);
      break;
    case 'steps':
      expect(part.steps.length, w('steps')).toBeGreaterThan(0);
      part.steps.forEach((st) => expect(nonEmpty(st.label), w('step label')).toBe(true));
      break;
    case 'handout':
      expect(['counter', 'faces'], w('handout layout')).toContain(part.layout);
      expect(part.says, w('one line per person')).toHaveLength(part.people.length);
      break;
    case 'ledger':
      expect(part.rows.length, w('ledger rows')).toBeGreaterThan(0);
      part.rows.forEach((r) => {
        for (const f of ['label', 'value', 'color', 'note']) expect(nonEmpty(r[f]), w(`ledger ${f}`)).toBe(true);
        expect(r.width >= 0 && r.width <= 100, w('ledger width is a percentage')).toBe(true);
      });
      expect(nonEmpty(part.source), w('ledger source')).toBe(true);
      for (const s of part.source.split('；')) expect(s, w('ledger source format')).toMatch(SOURCE_RE);
      expect(part.wait >= 0, w('ledger wait')).toBe(true);
      break;
    case 'pick':
      expect(part.need > 0 && part.need <= part.options.length, w('pick need')).toBe(true);
      expect(nonEmpty(part.sep), w('pick sep')).toBe(true);
      break;
    case 'jars':
      expect(part.jars.reduce((n, j) => n + j.cap, 0), w('the jars hold every coin')).toBeGreaterThanOrEqual(part.coins);
      break;
    default:
      throw new Error(w(`unknown scene type ${part.type}`));
  }
}

// Strings a person sees: everything except the source fields.
function visibleStrings(obj) {
  const out = [];
  eachString(obj, (s, path) => { if (!/(^|\.)source$/.test(path)) out.push(s); });
  return out;
}

// Press through the scene the way auto mode does; no press may be refused.
export function playScene(spec) {
  const s = createScene(spec);
  let presses = 0;
  for (let i = 0; i < 1000 && !s.done; i++) {
    const id = s.auto();
    if (id === null) s.advance(0.1);
    else { expect(s.press(id)).toEqual({ ok: true, tip: null }); presses++; }
  }
  expect(s.done).toBe(true);
  return presses;
}

// The shared checks for one role's day (Tasks 5 and 6).
export function checkDay(day, data) {
  const people = new Set(data.people.map((p) => p.id));
  const places = new Set(data.map.labels.map((l) => l.key));
  const id = day.id;

  expect(nonEmpty(id), 'day id').toBe(true);
  expect(people.has(day.who), `${id}: who`).toBe(true);
  expect(nonEmpty(day.name) && nonEmpty(day.desc), `${id}: name and desc`).toBe(true);
  if ('hold' in day) expect(nonEmpty(day.hold), `${id}: hold`).toBe(true);
  expect(day.did.length, `${id}: did`).toBeGreaterThan(0);
  day.did.forEach((t) => expect(nonEmpty(t), `${id}: did line`).toBe(true));
  expect(isSourced(day.line), `${id}: line is sourced`).toBe(true);
  expect(day.tasks.length, `${id}: tasks`).toBeGreaterThan(0);

  // every sourced text in the day: well-formed source; 示意數字 only on a text that says 示意
  let nSourced = 0;
  eachSourced(day, (s, path) => {
    nSourced++;
    expect(isSourced(s), `${id}.${path}: sourced`).toBe(true);
    for (const part of s.source.split('；')) expect(part, `${id}.${path}: source format`).toMatch(SOURCE_RE);
    if (s.source.includes('示意數字')) expect(s.text, `${id}.${path}: 示意數字 needs 示意 in the text`).toContain('示意');
  });
  expect(nSourced, `${id}: sourced texts`).toBeGreaterThanOrEqual(day.tasks.length + 1);

  const sides = [];
  let last = '';
  day.tasks.forEach((t, k) => {
    const where = `${id} task ${k + 1}`;
    expect(t.at, `${where}: at`).toMatch(HHMM);
    expect(t.hold, `${where}: hold`).toMatch(HHMM);
    expect(t.at < t.hold, `${where}: at before hold`).toBe(true);
    expect(t.at > last, `${where}: later than the one before`).toBe(true);
    last = t.at;
    expect(places.has(t.place), `${where}: place`).toBe(true);
    expect(t.spot, `${where}: spot`).toHaveLength(2);
    t.spot.forEach((v) => { expect(Number.isFinite(v), `${where}: spot`).toBe(true); expect(Math.round(v * 10) / 10).toBe(v); });
    for (const f of TASK_TEXT) expect(nonEmpty(t[f]), `${where}: ${f}`).toBe(true);
    if ('how' in t) expect(nonEmpty(t.how), `${where}: how`).toBe(true);
    if ('wait' in t) expect(nonEmpty(t.wait), `${where}: wait`).toBe(true);
    expect('carry' in t && (t.carry === null || nonEmpty(t.carry)), `${where}: carry`).toBe(true);
    expect(isSourced(t.why), `${where}: why is sourced`).toBe(true);

    const parts = partsOf(t.scene);
    expect(parts.length, `${where}: scene`).toBeGreaterThan(0);
    parts.forEach((part, p) => {
      const at = `${where} part ${p + 1} (${part.type})`;
      checkPart(part, at);
      sourcedOf(part).forEach((s) => expect(isSourced(s), `${at}: sourced field`).toBe(true));
      peopleOf(part).forEach((who) => expect(people.has(who), `${at}: person ${who}`).toBe(true));
      iconsOf(part).forEach((ic) => expect(ICONS, `${at}: icon`).toContain(ic));
      if (part.type === 'quiz') part.q.forEach((_, i) => sides.push((i + (part.flip ?? 0)) % 2 === 1 ? 'first' : 'second'));
    });
    expect(playScene(t.scene), `${where}: presses`).toBeGreaterThanOrEqual(0);

    // a made-up number (or a chart whose numbers are made up) must be marked 示意 somewhere in the job
    const strings = visibleStrings(t);
    const madeUp = strings.some((s) => MADE_UP.test(s)) || parts.some((part) => part.type === 'ledger' && part.source.includes('示意數字'));
    if (madeUp) expect(strings.join('\n'), `${where}: made-up number without 示意`).toContain('示意');
  });

  // the better answer is not always on the same side
  if (sides.length) {
    expect(new Set(sides).size, `${id}: good answers appear on both sides`).toBe(2);
    for (let i = 2; i < sides.length; i++) expect(sides[i] === sides[i - 1] && sides[i] === sides[i - 2], `${id}: three good answers in a row on one side`).toBe(false);
  }

  eachString(day, (s, path) => expect(s, `${id}.${path}`).not.toContain('時間銀行'));
}
