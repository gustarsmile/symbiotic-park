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

  it('只動到設定的那一個人，其他人的作息一格不差', () => {
    for (const [role, who] of [['shop', 'ahe'], ['farm', 'guyu'], ['work', 'lixia']]) {
      const p = applyOverrides(d.people, d.days[role].npc);
      expect(p.map((x) => x.id)).toEqual(d.people.map((x) => x.id));
      p.forEach((x, i) => { if (x.id !== who) expect(x).toEqual(d.people[i]); else expect(x).not.toEqual(d.people[i]); });
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
  it('只有門市、農夫、加工三個角色有，各一條', () => {
    const withNpc = Object.keys(d.days).filter((id) => 'npc' in d.days[id]).sort();
    expect(withNpc).toEqual(['farm', 'shop', 'work']);
    expect(d.days.shop.npc).toEqual([{ who: 'ahe', at: '15:20', drop: true }]);
    expect(d.days.farm.npc).toEqual([{ who: 'guyu', at: '13:00', act: 'greet' }]);
    expect(d.days.work.npc).toEqual([{ who: 'lixia', at: '15:00', drop: true }]);
  });

  it('每一條都對得上人與時間，不是你自己接手的人，換上的動作有說明', () => {
    for (const day of Object.values(d.days)) {
      for (const o of day.npc ?? []) {
        expect(o.who).not.toBe(day.who);
        expect(byId(d.people, o.who).day.some((e) => e.at === o.at)).toBe(true);
        if ('act' in o) expect(d.acts[o.act]).toBeTruthy();
      }
      expect(() => applyOverrides(d.people, day.npc)).not.toThrow();
    }
  });

  it('新的動作「招呼客人」：說明是新寫的例子', () => {
    expect(d.acts.greet.does).toEqual({ text: '顧門市，招呼來買菜的客人', source: '例子' });
  });

  it('你做那件事的時候，旁邊的電腦人物不在做同一件事', () => {
    // [role, the job (from 0), the act that would duplicate it, the person who used to do it]
    const cases = [['shop', 4, 'shopkeep', 'ahe'], ['farm', 5, 'shopkeep', 'guyu'], ['work', 4, 'tea', 'lixia']];
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
