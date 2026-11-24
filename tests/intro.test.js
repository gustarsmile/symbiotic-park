// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { userInfo } from 'node:os';
import { readData } from './helpers/data.js';
import { SOURCE_RE, eachSourced, eachString } from './helpers/sourced.js';
import { mountPage } from './helpers/page.js';
import { installFakeCanvas } from './helpers/canvas.js';
import { pageRunner, memoryStorage, saved } from './helpers/boot.js';
import { createIntro } from '../js/ui/introView.js';
import { emptyRecord } from '../js/engine/store.js';

const d = readData();
const $ = (id) => document.getElementById(id);
const pages = () => [...document.querySelectorAll('#in-pages > section')];

// Every object in the welcome that carries a source: the paragraphs ({ text, source }), and the rows of the comparison
// and of the three circles, whose source covers the whole row (the steps as well as the sentence under them).
function sourcedNodes(obj) {
  const out = [];
  const walk = (v) => {
    if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') { if ('source' in v) out.push(v); Object.values(v).forEach(walk); }
  };
  walk(obj);
  return out;
}

describe('歡迎框的資料', () => {
  it('三頁的每一段都有合格的來源；全文沒有時間銀行', () => {
    let n = 0;
    eachSourced(d.intro, (s) => { n++; for (const p of s.source.split('；')) expect(p).toMatch(SOURCE_RE); });
    eachString(d.intro, (s) => expect(s).not.toContain('時間銀行'));
    // two leads, two rows of the comparison, the tip, the two circles with a sentence, three ways to look around, the fine print
    expect(n).toBe(11);
  });

  it('第一頁說了人和招牌都可以點；第三頁說了這是運轉起來以後的樣子、名字與對話是例子、1.5 倍速', () => {
    const all = []; eachString(d.intro, (s) => all.push(s)); const t = all.join('\n');
    expect(t).toContain('人和地點招牌都可以點'); expect(t).toContain('畫的是運轉起來以後的樣子'); expect(t).toContain('人物的名字與對話是例子'); expect(t).toContain('1.5 倍速'); expect(t).not.toContain('2 倍速');
  });

  it('對照的兩行、三個圓圈（包括只有一串步驟的「物」）也都帶來源；來源不帶人名與路徑', () => {
    const [p1, p2] = d.intro.pages;
    for (const row of [...p1.flow, ...p2.loops]) {
      expect(typeof row.source).toBe('string');
      for (const p of row.source.split('；')) expect(p).toMatch(SOURCE_RE);
    }
    const all = sourcedNodes(d.intro);
    expect(all).toHaveLength(12);
    const me = userInfo().username.toLowerCase();
    for (const s of all) {
      expect(s.source).not.toMatch(/[\\/:]|Users/i);
      expect(s.source).not.toContain('待確認');
      if (me.length >= 3) expect(s.source.toLowerCase()).not.toContain(me);
    }
  });

  it('三頁的頁名、大頭與五個身分照試作；按鈕的字都在資料裡', () => {
    const [p1, p2, p3] = d.intro.pages;
    expect(d.intro.pages.map((p) => p.name)).toEqual(['歡迎', '怎麼運作', '怎麼逛']);
    expect(p1.hello).toEqual(['ahe', 'amei', 'kid1', 'laolin', 'chunzhi']);
    expect(p1.flow.map((r) => r.steps)).toEqual([['募款', '花掉', '再募款'], ['生產', '賣出', '再投入下一輪']]);
    expect(p1.flow.map((r) => r.shape)).toEqual(['line', 'circle']);
    expect(p2.loops.map((l) => l.mark)).toEqual(['錢', '物', '人']);
    expect(p2.loops.map((l) => l.color)).toEqual(['sun', 'soil', 'leaf']);
    expect(p2.loops[1].steps).toEqual(['土地', '作物', '加工坊', '餐桌', '廚餘', '堆肥', '回到土地']);
    expect(p2.loops[2].faces).toEqual([
      { who: 'agong', name: '客人' }, { who: 'acheng', name: '學員' }, { who: 'ahe', name: '夥伴' }, { who: 'fam1', name: '社員' }, { who: 'laolin', name: '導師' },
    ]);
    const ids = new Set(d.people.map((p) => p.id));
    for (const id of [...p1.hello, ...p2.loops[2].faces.map((f) => f.who)]) expect(ids.has(id)).toBe(true);
    expect(p3.ways.map((w) => w.title)).toEqual(['看園區自己運轉', '接手一個角色的一天', '不打分數、不排名']);
    expect(d.intro.buttons).toEqual({ start: '直接開始', how: '園區怎麼運作', back: '上一頁', next: '下一頁', pick: '選一個角色', skip: '跳過說明' });
  });

  it('新寫的那句小字（第三頁）照設計文件，來源是核可那天的口頭決定', () => {
    expect(d.intro.pages[2].fine).toEqual({ text: '這是規劃中的示意：園區還沒選址，畫的是運轉起來以後的樣子；數字是示意，人物的名字與對話是例子。', source: '口頭決定 2026-11-21' });
    expect(d.intro.pages[2].ways[1].text).toContain('右上角還能調成 1.5 倍速。');
  });
});

describe('歡迎框的畫面', () => {
  let restore;
  beforeEach(() => { mountPage(); restore = installFakeCanvas(); });
  afterEach(() => restore());

  it('三頁來回：頁碼、按鈕的字、跳過說明只在第二頁起出現', () => {
    const intro = createIntro(d, emptyRecord(), {});
    const B = d.intro.buttons;
    intro.open();
    const shows = (step, back, next, skipHidden, at) => {
      expect($('in-step').textContent).toBe(step);
      expect($('in-back').textContent).toBe(back); expect($('in-next').textContent).toBe(next);
      expect($('in-skip').hidden).toBe(skipHidden);
      expect(pages().map((p) => p.getAttribute('aria-hidden'))).toEqual([0, 1, 2].map((k) => (k === at ? 'false' : 'true')));
      expect(pages().map((p) => p.hasAttribute('inert'))).toEqual([0, 1, 2].map((k) => k !== at));
    };
    expect($('intro').hidden).toBe(false);
    shows('歡迎・1／3', B.start, B.how, true, 0);
    $('in-next').click(); shows('怎麼運作・2／3', B.back, B.next, false, 1);
    expect($('in-skip').textContent).toBe(B.skip);
    $('in-next').click(); shows('怎麼逛・3／3', B.back, B.pick, false, 2);
    $('in-back').click(); shows('怎麼運作・2／3', B.back, B.next, false, 1);
    $('in-back').click(); shows('歡迎・1／3', B.start, B.how, true, 0);
    expect($('intro').hidden).toBe(false);
  });

  it('三頁疊在同一格（照試作的樣式），每一頁都畫出來', () => {
    createIntro(d, emptyRecord(), {}).open();
    expect(pages()).toHaveLength(3);
    expect($('in-pages').classList.contains('in-pages')).toBe(true);
    const [p1, p2, p3] = pages();
    expect(p1.querySelectorAll('.hello canvas')).toHaveLength(5);
    expect(p1.querySelector('h2').textContent).toBe(d.intro.pages[0].title);
    expect([...p1.querySelectorAll('.lead')].map((p) => p.textContent)).toEqual(d.intro.pages[0].lead.map((l) => l.text));
    expect([...p1.querySelectorAll('.flow-row')].map((r) => r.classList.contains('now'))).toEqual([false, true]);
    expect([...p1.querySelectorAll('.flow-row svg')]).toHaveLength(2);
    expect([...p1.querySelectorAll('.flow-row')][1].textContent).toContain('生產賣出再投入下一輪');
    expect(p1.querySelector('.tap-tip b').textContent).toBe(d.intro.pages[0].tip.label);
    expect(p1.querySelector('.tap-tip').textContent).toContain(d.intro.pages[0].tip.text);
    expect([...p2.querySelectorAll('.loop > i')].map((i) => i.textContent)).toEqual(['錢', '物', '人']);
    expect([...p2.querySelectorAll('.faces span')].map((s) => s.textContent)).toEqual(['客人', '學員', '夥伴', '社員', '導師']);
    expect(p2.querySelectorAll('.faces canvas')).toHaveLength(5);
    expect([...p2.querySelectorAll('.loop p')].map((p) => p.textContent)).toEqual([d.intro.pages[1].loops[0].text, d.intro.pages[1].loops[2].text]);
    expect([...p3.querySelectorAll('.ways li')].map((li) => li.querySelector('b').textContent)).toEqual(d.intro.pages[2].ways.map((w) => w.title));
    expect(p3.querySelector('.fine').textContent).toBe(d.intro.pages[2].fine.text);
    expect(document.querySelector('#intro .panel').getAttribute('role')).toBe('dialog');
    expect(document.querySelector('#intro .panel').getAttribute('aria-label')).toBe(d.intro.label);
  });

  it('關掉的三種按法都記下看過了、叫一次 onClose；連按兩下也只叫一次', () => {
    const ways = [
      () => $('in-back').click(),                                          // 直接開始
      () => { $('in-next').click(); $('in-skip').click(); },                // 跳過說明
      () => { $('in-next').click(); $('in-next').click(); $('in-next').click(); },  // 選一個角色
    ];
    for (const close of ways) {
      mountPage();
      const record = emptyRecord(), onClose = vi.fn();
      const intro = createIntro(d, record, { onClose });
      intro.open();
      close();
      expect(record.intro).toBe(true); expect($('intro').hidden).toBe(true); expect(onClose).toHaveBeenCalledTimes(1);
      $('in-back').click(); $('in-next').click(); $('in-skip').click(); intro.close();
      expect(onClose).toHaveBeenCalledTimes(1);
    }
  });

  it('再打開一次從第一頁開始；按鈕有焦點時開框，焦點移到「園區怎麼運作」', () => {
    const intro = createIntro(d, emptyRecord(), {});
    intro.open(); $('in-next').click(); $('in-next').click(); intro.close();
    const other = document.createElement('button'); document.body.append(other); other.focus();
    intro.open();
    expect($('in-step').textContent).toBe('歡迎・1／3');
    expect(document.activeElement).toBe($('in-next'));
  });

  it('沒有東西有焦點時開框（第一次打開網頁），不搶焦點', () => {
    document.activeElement?.blur?.();
    createIntro(d, emptyRecord(), {}).open();
    expect(document.activeElement === document.body || document.activeElement === null).toBe(true);
  });
});

describe('歡迎框接到真的頁面', () => {
  let restore, page;
  beforeEach(() => { mountPage(); restore = installFakeCanvas(); page = pageRunner(); });
  afterEach(() => { page.stop(); restore(); });

  it('第一次打開自動出現；關掉以後記得，下次不再自動出現', async () => {
    const storage = memoryStorage();
    const r = await page.open({ storage });
    expect($('intro').hidden).toBe(false); expect($('start').hidden).toBe(true); expect($('hud').hidden).toBe(true);
    expect(r.park.state.mode).toBe('menu');
    $('in-back').click();                                // 直接開始
    expect($('intro').hidden).toBe(true); expect($('start').hidden).toBe(false);
    expect(saved(storage).intro).toBe(true);
    // the next visit: a new page on the same browser
    page.stop(); mountPage();
    const again = await page.open({ storage });
    expect(again.record.intro).toBe(true);
    expect($('intro').hidden).toBe(true); expect($('start').hidden).toBe(false);
  });

  it('最後一頁的按鈕是選一個角色，按了出現角色清單', async () => {
    const r = await page.open();
    $('in-next').click(); $('in-next').click();
    expect($('in-next').textContent).toBe(d.intro.buttons.pick);
    $('in-next').click();
    expect($('intro').hidden).toBe(true); expect($('start').hidden).toBe(false);
    expect(document.querySelectorAll('#roles .role')).toHaveLength(7);
    expect(r.record.intro).toBe(true); expect(saved(r.storage).intro).toBe(true);
  });

  it('從角色清單的「這個園區想做什麼、怎麼運作？」再打開；關掉回到清單', async () => {
    await page.open({ storage: memoryStorage({ intro: true, tried: {}, done: {} }) });
    expect($('start').hidden).toBe(false); expect($('intro').hidden).toBe(true);
    $('about-btn').click();
    expect($('intro').hidden).toBe(false); expect($('start').hidden).toBe(true);
    expect($('in-step').textContent).toBe('歡迎・1／3');
    $('in-next').click(); $('in-skip').click();
    expect($('intro').hidden).toBe(true); expect($('start').hidden).toBe(false);
  });

  it('背後的園區照常在動', async () => {
    const r = await page.open();
    page.frame(); page.frame();
    const c0 = r.park.state.clock;
    page.frame(); page.frame();
    expect(r.park.state.clock).toBeGreaterThan(c0);
  });

  it('瀏覽器不讓存（沒有 storage、讀取就出錯、寫入出錯）：歡迎框照樣出現、關得掉、出現清單', async () => {
    const throwing = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
    const deniedWin = { get localStorage() { throw new Error('denied'); } };
    for (const opts of [{ storage: undefined }, { storage: undefined, win: deniedWin }, { storage: throwing }]) {
      page.stop(); mountPage();
      const r = await page.open(opts);
      expect($('intro').hidden).toBe(false);
      $('in-back').click();
      expect($('intro').hidden).toBe(true); expect($('start').hidden).toBe(false);
      expect(r.record.intro).toBe(true);
    }
  });
});
