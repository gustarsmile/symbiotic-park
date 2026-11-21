import { describe, it, expect } from 'vitest';
import { ROLE_IDS, safeStorage, emptyRecord, loadRecord, saveRecord, markTried, credit } from '../js/engine/store.js';

function fake(initial) {
  const s = { value: initial, key: null, getItem(k) { s.readKey = k; return s.value; }, setItem(k, v) { s.key = k; s.value = v; } };
  return s;
}

describe('store', () => {
  it('空的、壞的、形狀不對的，都當成沒有紀錄', () => {
    for (const raw of [null, '', '{', '[]', '"x"', '{"tried":5,"done":"y","intro":"z"}', '{"done":{"farm":-3,"work":"2"}}'])
      expect(loadRecord(fake(raw))).toEqual({ intro: false, tried: {}, done: {} });
  });

  it('讀或寫會丟錯的瀏覽器：照常運作，只是不記得', () => {
    const broken = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
    expect(loadRecord(broken)).toEqual(emptyRecord()); expect(saveRecord(broken, emptyRecord())).toBe(false);
    expect(loadRecord(undefined)).toEqual(emptyRecord());
    expect(saveRecord(undefined, emptyRecord())).toBe(false);
  });

  it('存了讀得回來，用的是自己的鍵', () => {
    const s = fake(null); const r = emptyRecord(); markTried(r, 'farm'); credit(r, 'farm', false);
    expect(saveRecord(s, r)).toBe(true);
    expect(s.key).toBe('parkDay.v1');
    expect(loadRecord(s)).toEqual({ intro: false, tried: { farm: true }, done: { farm: 1 } });
    expect(s.readKey).toBe('parkDay.v1');
  });

  it('自動模式跑完的不算當過', () => {
    const r = emptyRecord(); credit(r, 'vol', true); expect(r.done).toEqual({});
    credit(r, 'vol', false); credit(r, 'vol', false); credit(r, 'vol', true); expect(r.done).toEqual({ vol: 2 });
  });

  it('不認得的角色不記', () => {
    const raw = JSON.stringify({ intro: true, tried: { farm: true, ghost: true, work: false, shop: 1 },
      done: { acct: 2, ghost: 5, learner: 1.5, vol: 0, mentor: 3 }, extra: 1 });
    expect(loadRecord(fake(raw))).toEqual({ intro: true, tried: { farm: true, shop: true }, done: { acct: 2, mentor: 3 } });
    const r = emptyRecord(); markTried(r, 'ghost'); credit(r, 'ghost', false);
    expect(r).toEqual(emptyRecord());
  });

  it('intro 只有真的 true 才算', () => {
    expect(loadRecord(fake('{"intro":true}')).intro).toBe(true);
    for (const v of ['"true"', '1', '"yes"', 'null']) expect(loadRecord(fake(`{"intro":${v}}`)).intro).toBe(false);
  });

  it('safeStorage：讀 localStorage 會丟錯就回 undefined', () => {
    const ok = {}; expect(safeStorage({ localStorage: ok })).toBe(ok);
    expect(safeStorage({ get localStorage() { throw new Error('denied'); } })).toBeUndefined();
    expect(safeStorage(undefined)).toBeUndefined();
    expect(safeStorage({})).toBeUndefined();
  });

  it('七個角色的代號', () => expect(ROLE_IDS).toEqual(['farm', 'work', 'shop', 'acct', 'learner', 'vol', 'mentor']));
});
