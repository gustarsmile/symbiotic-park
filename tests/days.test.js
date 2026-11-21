import { describe, it, expect } from 'vitest';
import { DATA_FILES, assemble } from '../js/data.js';
import { readData } from './helpers/data.js';
import { checkDay } from './helpers/days.js';

const d = readData();

it('days/<角色>.json 放進 days.<角色>', () => {
  for (const id of ['farm', 'work', 'shop', 'acct']) expect(DATA_FILES).toContain(`days/${id}.json`);
  expect(assemble({ 'days/farm.json': { id: 'farm' }, 'map.json': {} }).days).toEqual({ farm: { id: 'farm' } });
  expect(Object.keys(d.days)).toEqual(expect.arrayContaining(['farm', 'work', 'shop', 'acct']));
});

describe.each(['farm', 'work', 'shop', 'acct'])('%s 的一天', (id) => {
  const day = d.days[id];
  it('件數', () => expect(day.tasks).toHaveLength({ farm: 8, work: 6, shop: 7, acct: 6 }[id]));
  it('通過共用的檢查', () => checkDay(day, d));
  it('代號與接手的人', () => {
    expect(day.id).toBe(id);
    expect(day.who).toBe({ farm: 'ahe', work: 'amei', shop: 'guyu', acct: 'qingming' }[id]);
  });
});

it('農夫育苗的解說補上了示意', () => expect(d.days.farm.tasks[4].why.text).toContain('先留 20 元（示意）'));

it('帳務第 3 件事是兩段：清單，然後長條圖', () => {
  const s = d.days.acct.tasks[2].scene; expect(s.map((p) => p.type)).toEqual(['tick', 'ledger']);
  expect(s[1].rows.map((r) => r.value)).toEqual(['50 元', '20 元', '22 元', '8 元']); expect(s[1].status).toContain('示意');
  // the chart takes the whole sheet: the how-line goes away, as in the prototype
  expect(s[1].hideHow).toBe(true); expect(s[0].hideHow).toBeUndefined();
});

it('每件事的型別照試作排', () => {
  const types = (id) => d.days[id].tasks.map((t) => (Array.isArray(t.scene) ? t.scene.map((p) => p.type).join('+') : t.scene.type));
  expect(types('farm')).toEqual(['taps', 'taps', 'sort', 'steps', 'taps', 'handout', 'steps', 'ledger']);
  expect(types('work')).toEqual(['taps', 'sort', 'pick', 'quiz', 'sort', 'tick']);
  expect(types('shop')).toEqual(['taps', 'quiz', 'quiz', 'taps', 'handout', 'sort', 'quiz']);
  expect(types('acct')).toEqual(['sort', 'quiz', 'tick+ledger', 'quiz', 'sort', 'jars']);
});

it('烘乾要等 2.6 秒、長條圖 1.5 秒；帳務的長條圖不必等', () => {
  expect(d.days.farm.tasks[3].scene.steps[1].wait.seconds).toBe(2.6);
  expect(d.days.farm.tasks[3].scene.steps[2].times).toBe(3);
  expect(d.days.farm.tasks[7].scene.wait).toBe(1.5);
  expect(d.days.farm.tasks[7].scene.button).toBeUndefined();
  expect(d.days.acct.tasks[2].scene[1].wait).toBe(0);
});

it('分盈餘：10 枚，罐子 5／4／1', () => {
  const j = d.days.acct.tasks[5].scene;
  expect(j.coins).toBe(10); expect(j.jars.map((x) => x.cap)).toEqual([5, 4, 1]);
});

describe('共用的檢查抓得到錯', () => {
  const broken = (id, change) => { const day = structuredClone(d.days[id]); change(day); return () => checkDay(day, d); };

  it('先確定沒改過的會過', () => expect(broken('farm', () => {})).not.toThrow());
  it('解說沒有來源', () => expect(broken('farm', (x) => { delete x.tasks[0].why.source; })).toThrow());
  it('來源寫法不對', () => expect(broken('work', (x) => { x.tasks[0].why.source = '有人說的'; })).toThrow());
  it('場景裡標了來源的欄位是一般字串', () => expect(broken('acct', (x) => { x.tasks[0].scene.tips[0] = 'x'; })).toThrow());
  it('長條圖沒有來源', () => expect(broken('farm', (x) => { delete x.tasks[7].scene.source; })).toThrow());
  it('自編的數字沒標示意', () => expect(broken('farm', (x) => {
    x.tasks[5].why = { text: x.tasks[5].why.text.replace('（示意）', ''), source: '運作設計 6.2（一）' };
  })).toThrow());
  it('來源是示意數字，文字裡卻沒有示意', () => expect(broken('shop', (x) => { x.tasks[0].why.text = x.tasks[0].why.text.replace('（示意）', ''); })).toThrow());
  it('正解連續三題在同一邊', () => expect(broken('shop', (x) => {
    x.tasks.forEach((t) => { if (t.scene.type === 'quiz') { t.scene.q = t.scene.q.slice(0, 1); delete t.scene.flip; } });
  })).toThrow());
  it('正解全在同一邊', () => expect(broken('work', (x) => { x.tasks[3].scene.q = x.tasks[3].scene.q.slice(0, 1); })).toThrow());
  it('分類題全是同一類', () => expect(broken('work', (x) => { x.tasks[1].scene.items.forEach((it) => { it.cat = 0; }); })).toThrow());
  it('場景裡的人不存在', () => expect(broken('shop', (x) => { x.tasks[1].scene.who = 'nobody'; })).toThrow());
  it('排一排的人不存在', () => expect(broken('farm', (x) => { x.tasks[6].scene.steps[1].show.people[0].id = 'nobody'; })).toThrow());
  it('交東西的人不存在', () => expect(broken('farm', (x) => { x.tasks[5].scene.people[0] = 'nobody'; })).toThrow());
  it('罐子裝不下全部的錢幣，場景會卡住', () => expect(broken('acct', (x) => { x.tasks[5].scene.jars[2].cap = 0; })).toThrow());
  it('時間沒有一件比一件晚', () => expect(broken('work', (x) => { x.tasks[2].at = x.tasks[1].at; })).toThrow());
  it('截止時間早於開始', () => expect(broken('work', (x) => { x.tasks[2].hold = x.tasks[2].at; })).toThrow());
  it('地點不是招牌之一', () => expect(broken('shop', (x) => { x.tasks[0].place = 'moon'; })).toThrow());
  it('少了必要的欄位', () => expect(broken('acct', (x) => { delete x.tasks[1].head; })).toThrow());
  it('不認得的圖示', () => expect(broken('farm', (x) => { x.tasks[0].scene.items[0].icon = 'cabbage'; })).toThrow());
  it('出現時間銀行', () => expect(broken('acct', (x) => { x.did[0] = '時間銀行'; })).toThrow());
});
