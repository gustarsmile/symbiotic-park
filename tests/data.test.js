import { describe, it, expect } from 'vitest';
import { userInfo } from 'node:os';
import { DATA_FILES, assemble, loadData } from '../js/data.js';
import { readData, readDataFile } from './helpers/data.js';
import { SOURCE_RE, isSourced, eachSourced, eachString } from './helpers/sourced.js';

const d = readData();

describe('地圖與人物資料', () => {
  it('道路：38 個點、42 條路，兩端都存在', () => {
    expect(Object.keys(d.map.nodes)).toHaveLength(38);
    expect(d.map.edges).toHaveLength(42);
    for (const [a, b] of d.map.edges) { expect(d.map.nodes[a]).toBeTruthy(); expect(d.map.nodes[b]).toBeTruthy(); }
    expect(d.map.nodes.R12).toEqual([650, 365]);
    expect(d.map.nodes.G[0]).toBeCloseTo(881.9, 1); expect(d.map.nodes.G[1]).toBeCloseTo(1209.9, 1);
    expect(d.map.start[0]).toBeCloseTo(859.7, 1); expect(d.map.start[1]).toBeCloseTo(1156.3, 1);
  });

  it('13 個招牌，每個都有帶來源的說明', () => {
    expect(d.map.labels.map((l) => l.key)).toEqual(['beds', 'herb', 'shed', 'yard', 'compost', 'work', 'shop', 'office', 'board', 'dining', 'green', 'park', 'gate']);
    for (const l of d.map.labels) expect(isSourced(l.about)).toBe(true);
  });

  it('19 個人，順序固定，作息表的每一格都對得上', () => {
    expect(d.people.map((p) => p.id)).toEqual(['ahe', 'xiaoman', 'mangzhong', 'amei', 'lixia', 'guyu', 'qingming', 'laolin', 'acheng', 'chunzhi', 'dongyang', 'kid1', 'kid2', 'kid3', 'fam1', 'fam2', 'fam3', 'agong', 'ama']);
    for (const p of d.people) {
      expect(d.identities[p.identity]).toBeTruthy();
      let last = '';
      for (const e of p.day) {
        expect(e.at).toMatch(/^\d\d:\d\d$/); expect(e.at >= last).toBe(true); last = e.at;
        expect(d.map.nodes[e.via]).toBeTruthy(); expect(d.acts[e.act]).toBeTruthy(); expect(e.spot).toHaveLength(2);
      }
    }
    expect(d.people[0].day[0]).toMatchObject({ at: '06:20', via: 'beds', act: 'harvest' });
    expect(d.people[0].day[0].spot[0]).toBeCloseTo(539.2, 1); expect(d.people[0].day[0].spot[1]).toBeCloseTo(1094.4, 1);
  });

  it('身分 10 種、動作 38 種，說明都帶合格的來源', () => {
    expect(Object.keys(d.identities)).toHaveLength(10);
    expect(Object.keys(d.acts)).toHaveLength(38);
    for (const k in d.identities) expect(isSourced(d.identities[k].why)).toBe(true);
    for (const k in d.acts) expect(isSourced(d.acts[k].does)).toBe(true);
  });

  it('來源的寫法合格，而且不帶人名與路徑', () => {
    // the account name is read at run time, so it never has to be written into this public file
    const me = userInfo().username.toLowerCase();
    let n = 0;
    eachSourced(d, (s) => {
      n++;
      for (const part of s.source.split('；')) expect(part).toMatch(SOURCE_RE);
      expect(s.source).not.toMatch(/[\\/:]|Users/i);
      if (me.length >= 3) expect(s.source.toLowerCase()).not.toContain(me);
    });
    expect(n).toBeGreaterThanOrEqual(d.map.labels.length + Object.keys(d.identities).length + Object.keys(d.acts).length);
  });

  it('全部資料裡沒有「時間銀行」', () => {
    const seen = new Set();
    eachString(d, (s) => { seen.add(s); expect(s).not.toContain('時間銀行'); });
    expect(seen.has(d.acts.harvest.does.text)).toBe(true);
    expect(seen.has(d.people[18].day[0].act)).toBe(true);
  });

  it('座標四捨五入到小數一位；動作的旗標是 true、拿的東西是字串', () => {
    const points = [d.map.avenue, d.map.start, ...Object.values(d.map.nodes), ...d.people.flatMap((p) => p.day.map((e) => e.spot))];
    for (const pt of points) for (const v of pt) { expect(Number.isFinite(v)).toBe(true); expect(Math.round(v * 10) / 10).toBe(v); }
    for (const a of Object.values(d.acts)) {
      for (const f of ['bend', 'sit', 'in', 'out']) if (f in a) expect(a[f]).toBe(true);
      if ('carry' in a) expect(typeof a.carry).toBe('string');
    }
    expect(d.acts.harvest).toMatchObject({ bend: true, carry: 'basket' });
    expect(d.acts.home).toMatchObject({ carry: 'box', out: true });
  });
});

describe('assemble 與 loadData', () => {
  // a stand-in for fetch that serves js/data/ from disk for any url under root
  const ok = (root, url) => ({ ok: true, status: 200, json: async () => readDataFile(url.slice(root.length)) });

  it('assemble 照檔名放好，沒有的先給空的', () => {
    expect(assemble({})).toEqual({ map: {}, people: [], identities: {}, acts: {}, days: {}, intro: {}, ui: {} });
    const got = assemble({ 'map.json': { m: 1 }, 'people.json': [{ id: 'x' }], 'identities.json': { i: 1 }, 'acts.json': { a: 1 }, 'intro.json': { n: 1 }, 'ui.json': { u: 1 } });
    expect(got).toEqual({ map: { m: 1 }, people: [{ id: 'x' }], identities: { i: 1 }, acts: { a: 1 }, days: {}, intro: { n: 1 }, ui: { u: 1 } });
    expect(DATA_FILES.slice(0, 4)).toEqual(['map.json', 'people.json', 'identities.json', 'acts.json']);
  });

  it('loadData 一次發出全部的請求，組出來跟從磁碟讀的一樣', async () => {
    const asked = [];
    let release;
    const gate = new Promise((r) => { release = r; });
    const p = loadData('../js/data/', (url) => { asked.push(url); return gate.then(() => ok('../js/data/', url)); });
    expect(asked).toEqual(DATA_FILES.map((f) => '../js/data/' + f)); // all asked before any answered
    release();
    expect(await p).toEqual(d);
    asked.length = 0;
    await loadData('data', async (url) => { asked.push(url); return ok('data/', url); });
    expect(asked[0]).toBe('data/' + DATA_FILES[0]);
  });

  it('loadData 任何一個檔案失敗就 reject', async () => {
    const missing = DATA_FILES[DATA_FILES.length - 1];
    const notFound = async (url) => (url.endsWith(missing) ? { ok: false, status: 404, json: async () => ({}) } : ok('x/', url));
    await expect(loadData('x/', notFound)).rejects.toThrow(missing);
    await expect(loadData('x/', async () => { throw new Error('offline'); })).rejects.toThrow('offline');
    const badJson = async (url) => (url.endsWith(missing) ? { ok: true, status: 200, json: async () => JSON.parse('{') } : ok('x/', url));
    await expect(loadData('x/', badJson)).rejects.toThrow();
  });
});

describe('來源的輔助函式', () => {
  it('認得出合格與不合格的來源', () => {
    expect(isSourced({ text: 'a', source: '例子' })).toBe(true);
    for (const bad of [{ text: '', source: '例子' }, { text: 'a', source: '' }, { text: 'a' }, 'a', null, ['a', '例子']]) expect(isSourced(bad)).toBe(false);
    for (const ok of ['運作設計 6.3 規則四', '產品線規劃 4.5', '口頭決定 2026-11-20', '示意數字', '例子', '待確認']) expect(ok).toMatch(SOURCE_RE);
    for (const bad of ['運作設計', '運作設計6.3', '口頭決定 11/20', '有人說的', '']) expect(bad).not.toMatch(SOURCE_RE);
  });

  it('eachSourced 與 eachString 走遍每一層，並給出位置', () => {
    const sample = { a: { text: 'x', source: '例子' }, b: [{ c: { text: 'y', source: '示意數字' } }, { text: '', source: '' }], d: 'z', e: 3 };
    const found = [];
    eachSourced(sample, (s, path) => found.push([path, s.text]));
    expect(found).toEqual([['a', 'x'], ['b[0].c', 'y'], ['b[1]', '']]);
    const strs = [];
    eachString(sample, (s, path) => strs.push([path, s]));
    expect(strs).toEqual([['a.text', 'x'], ['a.source', '例子'], ['b[0].c.text', 'y'], ['b[0].c.source', '示意數字'], ['b[1].text', ''], ['b[1].source', ''], ['d', 'z']]);
  });
});
