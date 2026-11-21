import { describe, it, expect } from 'vitest';
import { DATA_FILES, assemble } from '../js/data.js';
import { readData } from './helpers/data.js';
import { checkDay } from './helpers/days.js';
import { ROLE_IDS } from '../js/engine/store.js';
import { eachString, eachSourced } from './helpers/sourced.js';

const d = readData();
const ROLES = ['farm', 'work', 'shop', 'acct', 'learner', 'vol', 'mentor'];

it('days/<角色>.json 放進 days.<角色>', () => {
  for (const id of ROLES) expect(DATA_FILES).toContain(`days/${id}.json`);
  expect(assemble({ 'days/farm.json': { id: 'farm' }, 'map.json': {} }).days).toEqual({ farm: { id: 'farm' } });
  expect(Object.keys(d.days).sort()).toEqual([...ROLES].sort());
});

it('ROLE_IDS 跟 days 的鍵內容與順序一致', () => expect(ROLE_IDS).toEqual(Object.keys(d.days)));

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
  expect(types('learner')).toEqual(['taps', 'any', 'taps', 'tick', 'order', 'tick']);
  expect(types('vol')).toEqual(['sort', 'taps', 'handout', 'quiz', 'taps+steps', 'taps', 'ledger']);
  expect(types('mentor')).toEqual(['quiz', 'order', 'quiz', 'tick', 'tick', 'tick']);
});

describe.each(['learner', 'vol', 'mentor'])('%s 的一天', (id) => {
  it('件數', () => expect(d.days[id].tasks).toHaveLength({ learner: 6, vol: 7, mentor: 6 }[id]));
  it('通過共用的檢查', () => checkDay(d.days[id], d));
  it('代號與接手的人', () => {
    expect(d.days[id].id).toBe(id);
    expect(d.days[id].who).toBe({ learner: 'acheng', vol: 'chunzhi', mentor: 'laolin' }[id]);
  });
});

it('七個角色一共 46 件事', () => expect(Object.values(d.days).reduce((n, x) => n + x.tasks.length, 0)).toBe(46));

// These wordings differ from the prototype on purpose: the project owner decided them on 2026-11-21.
describe('使用者 2026-11-21 決定的寫法（跟試作不一樣，是刻意的）', () => {
  it('志工簽退：記下來是為了保護志工', () => {
    expect(d.days.vol.tasks[6].why).toEqual({
      text: '做志工不求回報，時數不是存款，也不排名。記下來是為了保護志工：每週的時數有約定的上限，超過了，就表示園區在拿志工當免費勞力，要改。你做的好事，吃飯的時候會有人說給大家聽，貼上善行故事牆。',
      source: '運作設計 6.2（三）；運作設計 七；口頭決定 2026-11-20',
    });
  });
  it('看帳的動作：看這個月的帳，不再待確認', () => {
    expect(d.acts.look.does).toEqual({ text: '在公開牆前看這個月的帳', source: '運作設計 6.9' });
    expect(d.acts.look.does.source).not.toContain('待確認');
  });
  it('門市收店：剩得多不多，每週都要看，不再待確認', () => {
    expect(d.days.shop.tasks[5].why).toEqual({
      text: '當週剩下的菜進共食的廚房，不丟掉。剩得多不多，每週都要看：剩食變多，表示種的和訂的對不上。',
      source: '運作設計 6.2（二）；運作設計 七；產品線規劃 6.6',
    });
    expect(d.days.shop.tasks[5].why.source).not.toContain('待確認');
  });
  it('農夫最後一件事：去看這個月的帳，特寫的標題不變', () => {
    expect(d.days.farm.tasks[7].title).toBe('去看這個月的帳');
    expect(d.days.farm.tasks[7].head).toBe('今天賣的每 100 元去了哪裡');
  });
  it('志工備菜：賣相不好的只送加工坊，鍋裡是好看的菜', () => {
    const job = d.days.vol.tasks[1];
    expect(job.why.text).toBe('共食用的是當週剩下的菜。');
    expect(job.why.source).toBe('運作設計 6.4；運作設計 6.2（二）');
    expect(job.scene.items).toHaveLength(5);
    expect(job.scene.items.some((it) => it.icon === 'vegBad')).toBe(false);
    expect(job.scene.items.map((it) => it.icon)).toEqual(['veg', 'veg', 'veg', 'veg', 'veg']);
  });
  it('整份資料裡沒有任何來源是待確認', () => {
    let n = 0;
    eachSourced(d, (s, path) => { n++; expect(s.source, path).not.toContain('待確認'); });
    expect(n).toBeGreaterThan(150); // every sourced text in the data was walked
    // a ledger part carries its source as a plain string
    const ledgers = [];
    const walk = (v) => {
      if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === 'object') { if (v.type === 'ledger') ledgers.push(v); Object.values(v).forEach(walk); }
    };
    walk(d);
    expect(ledgers).toHaveLength(3); // farm job 8, bookkeeper job 3, volunteer job 7
    ledgers.forEach((l) => { expect(typeof l.source).toBe('string'); expect(l.source).not.toContain('待確認'); });
  });
});

it('志工簽退補上了示意', () => expect(d.days.vol.tasks[6].how).toContain('4.5 小時（示意）'));

it('志工的一天沒有任何回報的字眼', () => {
  let n = 0;
  eachString(d.days.vol, (s) => { n++; expect(s).not.toMatch(/存進|換取|點數|積分/); });
  expect(n).toBeGreaterThan(100); // the whole day was walked, not an empty object
});

it('學員：三條路都可以，排茶包的四步照試作的順序擺', () => {
  const [, any, , courses, order, talk] = d.days.learner.tasks.map((t) => t.scene);
  expect(any.who).toBe('laolin');
  expect(any.opts.map((o) => o.label)).toEqual(['到外面找工作', '自己承租一塊地來種', '留下來成為社員']);
  expect(courses.board).toBe(true); expect(courses.items).toHaveLength(4);
  expect(order.steps).toHaveLength(4); expect(order.show).toEqual([2, 0, 3, 1]);
  expect(talk.who).toBe('laolin'); expect(talk.say).toBe('「今天學會了哪些？」');
});

it('志工：分類的兩類、孩子的三題、端菜後的新朋友、簽退的長條', () => {
  const s = d.days.vol.tasks.map((t) => t.scene);
  expect(s[0].who).toBe('laolin');
  expect(s[0].cats.map((c) => c.label)).toEqual(['志工來做', '領薪水的夥伴來做']);
  expect(s[0].items).toHaveLength(6);
  expect(s[1].meter).toBe('pot'); expect(s[1].gone).toBe(true); expect(s[1].items).toHaveLength(5);
  expect(s[2].layout).toBe('faces'); expect(s[2].people).toEqual(['kid1', 'kid2', 'kid3']); expect(s[2].give).toBeUndefined();
  expect(s[3].q.map((q) => q.who)).toEqual(['kid1', 'kid2', 'kid3']); expect(s[3].done.who).toBe('kid3');
  for (const f of ['good', 'bad']) expect(new Set(s[3].q.map((q) => q[f])).size).toBe(1);
  expect(new Set(s[3].q.map((q) => JSON.stringify(q.tip))).size).toBe(1);
  // four bowls, then the newcomer at the door and one button; the bowl count stays on the status line
  expect(s[4][0].items).toHaveLength(4);
  expect(s[4][1].status).toBe('端上桌 4 碗，共 4 碗');
  expect(s[4][1].show.who).toBe('fam3'); expect(s[4][1].steps.map((st) => st.label)).toEqual(['請他一起坐']);
  expect(s[5].items.map((it) => [it.icon, it.iconDone])).toEqual([['bucket', 'bucketEmpty'], ['bucket', 'bucketEmpty'], ['bucket', 'bucketEmpty']]);
  expect(s[6].rows).toHaveLength(1); expect(s[6].before).toBe('0 小時'); expect(s[6].wait).toBe(1.2);
  expect(s[6].button).toBe('寫上 4.5 小時，簽退');
});

it('導師：排五步照試作的順序擺；委員會那一場 flip 1', () => {
  const s = d.days.mentor.tasks.map((t) => t.scene);
  expect(s[0].who).toBe('acheng');
  expect(s[1].steps).toEqual(['客人', '學員', '夥伴', '社員', '導師']); expect(s[1].show).toEqual([2, 4, 0, 3, 1]);
  expect(s[2].flip).toBe(1); expect(s[2].who).toBeUndefined();
  expect(s[3].board).toBe(true);
  expect(s[4].who).toBe('kid1'); expect(s[4].say).toBe('「我想做一台會自己澆水的機器。」');
  expect(s[5].items).toHaveLength(4);
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
  it('沒有標準答案的回覆沒有來源', () => expect(broken('learner', (x) => { x.tasks[1].scene.opts[0].reply = 'x'; })).toThrow());
  it('簽退的 4.5 小時沒標示意', () => expect(broken('vol', (x) => { x.tasks[6].how = x.tasks[6].how.replace('（示意）', ''); })).toThrow());
  it('第二段場景裡的人不存在', () => expect(broken('vol', (x) => { x.tasks[4].scene[1].show.who = 'nobody'; })).toThrow());
});
