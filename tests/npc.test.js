import { describe, it, expect } from 'vitest';
import { readData } from './helpers/data.js';
import { applyOverrides } from '../js/engine/npc.js';

const d = readData();
const byId = (people, id) => people.find((p) => p.id === id);

describe('電腦人物不跟你做同一件事', () => {
  it('當門市夥伴時，阿禾不來交菜箱', () => { const p = applyOverrides(d.people, d.days.shop.npc); expect(p[0].day.some((e) => e.act === 'shopkeep')).toBe(false); });
  it('當農夫時，穀雨下午在招呼客人', () => { const p = applyOverrides(d.people, d.days.farm.npc); expect(p[5].day.find((e) => e.at === '13:00').act).toBe('greet'); });
  it('當加工夥伴時，立夏不送茶包', () => { const p = applyOverrides(d.people, d.days.work.npc); expect(p[4].day.some((e) => e.act === 'tea')).toBe(false); });
  it('不改到原本的資料', () => { applyOverrides(d.people, d.days.shop.npc); expect(d.people[0].day.some((e) => e.act === 'shopkeep')).toBe(true); });
  it('同事一起做同一種工作的，原樣保留', () => { const p = applyOverrides(d.people, d.days.farm.npc); expect(p[2].day[0].act).toBe('harvest'); });
  it('設定對不上人或時間就報錯', () => expect(() => applyOverrides(d.people, [{ who: 'ahe', at: '03:00', drop: true }])).toThrow());

  it('拿掉一格，人就留在前一個地方：阿禾留在溫網室育苗到吃晚飯，立夏留在曬場到回加工坊', () => {
    const ahe = byId(applyOverrides(d.people, d.days.shop.npc), 'ahe').day;
    const seed = ahe.findIndex((e) => e.at === '13:20');
    expect(ahe[seed]).toMatchObject({ via: 'green', act: 'seed' });
    expect(ahe[seed + 1]).toMatchObject({ at: '17:25', act: 'eat' });
    expect(ahe).toHaveLength(byId(d.people, 'ahe').day.length - 1);
    const lixia = byId(applyOverrides(d.people, d.days.work.npc), 'lixia').day;
    const sun = lixia.findIndex((e) => e.at === '13:10');
    expect(lixia[sun]).toMatchObject({ via: 'yard', act: 'sun' });
    expect(lixia[sun + 1]).toMatchObject({ at: '15:40', act: 'teabag' });
  });

  it('換動作時，地點、位置與時間都不動', () => {
    const before = byId(d.people, 'guyu').day.find((e) => e.at === '13:00');
    const after = byId(applyOverrides(d.people, d.days.farm.npc), 'guyu').day.find((e) => e.at === '13:00');
    expect(after).toEqual({ ...before, act: 'greet' });
  });

  it('只動到設定的人，其他人的作息一格不差', () => {
    for (const [role, who] of [['shop', ['ahe']], ['farm', ['guyu', 'laolin']], ['work', ['lixia']]]) {
      const p = applyOverrides(d.people, d.days[role].npc);
      expect(p.map((x) => x.id)).toEqual(d.people.map((x) => x.id));
      p.forEach((x, i) => { if (!who.includes(x.id)) expect(x).toEqual(d.people[i]); else expect(x).not.toEqual(d.people[i]); });
    }
  });

  it('回傳新的陣列、新的人與新的作息；改回傳的東西也碰不到原本的資料', () => {
    const snapshot = structuredClone(d.people);
    const p = applyOverrides(d.people, d.days.farm.npc);
    expect(p).not.toBe(d.people);
    p.forEach((x, i) => { expect(x).not.toBe(d.people[i]); expect(x.day).not.toBe(d.people[i].day); });
    p[5].day[0].act = 'leave'; p[5].day[0].spot[0] = -1; p[0].day.pop();
    expect(d.people).toEqual(snapshot);
  });

  it('沒有設定時原樣照抄', () => {
    const p = applyOverrides(d.people);
    expect(p).toEqual(d.people);
    expect(p).not.toBe(d.people);
    expect(applyOverrides(d.people, [])).toEqual(d.people);
  });

  it('設定寫錯的各種情形都報錯，而且不改到原本的資料', () => {
    const snapshot = structuredClone(d.people);
    expect(() => applyOverrides(d.people, [{ who: 'nobody', at: '15:20', drop: true }])).toThrow(/nobody/);
    expect(() => applyOverrides(d.people, [{ who: 'ahe', at: '03:00', drop: true }])).toThrow(/03:00/);
    expect(() => applyOverrides(d.people, [{ who: 'ahe', at: '15:20' }])).toThrow();
    expect(() => applyOverrides(d.people, [{ who: 'ahe', at: '15:20', drop: true, act: 'greet' }])).toThrow();
    expect(() => applyOverrides(d.people, [{ who: 'ahe', at: '15:20', act: '' }])).toThrow();
    // the same entry twice: once it is dropped there is nothing left at that time
    expect(() => applyOverrides(d.people, [{ who: 'ahe', at: '15:20', drop: true }, { who: 'ahe', at: '15:20', drop: true }])).toThrow();
    expect(d.people).toEqual(snapshot);
  });
});

describe('角色資料裡的錯開設定', () => {
  it('只有門市、農夫、加工三個角色有；門市、加工各一條，農夫另外加了老林的兩格', () => {
    const withNpc = Object.keys(d.days).filter((id) => 'npc' in d.days[id]).sort();
    expect(withNpc).toEqual(['farm', 'shop', 'work']);
    expect(d.days.shop.npc).toEqual([{ who: 'ahe', at: '15:20', drop: true }]);
    expect(d.days.farm.npc).toEqual([
      { who: 'guyu', at: '13:00', act: 'greet' },
      // the gate spot is 20 to the right of and 20 below the one first planned, so the 大門 signboard does not cover him
      { who: 'laolin', at: '06:00', add: { via: 'G', spot: [922, 1202], act: 'welcome' } },
      { who: 'laolin', at: '06:30', add: { via: 'beds', spot: [524.3, 1061.2], act: 'guide' } },
    ]);
    expect(d.days.work.npc).toEqual([{ who: 'lixia', at: '15:00', drop: true }]);
  });

  it('每一條都對得上人與時間（加一格的，那個時間原本是空的），不是你自己接手的人，換上的動作有說明', () => {
    let adds = 0;
    for (const day of Object.values(d.days)) {
      for (const o of day.npc ?? []) {
        expect(o.who).not.toBe(day.who);
        const taken = byId(d.people, o.who).day.some((e) => e.at === o.at);
        if ('add' in o) { expect(taken).toBe(false); adds++; } else expect(taken).toBe(true);
        if ('act' in o) expect(d.acts[o.act]).toBeTruthy();
      }
      expect(() => applyOverrides(d.people, day.npc)).not.toThrow();
    }
    expect(adds).toBe(2);
  });

  it('add 用到的路口與動作都存在', () => {
    const all = Object.values(d.days).flatMap((day) => (day.npc ?? []).filter((o) => 'add' in o));
    expect(all).toHaveLength(2);
    for (const o of all) {
      expect(o.at).toMatch(/^([01]\d|2[0-3]):[0-5]\d$/);
      expect(d.map.nodes[o.add.via], o.add.via).toBeTruthy();
      expect(d.acts[o.add.act], o.add.act).toBeTruthy();
      expect(o.add.spot).toHaveLength(2);
      o.add.spot.forEach((v) => { expect(Number.isFinite(v)).toBe(true); expect(Math.round(v * 10) / 10).toBe(v); });
      expect(Object.keys(o.add).sort()).toEqual(['act', 'spot', 'via']);
    }
  });

  it('新的動作「在大門口等新來的人」「陪新來的夥伴下田」：說明照文件', () => {
    expect(d.acts.welcome.does).toEqual({ text: '在大門口等新來的人，來了就先接住', source: '運作設計 6.5；口頭決定 2026-11-24' });
    expect(d.acts.guide.does).toEqual({ text: '陪新來的夥伴下田，一步一步帶', source: '運作設計 6.5；產品線規劃 6.2' });
    for (const k of ['welcome', 'guide']) expect(Object.keys(d.acts[k])).toEqual(['does']);       // standing, in sight: no in/out, no bending
  });

  it('新的動作「招呼客人」：說明是新寫的例子', () => {
    expect(d.acts.greet.does).toEqual({ text: '顧門市，招呼來買菜的客人', source: '例子' });
  });

  it('你做那件事的時候，旁邊的電腦人物不在做同一件事', () => {
    // [role, the job (from 0), the act that would duplicate it, the person who used to do it]
    const cases = [['shop', 4, 'shopkeep', 'ahe'], ['farm', 6, 'shopkeep', 'guyu'], ['work', 4, 'tea', 'lixia']];
    for (const [role, k, act, who] of cases) {
      const job = d.days[role].tasks[k];
      const during = (day) => {
        let cur = null;
        for (const e of day) if (e.at <= job.at) cur = e;
        return [cur, ...day.filter((e) => e.at > job.at && e.at < job.hold)];
      };
      const old = during(byId(d.people, who).day);
      expect(old.some((e) => e && e.act === act), `${role}: ${who} used to overlap`).toBe(true);
      const now = during(byId(applyOverrides(d.people, d.days[role].npc), who).day);
      expect(now.some((e) => e && e.act === act), `${role}: ${who} no longer overlaps`).toBe(false);
    }
  });
});

describe('加一格（add）', () => {
  const add = (who, at, extra = {}) => ({ who, at, add: { via: 'G', spot: [902, 1182], act: 'welcome' }, ...extra });

  it('當農夫時，老林一早在大門口等，06:30 去菜畦陪你', () => { const p = applyOverrides(d.people, d.days.farm.npc); const day = p[7].day;
    expect(day[0]).toMatchObject({ at: '06:00', via: 'G', act: 'welcome' }); expect(day[1]).toMatchObject({ at: '06:30', via: 'beds', act: 'guide' }); expect(day[2].at).toBe('09:10'); });

  it('add 插進去以後仍然照時間排；不改到原本的資料', () => {
    const people = structuredClone(d.people), overrides = [add('laolin', '20:00'), add('laolin', '12:30'), add('laolin', '05:00')];
    const before = structuredClone(overrides);
    const day = byId(applyOverrides(people, overrides), 'laolin').day, old = byId(d.people, 'laolin').day;
    expect(day).toHaveLength(old.length + 3);
    expect(day.map((e) => e.at)).toEqual([...old.map((e) => e.at), '05:00', '12:30', '20:00'].sort());
    expect(day.find((e) => e.at === '12:30')).toEqual({ at: '12:30', via: 'G', spot: [902, 1182], act: 'welcome' });
    expect(day.filter((e) => e.at !== '05:00' && e.at !== '12:30' && e.at !== '20:00')).toEqual(old);
    // neither the people nor the overrides handed in were changed, and the new entry shares nothing with them
    expect(people).toEqual(d.people); expect(overrides).toEqual(before);
    day.find((e) => e.at === '12:30').spot[0] = -1;
    expect(overrides[1].add.spot).toEqual([902, 1182]);
    const farm = structuredClone(d.days.farm.npc);
    applyOverrides(d.people, d.days.farm.npc)[7].day[0].spot[1] = -1;
    expect(d.days.farm.npc).toEqual(farm);
  });

  it('add 的時間已經有一格、或同時給兩種寫法：報錯', () => {
    const snapshot = structuredClone(d.people);
    expect(() => applyOverrides(d.people, [add('laolin', '09:10')])).toThrow(/09:10/);                       // laolin's own entry
    expect(() => applyOverrides(d.people, [add('laolin', '06:00'), add('laolin', '06:00')])).toThrow(/06:00/);       // taken by an add before it
    expect(() => applyOverrides(d.people, [add('laolin', '06:00', { act: 'greet' })])).toThrow();
    expect(() => applyOverrides(d.people, [add('laolin', '06:00', { drop: true })])).toThrow();
    expect(() => applyOverrides(d.people, [{ who: 'laolin', at: '09:10', drop: true, act: 'greet', add: { via: 'G', spot: [1, 1], act: 'welcome' } }])).toThrow();
    expect(() => applyOverrides(d.people, [add('nobody', '06:00')])).toThrow(/nobody/);
    // an add that is not whole, or a time that is not hh:mm
    for (const bad of [null, {}, { via: 'G', act: 'welcome' }, { via: 'G', spot: [1], act: 'welcome' }, { spot: [1, 1], act: 'welcome' }, { via: 'G', spot: [1, 1] }]) {
      expect(() => applyOverrides(d.people, [{ who: 'laolin', at: '06:00', add: bad }])).toThrow();
    }
    expect(() => applyOverrides(d.people, [add('laolin', '6:00')])).toThrow();
    // a drop first frees the time, so an add there is fine
    const p = applyOverrides(d.people, [{ who: 'laolin', at: '09:10', drop: true }, add('laolin', '09:10')]);
    expect(byId(p, 'laolin').day.find((e) => e.at === '09:10').act).toBe('welcome');
    expect(d.people).toEqual(snapshot);
  });
});
