import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { createScene } from '../js/engine/scenes/index.js';

const src = (text) => ({ text, source: 'test' });
const json = (s) => JSON.stringify(s.view());

const taps = { type: 'taps', count: 'n%n of %t', items: [{ icon: 'a', iconDone: 'a2', aria: 'x' }, { icon: 'b', iconDone: 'b2', aria: 'y' }, { icon: 'c', aria: 'z' }] };
const sort = {
  type: 'sort', who: 'p1', count: '%i/%t', doneStatus: 'L%0 R%1', done: 'all sorted',
  cats: [{ label: 'left' }, { label: 'right', icon: 'r' }], tips: [src('tip-left'), src('tip-right')], counters: true,
  items: [{ label: 'a', cat: 1 }, { label: 'b', cat: 0 }, { icon: 'c', cat: 1 }],
};
const quiz2 = {
  type: 'quiz', who: 'p2', count: '%i of %t', done: { text: 'finished' },
  q: [{ say: 'q1', mood: 'focus', good: 'g1', bad: 'b1', tip: src('t1') }, { say: 'q2', who: 'p3', good: 'g2', bad: 'b2', tip: src('t2') }],
};
const order = { type: 'order', count: '%n of %t', steps: ['one', 'two', 'three'], show: [2, 0, 1], tip: src('wrong order') };
const tick = { type: 'tick', who: 'p4', say: 'hello', board: true, count: '%n/%t', items: [src('l1'), src('l2')] };
const any = { type: 'any', who: 'p5', say: 'pick', opts: [{ label: 'A', reply: src('ra') }, { label: 'B', reply: src('rb') }] };
const steps = {
  type: 'steps', show: { icon: 'start' },
  steps: [
    { label: 'lay', status: 'laid', show: { note: 'laid out' } },
    { label: 'run', wait: { seconds: 1, status: 'running' }, status: 'dry', show: { icon: 'dry' } },
    { label: 'pack', times: 3, token: 'bag', count: '%n of %t bags', show: { who: 'p1', text: 'hi' } },
  ],
};
const handoutCounter = { type: 'handout', layout: 'counter', people: ['a', 'b'], says: ['s0', 's1'], give: 'box', back: 'empty', count: '%n/%t' };
const handoutFaces = { type: 'handout', layout: 'faces', people: ['a', 'b', 'c'], says: ['s0', 's1', 's2'], count: '%n/%t' };
const ledgerAuto = { type: 'ledger', title: 'T', rows: [{ label: 'r', value: '50', width: 50, color: 'x', note: 'n' }], split: { title: 's', chips: [{ label: 'c', note: 'n' }] }, status: 'st', wait: 1.5, source: 'src' };
const ledgerBtn = { ...ledgerAuto, button: 'show', before: '0', statusAfter: 'after' };
const pick = { type: 'pick', options: ['w', 'x', 'y', 'z'], need: 3, empty: 'none', sep: '、', chosen: 'has %s', count: '%n of %t', button: 'brew', result: 'made %s' };
const jars = { type: 'jars', coins: 10, jars: [{ label: 'A', cap: 5, note: 'a' }, { label: 'B', cap: 4, note: 'b' }, { label: 'C', cap: 1, note: 'c' }], full: src('%s is full at %n'), count: '%n of %t' };

const SAMPLES = [
  ['taps', taps], ['sort', sort], ['quiz', quiz2], ['quiz-flip1', { ...quiz2, flip: 1 }], ['order', order], ['tick', tick], ['any', any],
  ['steps', steps], ['handout-counter', handoutCounter], ['handout-faces', handoutFaces], ['ledger-auto', ledgerAuto],
  ['ledger-button', ledgerBtn], ['ledger-nowait', { ...ledgerAuto, wait: 0 }], ['pick', pick], ['jars', jars],
  ['multi', [taps, any, { ...steps }]],
];

describe.each(SAMPLES)('%s', (type, spec) => {
  it('照 auto() 一路按，會做完，而且沒有一次被擋', () => {
    const s = createScene(spec);
    for (let i = 0; i < 200 && !s.done; i++) {
      const id = s.auto();
      if (id === null) s.advance(0.1); else expect(s.press(id)).toEqual({ ok: true, tip: null });
    }
    expect(s.done).toBe(true); expect(s.auto()).toBe(null); expect(s.controls()).toEqual([]);
  });
  it('view 一定有 type、status、tip、part；auto() 的 id 一定在 controls() 裡', () => {
    const s = createScene(spec);
    for (let i = 0; i < 200 && !s.done; i++) {
      const v = s.view();
      expect(typeof v.type).toBe('string'); expect(typeof v.status).toBe('string'); expect(v.tip === null || typeof v.tip === 'string').toBe(true);
      expect(typeof v.part).toBe('number'); expect(typeof v.hideHow).toBe('boolean');
      const id = s.auto();
      if (id === null) s.advance(0.1); else { expect(s.controls()).toContain(id); s.press(id); }
    }
  });
  it('按不存在的 id、或做完以後再按：ok 是 false，畫面不變', () => {
    const s = createScene(spec), seen = new Set(['nope']);
    const first = json(s);
    expect(s.press('nope')).toEqual({ ok: false, tip: null }); expect(json(s)).toBe(first);
    for (let i = 0; i < 200 && !s.done; i++) {
      s.controls().forEach((c) => seen.add(c));
      const id = s.auto();
      if (id === null) s.advance(0.1); else s.press(id);
    }
    expect(s.done).toBe(true);
    const after = json(s);
    seen.forEach((id) => { expect(s.press(id)).toEqual({ ok: false, tip: null }); });
    expect(json(s)).toBe(after);
  });
  it('同一顆連按兩次，只算一次', () => {
    const s = createScene(spec), id = s.auto();
    // a scene that begins with a wait (nothing to press yet) has nothing to double-press
    if (id === null) return;
    expect(s.press(id).ok).toBe(true);
    const afterFirst = json(s), stillOpen = s.controls().includes(id);
    const second = s.press(id);
    if (!stillOpen) { expect(second).toEqual({ ok: false, tip: null }); expect(json(s)).toBe(afterFirst); }
  });
});

describe('taps', () => {
  it('按過的換成 iconDone（沒給就維持原圖），count 換成已按數與總數，id 是 i0…', () => {
    const s = createScene(taps);
    expect(s.controls()).toEqual(['i0', 'i1', 'i2']);
    s.press('i1'); s.press('i2');
    const v = s.view();
    expect(v.items).toEqual([{ id: 'i0', icon: 'a', aria: 'x', pressed: false }, { id: 'i1', icon: 'b2', aria: 'y', pressed: true }, { id: 'i2', icon: 'c', aria: 'z', pressed: true }]);
    expect(v.status).toBe('n2 of 3'); expect(v.gone).toBe(false); expect(v.meter).toBe(null);
    expect(s.auto()).toBe('i0'); expect(s.done).toBe(false);
  });
  it('gone 與 meter "pot"：level 跟著按的數量走', () => {
    const s = createScene({ ...taps, gone: true, meter: 'pot' });
    expect(s.view().gone).toBe(true); expect(s.view().meter).toEqual({ icon: 'pot', level: 0 });
    s.press('i0'); s.press('i1'); expect(s.view().meter).toEqual({ icon: 'pot', level: 2 });
  });
});

describe('sort', () => {
  it('分錯出現「正確類別」的提示，不前進', () => {
    const s = createScene(sort);
    expect(s.view().card).toEqual({ label: 'a' });
    expect(s.press('c0')).toEqual({ ok: false, tip: 'tip-right' });
    expect(s.view().card.label).toBe('a'); expect(s.view().tip).toBe('tip-right'); expect(s.view().status).toBe('1/3');
    expect(s.view().cats.map((c) => c.n)).toEqual([0, 0]);
  });
  it('分對會清掉提示、數量加一；全部分完以後 card 是 null、status 用 doneStatus', () => {
    const s = createScene(sort);
    s.press('c0'); expect(s.view().tip).toBe('tip-right');
    expect(s.press('c1')).toEqual({ ok: true, tip: null }); expect(s.view().tip).toBe(null);
    expect(s.view().card).toEqual({ label: 'b' }); expect(s.view().status).toBe('2/3');
    s.press('c0'); expect(s.view().card).toEqual({ icon: 'c' });
    s.press('c1');
    const v = s.view();
    expect(s.done).toBe(true); expect(v.finished).toBe(true); expect(v.card).toBe(null); expect(v.status).toBe('L1 R2');
    expect(v.doneText).toBe('all sorted'); expect(v.who).toBe('p1'); expect(v.counters).toBe(true);
    expect(v.cats).toEqual([{ id: 'c0', label: 'left', n: 1 }, { id: 'c1', label: 'right', icon: 'r', n: 2 }]);
  });
  it('沒給 doneStatus 時，做完的 status 是空字串；auto 是正確的類別', () => {
    const s = createScene({ ...sort, doneStatus: undefined, who: undefined });
    expect(s.auto()).toBe('c1'); s.press('c1'); expect(s.auto()).toBe('c0');
    s.press('c0'); s.press('c1');
    expect(s.view().status).toBe(''); expect(s.view().who).toBe(null);
  });
  it('沒給 done 時，doneText 是 null（不是 undefined），JSON 裡也看得到', () => {
    const s = createScene({ ...sort, done: undefined });
    expect(s.view().doneText).toBe(null);
    s.press('c1'); s.press('c0'); s.press('c1');
    expect(s.done).toBe(true); expect(s.view().doneText).toBe(null);
    expect(JSON.parse(json(s))).toHaveProperty('doneText', null);
  });
});

describe('quiz', () => {
  it('flip 0 時第一題 bad 在前、第二題 good 在前；flip 1 相反', () => {
    const a = createScene(quiz2);
    expect(a.view().options.map((o) => o.id)).toEqual(['bad', 'good']);
    a.press('good'); expect(a.view().options.map((o) => o.id)).toEqual(['good', 'bad']);
    const b = createScene({ ...quiz2, flip: 1 });
    expect(b.view().options.map((o) => o.id)).toEqual(['good', 'bad']);
    b.press('good'); expect(b.view().options.map((o) => o.id)).toEqual(['bad', 'good']);
  });
  it('選 bad 出現這一題的 tip，題目不變；答對才清掉', () => {
    const s = createScene(quiz2);
    expect(s.press('bad')).toEqual({ ok: false, tip: 't1' });
    expect(s.view().tip).toBe('t1'); expect(s.view().say).toBe('q1'); expect(s.view().status).toBe('1 of 2');
    expect(s.done).toBe(false);
    expect(s.press('good')).toEqual({ ok: true, tip: null });
    expect(s.view().tip).toBe(null); expect(s.view().say).toBe('q2');
  });
  it('who 與 mood：題目自己的優先；答完換 done 的說法、mood 是 happy、options 空', () => {
    const s = createScene(quiz2);
    expect(s.view().who).toBe('p2'); expect(s.view().mood).toBe('focus');
    expect(s.view().options).toEqual([{ id: 'bad', label: 'b1' }, { id: 'good', label: 'g1' }]);
    s.press('good'); expect(s.view().who).toBe('p3'); expect(s.view().mood).toBe('smile');
    s.press('good');
    const v = s.view();
    expect(s.done).toBe(true); expect(v.say).toBe('finished'); expect(v.mood).toBe('happy'); expect(v.options).toEqual([]); expect(v.who).toBe('p2');
    const w = createScene({ ...quiz2, done: { who: 'p9', text: 'x' } }); w.press('good'); w.press('good');
    expect(w.view().who).toBe('p9');
  });
  it('沒有 count 時 status 是空字串；沒有 who 時是 null', () => {
    const s = createScene({ type: 'quiz', q: [{ say: 'q', good: 'g', bad: 'b', tip: src('t') }], done: { text: 'd' } });
    expect(s.view().status).toBe(''); expect(s.view().who).toBe(null); expect(s.auto()).toBe('good');
  });
});

describe('order', () => {
  it('照順序才收，按錯出現 tip；options 照 show 排、只列還沒排的', () => {
    const s = createScene(order);
    expect(s.view().options).toEqual([{ id: 's2', label: 'three' }, { id: 's0', label: 'one' }, { id: 's1', label: 'two' }]);
    expect(s.auto()).toBe('s0');
    expect(s.press('s2')).toEqual({ ok: false, tip: 'wrong order' });
    expect(s.view().tip).toBe('wrong order'); expect(s.view().placed).toEqual([]); expect(s.view().status).toBe('0 of 3');
    expect(s.press('s0')).toEqual({ ok: true, tip: null });
    expect(s.view().tip).toBe(null); expect(s.view().placed).toEqual(['one']);
    expect(s.view().options.map((o) => o.id)).toEqual(['s2', 's1']); expect(s.controls()).toEqual(['s2', 's1']);
    expect(s.press('s0')).toEqual({ ok: false, tip: null });
    s.press('s1'); s.press('s2');
    expect(s.done).toBe(true); expect(s.view().placed).toEqual(['one', 'two', 'three']); expect(s.view().options).toEqual([]);
  });
});

describe('tick', () => {
  it('每一行點一下就亮，auto 是最上面還沒點的，沒有錯的', () => {
    const s = createScene(tick);
    expect(s.view().who).toBe('p4'); expect(s.view().say).toBe('hello'); expect(s.view().board).toBe(true);
    s.press('i1');
    expect(s.view().items).toEqual([{ id: 'i0', label: 'l1', on: false }, { id: 'i1', label: 'l2', on: true }]);
    expect(s.view().status).toBe('1/2'); expect(s.auto()).toBe('i0');
    s.press('i0'); expect(s.done).toBe(true);
  });
  it('沒給 who、say、board 時是 null、null、false', () => {
    const v = createScene({ type: 'tick', count: '', items: [src('x')] }).view();
    expect(v.who).toBe(null); expect(v.say).toBe(null); expect(v.board).toBe(false);
  });
});

describe('any', () => {
  it('選了以後 options 空、say 換成回覆、mood 是 happy；先前是 smile', () => {
    const s = createScene(any);
    expect(s.view().mood).toBe('smile'); expect(s.view().say).toBe('pick'); expect(s.controls()).toEqual(['o0', 'o1']); expect(s.auto()).toBe('o0');
    expect(s.view().options).toEqual([{ id: 'o0', label: 'A' }, { id: 'o1', label: 'B' }]);
    expect(s.press('o1')).toEqual({ ok: true, tip: null });
    const v = s.view();
    expect(v.options).toEqual([]); expect(v.say).toBe('rb'); expect(v.mood).toBe('happy'); expect(v.who).toBe('p5'); expect(s.done).toBe(true);
    expect(s.press('o0')).toEqual({ ok: false, tip: null }); expect(s.view().say).toBe('rb');
  });
});

describe('steps', () => {
  it('等待靠 advance 走，不靠真實時間', () => {
    const s = createScene({ type: 'steps', steps: [{ label: 'a', wait: { seconds: 2.6, status: 'w' }, status: 'ok' }] });
    s.press('step'); expect(s.auto()).toBe(null); expect(s.done).toBe(false);
    s.advance(2.5); expect(s.done).toBe(false); expect(s.view().progress).toBeCloseTo(2.5 / 2.6, 2);
    s.advance(0.2); expect(s.done).toBe(true); expect(s.view().status).toBe('ok');
  });
  it('等待期間按鈕是 disabled、status 是等待的說法、不能再按', () => {
    const s = createScene(steps);
    s.press('step');
    expect(s.view().button).toEqual({ id: 'step', label: 'run', disabled: false });
    s.press('step');
    const v = s.view();
    expect(v.button).toEqual({ id: 'step', label: 'run', disabled: true }); expect(v.status).toBe('running'); expect(v.progress).toBe(0);
    expect(s.controls()).toEqual([]);
    const before = json(s);
    expect(s.press('step')).toEqual({ ok: false, tip: null }); expect(json(s)).toBe(before);
    s.advance(1);
    expect(s.view().status).toBe('dry'); expect(s.view().progress).toBe(1); expect(s.view().button).toEqual({ id: 'step', label: 'pack', disabled: false });
    expect(s.controls()).toEqual(['step']);
  });
  it('每一步的 show 在做完以後換上；沒有 show 的沿用上一個', () => {
    const s = createScene({ type: 'steps', show: { icon: 'first' }, steps: [{ label: 'a', show: { note: 'n' } }, { label: 'b' }] });
    expect(s.view().show).toEqual({ icon: 'first' });
    s.press('step'); expect(s.view().show).toEqual({ note: 'n' });
    s.press('step'); expect(s.view().show).toEqual({ note: 'n' }); expect(s.done).toBe(true); expect(s.view().button).toBe(null);
    expect(createScene({ type: 'steps', steps: [{ label: 'a' }] }).view().show).toBe(null);
  });
  it('場景層級的 status 在第一步產生自己的 status 前顯示', () => {
    const s = createScene({ type: 'steps', status: 'carried', steps: [{ label: 'a', status: 'mine' }, { label: 'b' }] });
    expect(s.view().status).toBe('carried');
    s.press('step'); expect(s.view().status).toBe('mine');
    expect(createScene({ type: 'steps', steps: [{ label: 'a' }] }).view().status).toBe('');
  });
  it('第一步按了就換 status 與 show，換到下一步的按鈕文字', () => {
    const s = createScene(steps);
    expect(s.view().status).toBe(''); expect(s.view().tokens).toBe(null); expect(s.view().progress).toBe(null);
    s.press('step');
    expect(s.view().status).toBe('laid'); expect(s.view().show).toEqual({ note: 'laid out' }); expect(s.view().button.label).toBe('run');
  });
  it('times 3 要按三次，tokens.n 從 0 到 3，count 跟著換，第三次才做完', () => {
    const s = createScene(steps);
    s.press('step'); s.press('step'); s.advance(1);
    expect(s.view().tokens).toEqual({ icon: 'bag', n: 0 }); expect(s.view().status).toBe('dry');
    expect(s.press('step').ok).toBe(true); expect(s.view().tokens.n).toBe(1); expect(s.view().status).toBe('1 of 3 bags'); expect(s.done).toBe(false);
    expect(s.view().show).toEqual({ icon: 'dry' });
    s.press('step'); expect(s.view().tokens.n).toBe(2); expect(s.done).toBe(false);
    s.press('step'); expect(s.view().tokens.n).toBe(3); expect(s.done).toBe(true); expect(s.view().status).toBe('3 of 3 bags');
    expect(s.view().show).toEqual({ who: 'p1', text: 'hi' });
    expect(s.press('step')).toEqual({ ok: false, tip: null });
  });
  it('最後一步帶等待時，要等完等待才算做完', () => {
    const s = createScene({ type: 'steps', steps: [{ label: 'a', wait: { seconds: 1, status: 'w' } }] });
    s.press('step'); s.advance(0.5); expect(s.done).toBe(false); s.advance(0.5); expect(s.done).toBe(true);
  });
});

describe('handout', () => {
  it('counter：依序交，不管按哪一個，bubble 是 says 裡對應的那一句', () => {
    const s = createScene(handoutCounter);
    expect(s.view()).toMatchObject({ layout: 'counter', give: 'box', back: 'empty', returned: 0, bubble: null, status: '0/2' });
    expect(s.view().people).toEqual([{ id: 'a', served: false }, { id: 'b', served: false }]);
    expect(s.auto()).toBe('i0');
    s.press('i1');
    expect(s.view().bubble).toBe('s0'); expect(s.view().people).toEqual([{ id: 'a', served: true }, { id: 'b', served: false }]);
    expect(s.view().items).toEqual([{ id: 'i0', pressed: false, aria: null }, { id: 'i1', pressed: true, aria: null }]); expect(s.view().returned).toBe(1);
    s.press('i0'); expect(s.view().bubble).toBe('s1'); expect(s.done).toBe(true); expect(s.view().returned).toBe(2);
  });
  it('faces：按第 i 個就交給第 i 個人，bubble 是 says[i]；沒有 back 時 returned 是 0', () => {
    const s = createScene(handoutFaces);
    s.press('i2');
    expect(s.view().bubble).toBe('s2'); expect(s.view().people.map((p) => p.served)).toEqual([false, false, true]);
    expect(s.view().returned).toBe(0); expect(s.view().give).toBe(null); expect(s.view().back).toBe(null);
    expect(s.auto()).toBe('i0');
  });
  it('aria：每個按鈕帶設定裡對應的說明，按過也不變；沒給時是 null', () => {
    const s = createScene({ ...handoutFaces, aria: ['give a', 'give b', 'give c'] });
    expect(s.view().items.map((it) => it.aria)).toEqual(['give a', 'give b', 'give c']);
    s.press('i1');
    expect(s.view().items[1]).toEqual({ id: 'i1', pressed: true, aria: 'give b' });
    expect(createScene(handoutFaces).view().items.map((it) => it.aria)).toEqual([null, null, null]);
  });
});

describe('ledger', () => {
  it('沒有按鈕時自己開始跑，wait 秒後做完；有按鈕時按了才跑', () => {
    const a = createScene(ledgerAuto);
    expect(a.view()).toMatchObject({ revealed: true, progress: 0, button: null, status: 'st', title: 'T', valueShown: '50' });
    expect(a.controls()).toEqual([]); expect(a.auto()).toBe(null);
    a.advance(0.75); expect(a.view().progress).toBeCloseTo(0.5, 5); expect(a.done).toBe(false);
    a.advance(0.75); expect(a.done).toBe(true); expect(a.view().progress).toBe(1);
    expect(a.view().rows).toEqual(ledgerAuto.rows); expect(a.view().split).toEqual(ledgerAuto.split);

    const b = createScene(ledgerBtn);
    expect(b.view()).toMatchObject({ revealed: false, progress: 0, button: { id: 'go', label: 'show' }, status: 'st', valueShown: '0' });
    b.advance(10); expect(b.done).toBe(false); expect(b.view().progress).toBe(0);
    expect(b.controls()).toEqual(['go']); expect(b.auto()).toBe('go');
    expect(b.press('go')).toEqual({ ok: true, tip: null });
    expect(b.view()).toMatchObject({ revealed: true, status: 'after', button: null, valueShown: '50' });
    expect(b.controls()).toEqual([]); expect(b.auto()).toBe(null);
    b.advance(1.5); expect(b.done).toBe(true);
  });
  it('wait 為 0：顯示出來就做完，progress 是 1；沒給 before 時 valueShown 一開始就是第一列的值', () => {
    const a = createScene({ ...ledgerAuto, wait: 0 });
    expect(a.done).toBe(true); expect(a.view().progress).toBe(1);
    const b = createScene({ ...ledgerBtn, wait: 0, before: undefined });
    expect(b.done).toBe(false); expect(b.view().valueShown).toBe('50'); b.press('go'); expect(b.done).toBe(true); expect(b.view().progress).toBe(1);
  });
  it('沒給 statusAfter 時，按了以後 status 不變', () => {
    const s = createScene({ ...ledgerBtn, statusAfter: undefined }); s.press('go'); expect(s.view().status).toBe('st');
  });
});

describe('pick', () => {
  it('選滿以後只剩 go；result 帶出選的三樣', () => {
    const s = createScene(pick);
    expect(s.view()).toMatchObject({ text: 'none', status: '0 of 3', button: { id: 'go', label: 'brew', disabled: true } });
    expect(s.controls()).toEqual(['o0', 'o1', 'o2', 'o3']); expect(s.auto()).toBe('o0');
    s.press('o2'); s.press('o0');
    expect(s.view().text).toBe('has y、w'); expect(s.view().status).toBe('2 of 3'); expect(s.press('o0')).toEqual({ ok: false, tip: null });
    expect(s.press('go')).toEqual({ ok: false, tip: null });
    s.press('o3');
    expect(s.controls()).toEqual(['go']); expect(s.view().button.disabled).toBe(false); expect(s.view().text).toBe('has y、w、z');
    expect(s.view().options.map((o) => o.chosen)).toEqual([true, false, true, true]);
    expect(s.press('o1')).toEqual({ ok: false, tip: null }); expect(s.done).toBe(false); expect(s.auto()).toBe('go');
    expect(s.press('go')).toEqual({ ok: true, tip: null });
    expect(s.done).toBe(true); expect(s.view().text).toBe('made y、w、z'); expect(s.view().button).toBe(null);
  });
  it('沒給 sep 時用 ", " 接；給了就用給的', () => {
    const a = createScene({ ...pick, sep: undefined }); a.press('o0'); a.press('o1');
    expect(a.view().text).toBe('has w, x');
    const b = createScene({ ...pick, sep: ' + ' }); b.press('o0'); b.press('o1');
    expect(b.view().text).toBe('has w + x');
  });
  it('auto 依序選前 need 個，再按 go', () => {
    const s = createScene(pick), got = [];
    for (let i = 0; i < 6 && !s.done; i++) { const id = s.auto(); got.push(id); s.press(id); }
    expect(got).toEqual(['o0', 'o1', 'o2', 'go']);
  });
});

describe('jars', () => {
  it('滿了的罐子擋下來並給提示，第 10 枚放完才做完', () => {
    const s = createScene(jars);
    for (let i = 0; i < 5; i++) expect(s.press('j0')).toEqual({ ok: true, tip: null });
    const r = s.press('j0');
    expect(r.ok).toBe(false); expect(r.tip).toBe('A is full at 5'); expect(r.tip).toContain('A'); expect(r.tip).toContain('5');
    expect(s.view().tip).toBe(r.tip); expect(s.view().left).toBe(5); expect(s.view().jars[0].got).toBe(5);
    expect(s.auto()).toBe('j1');
    expect(s.press('j1').ok).toBe(true); expect(s.view().tip).toBe(null);
    for (let i = 0; i < 3; i++) s.press('j1');
    expect(s.done).toBe(false); expect(s.view().left).toBe(1); expect(s.auto()).toBe('j2');
    s.press('j2');
    expect(s.done).toBe(true); expect(s.view().left).toBe(0); expect(s.view().coins).toBe(10);
    expect(s.view().jars).toEqual([{ id: 'j0', label: 'A', note: 'a', got: 5 }, { id: 'j1', label: 'B', note: 'b', got: 4 }, { id: 'j2', label: 'C', note: 'c', got: 1 }]);
  });
  it('count 可用 %l 顯示剩下幾枚：10、9、……', () => {
    const s = createScene({ ...jars, count: '還有 %l 枚' });
    expect(s.view().status).toBe('還有 10 枚');
    s.press('j0'); expect(s.view().status).toBe('還有 9 枚');
    s.press('j0'); expect(s.view().status).toBe('還有 8 枚');
    s.press('j2'); expect(s.view().status).toBe('還有 7 枚');
  });
  it('status 用 count：已放數與總數', () => {
    const s = createScene(jars); s.press('j0'); s.press('j2'); expect(s.view().status).toBe('2 of 10');
  });
  it('unit：罐子按鈕上數量後面的字，原樣給畫面；沒給時是 null', () => {
    const s = createScene({ ...jars, unit: 'coins' });
    expect(s.view().unit).toBe('coins'); s.press('j0'); expect(s.view().unit).toBe('coins');
    expect(createScene(jars).view().unit).toBe(null);
  });
});

describe('多段', () => {
  it('第一段做完換第二段，最後一段做完才 done', () => {
    const s = createScene([taps, any]);
    expect(s.view().type).toBe('taps'); expect(s.view().part).toBe(0);
    s.press('i0'); s.press('i1'); expect(s.view().part).toBe(0); expect(s.done).toBe(false);
    s.press('i2');
    expect(s.done).toBe(false); expect(s.view().type).toBe('any'); expect(s.view().part).toBe(1); expect(s.controls()).toEqual(['o0', 'o1']);
    expect(s.press('i0')).toEqual({ ok: false, tip: null });
    s.press('o0');
    expect(s.done).toBe(true); expect(s.view().type).toBe('any'); expect(s.view().part).toBe(1); expect(s.view().say).toBe('ra');
    expect(s.controls()).toEqual([]); expect(s.auto()).toBe(null);
  });
  it('advance 只推目前這一段；一建立就做完的段會被跳過', () => {
    const s = createScene([{ ...ledgerAuto, wait: 0 }, { ...steps }]);
    expect(s.view().type).toBe('steps'); expect(s.view().part).toBe(1);
    const t = createScene([{ ...taps, items: [taps.items[0]] }, ledgerAuto]);
    t.press('i0'); expect(t.view().type).toBe('ledger'); expect(t.done).toBe(false);
    t.advance(1.5); expect(t.done).toBe(true);
  });
  it('單段與只有一段的陣列行為相同', () => {
    expect(json(createScene([any]))).toBe(json(createScene(any)));
  });
  it('hideHow：目前這一段的設定說要藏，才是 true；換段時跟著換', () => {
    const s = createScene([{ ...taps, items: [taps.items[0]] }, { ...ledgerAuto, hideHow: true }]);
    expect(s.view().hideHow).toBe(false);
    s.press('i0'); expect(s.view().part).toBe(1); expect(s.view().hideHow).toBe(true);
    s.advance(1.5); expect(s.done).toBe(true); expect(s.view().hideHow).toBe(true);
    const back = createScene([{ ...any, hideHow: true }, taps]);
    expect(back.view().hideHow).toBe(true); back.press('o0'); expect(back.view().hideHow).toBe(false);
  });
  it('hideHow：單段也有；不是 true 的值一律當 false', () => {
    expect(createScene(any).view().hideHow).toBe(false);
    expect(createScene({ ...any, hideHow: true }).view().hideHow).toBe(true);
    expect(createScene({ ...any, hideHow: 'yes' }).view().hideHow).toBe(false);
  });
});

describe('index', () => {
  it('未知的 type 丟出錯誤，訊息帶上 type；空陣列也丟錯', () => {
    expect(() => createScene({ type: 'bogus' })).toThrow(/bogus/);
    expect(() => createScene([taps, { type: 'nope2' }])).toThrow(/nope2/);
    expect(() => createScene([])).toThrow();
  });
  it('engine 不用 document、window、計時器與真實時間；程式字串裡不出現中文與中文標點', () => {
    const base = new URL('../js/engine/', import.meta.url);
    const files = [];
    const walk = (dir) => readdirSync(dir, { withFileTypes: true }).forEach((e) => { const u = new URL(e.name + (e.isDirectory() ? '/' : ''), dir); if (e.isDirectory()) walk(u); else if (e.name.endsWith('.js')) files.push(u); });
    walk(base);
    expect(files.length).toBeGreaterThan(10);
    const banned = /\b(document|window|setTimeout|setInterval|requestAnimationFrame)\b|Date\.now|performance\.now/;
    files.forEach((u) => {
      const text = readFileSync(u, 'utf8');
      expect(text, u.pathname).not.toMatch(banned);
      const code = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
      expect(code, u.pathname).not.toMatch(/[　-〿一-鿿＀-￯]/);
    });
  });
});
