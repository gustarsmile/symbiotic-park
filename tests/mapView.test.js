// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMapView, tintAt } from '../js/ui/mapView.js';
import { createPark } from '../js/engine/park.js';
import { mountPage } from './helpers/page.js';
import { installFakeCanvas } from './helpers/canvas.js';
import { readData } from './helpers/data.js';

let restore, data;
beforeEach(() => { mountPage(); restore = installFakeCanvas(); data = readData(); });
afterEach(() => restore());

const painted = (extra = {}) => ({
  base: document.createElement('canvas'), over: document.createElement('canvas'),
  windows: [[10, 20, 30, 40], [50, 60, 30, 40]], lights: [[5, 5]], props: [], ...extra,
});
const win = { innerWidth: 390, innerHeight: 844, devicePixelRatio: 1 };
function setup({ w = 390, h = 844, extra, opts } = {}) {
  const park = createPark(data); park.beginWatch();
  const canvas = document.getElementById('map');
  const p = painted(extra); p.base.width = 1300 * 2; p.over.width = 1300 * 2;       // painted at scale 2
  const view = createMapView(canvas, park, p, data.ui, { win: { ...win, innerWidth: w, innerHeight: h }, ...opts });
  view.resize();
  const ctx = canvas.getContext('2d');
  ctx.calls.length = 0;                      // every setup shares the page's one canvas, so start each log empty
  return { park, canvas, p, view, ctx };
}
const callsOf = (ctx, name) => ctx.calls.filter((c) => c[0] === name);
const indexOf = (ctx, pred) => ctx.calls.findIndex(pred);

describe('tintAt', () => {
  it('白天不上色，清晨和傍晚偏暖，晚上偏紫，過了 19:40 停在最後一色', () => {
    expect(tintAt(12 * 60)).toEqual([255, 255, 255]);
    expect(tintAt(5 * 60)[2]).toBe(176);                      // before the first stop: the dawn colour
    expect(tintAt(6 * 60 + 40)[0]).toBe(255);
    const dusk = tintAt(18 * 60);
    expect(dusk[0]).toBeLessThan(255); expect(dusk[2]).toBeLessThan(dusk[0]);
    expect(tintAt(19 * 60 + 40)).toEqual([176, 164, 204]);
    expect(tintAt(23 * 60)).toEqual([176, 164, 204]);
  });
});

describe('mapView', () => {
  it('resize：畫布大小是視窗乘上像素比（最多 2），並讀出 W、H', () => {
    const { view, canvas } = setup({ w: 390, h: 844 });
    expect([view.W, view.H]).toEqual([390, 844]);
    expect([canvas.width, canvas.height]).toEqual([390, 844]);
    const park = createPark(data); park.beginWatch();
    const c2 = document.createElement('canvas');
    const hi = createMapView(c2, park, painted(), data.ui, { win: { innerWidth: 400, innerHeight: 300, devicePixelRatio: 3 } });
    hi.resize();
    expect([hi.W, hi.H]).toEqual([400, 300]);
    expect([c2.width, c2.height]).toEqual([800, 600]);                  // 3 is capped at 2
  });

  it('畫的順序：底圖 → 人 → 上層 → 依時間上色 → 招牌', () => {
    const { view, ctx, park } = setup();
    for (let i = 0; i < 4000 && !park.agents.some((a) => a.vis > 0.02); i++) park.tick(0.05);
    view.camera(0.016); ctx.calls.length = 0; view.render(1);
    const names = ctx.calls.map((c) => c[0]);
    const iBase = names.indexOf('drawImage');
    const iPeople = ctx.calls.findIndex((c) => c[0] === 'scale' && c[1] === 1.3);
    const iOver = names.lastIndexOf('drawImage');
    const iTint = ctx.calls.findIndex((c) => c[0] === '=globalCompositeOperation' && c[1] === 'multiply');
    const iLabel = names.indexOf('fillText');
    expect(callsOf(ctx, 'drawImage')).toHaveLength(2);
    expect(iBase).toBeGreaterThan(-1);
    expect(iPeople).toBeGreaterThan(iBase);
    expect(iOver).toBeGreaterThan(iPeople);
    expect(iTint).toBeGreaterThan(iOver);
    expect(iLabel).toBeGreaterThan(iTint);
    // the tint is a full-screen rectangle drawn right after multiply is switched on, and multiply is switched off again
    expect(ctx.calls[iTint + 2].slice(0, 5)).toEqual(['fillRect', 0, 0, view.W, view.H]);
    expect(ctx.globalCompositeOperation).toBe('source-over');
  });

  it('人畫得比真的大 1.3 倍，而且依 y 由上往下畫（後面的人先畫）', () => {
    const { view, ctx, park } = setup();
    for (let i = 0; i < 4000 && park.agents.filter((a) => a.vis > 0.02).length < 2; i++) park.tick(0.05);
    const vis = park.agents.filter((a) => a.vis > 0.02);
    expect(vis.length).toBeGreaterThanOrEqual(2);
    view.camera(0.016); ctx.calls.length = 0; view.render(1);
    const scales = callsOf(ctx, 'scale').filter((c) => c[1] === 1.3 && c[2] === 1.3);
    expect(scales).toHaveLength(vis.length);
    const translated = ctx.calls.filter((c, i) => c[0] === 'translate' && ctx.calls[i + 1]?.[0] === 'scale' && ctx.calls[i + 1][1] === 1.3);
    const ys = translated.map((c) => c[2]);
    expect(ys).toEqual([...ys].sort((a, b) => a - b));
  });

  it('時間上色的顏色照時刻算：中午是白的、傍晚偏暖', () => {
    const noon = setup(); noon.park.state.clock = 12 * 60; noon.view.camera(0.016); noon.view.render(1);
    const tint = (ctx) => ctx.calls[ctx.calls.findLastIndex((c) => c[0] === '=globalCompositeOperation' && c[1] === 'multiply') + 1][1];
    expect(tint(noon.ctx)).toBe('rgb(255,255,255)');
    const eve = setup(); eve.park.state.clock = 18 * 60; eve.view.camera(0.016); eve.view.render(1);
    expect(tint(eve.ctx)).toBe('rgb(' + tintAt(18 * 60).map(Math.round).join(',') + ')');
    expect(tint(eve.ctx)).not.toBe('rgb(255,255,255)');
  });

  it('傍晚 17:20 以前窗戶不亮，過了才亮（一格窗一個矩形）', () => {
    const win2 = [[10, 20, 30, 40], [50, 60, 30, 40]];
    const day = setup({ extra: { windows: win2 } });
    day.park.state.clock = 17 * 60 + 10; day.view.camera(0.016); day.view.render(1);
    expect(callsOf(day.ctx, 'fillRect').some((c) => c[1] === 10 && c[2] === 20 && c[3] === 30 && c[4] === 40)).toBe(false);
    const dusk = setup({ extra: { windows: win2 } });
    dusk.park.state.clock = 18 * 60; dusk.view.camera(0.016); dusk.view.render(1);
    expect(callsOf(dusk.ctx, 'fillRect').filter((c) => c[3] === 30 && c[4] === 40)).toHaveLength(2);
  });

  it('招牌：畫在螢幕裡的才有點擊範圍，範圍比字大一圈', () => {
    const { view, park } = setup();
    view.camera(0.016); view.render(1);
    const rects = view.labelRects;
    expect(rects.length).toBeGreaterThan(0);
    const keys = new Set(data.map.labels.map((l) => l.key));
    for (const r of rects) {
      expect(keys.has(r.key)).toBe(true);
      expect(r.name).toBe(data.map.labels.find((l) => l.key === r.key).name);
      expect(r.h).toBe(32); expect(r.w).toBeGreaterThan(0);
    }
    expect(park.state.mode).toBe('watch');
  });

  it('電腦的大螢幕看得到全部招牌；手機只看得到一部分', () => {
    const wide = setup({ w: 1280, h: 720 }); wide.view.camera(0.016); wide.view.render(1);
    expect(wide.view.labelRects).toHaveLength(data.map.labels.length);
    const phone = setup(); phone.view.camera(0.016); phone.view.render(1);
    expect(phone.view.labelRects.length).toBeLessThan(data.map.labels.length);
  });

  it('被點的人腳下有一圈；沒有被點就沒有', () => {
    const { view, ctx, park } = setup();
    for (let i = 0; i < 4000 && !park.agents.some((a) => a.vis > 0.5); i++) park.tick(0.05);
    const a = park.agents.find((x) => x.vis > 0.5);
    view.camera(0.016); ctx.calls.length = 0; view.render(1);
    const ring = (c) => c[0] === 'ellipse' && c[3] === 24 && c[4] === 9.5;
    expect(ctx.calls.some(ring)).toBe(false);
    park.select(a);
    ctx.calls.length = 0; view.render(1);
    expect(ctx.calls.find(ring).slice(1, 3)).toEqual([a.x, a.y + 1]);
  });

  it('看園區時不畫角色模式的東西，也不要求 auto；有掛接點時才呼叫', () => {
    const seen = [];
    const { view } = setup({ opts: { under: (g, t) => seen.push(['under', t]), currentKey: () => 'beds', labels: (pill) => seen.push(['labels', typeof pill]) } });
    view.camera(0.016); view.render(2);
    expect(seen.map((s) => s[0])).toEqual(['under', 'labels']);
    expect(seen[0][1]).toBe(2);
  });

  it('currentKey 指到的招牌用深綠底，其他是淡色', () => {
    const { view, ctx } = setup({ w: 1280, h: 720, opts: { currentKey: () => 'beds' } });
    view.camera(0.016); view.render(1);
    const name = (k) => data.map.labels.find((l) => l.key === k).name;
    // the fillStyle set for the text right before a label's fillText is its text colour; the pill colour comes before the rounded rect
    const bgOf = (text) => {
      const i = ctx.calls.findIndex((c) => c[0] === 'fillText' && c[1] === text);
      let j = i; while (j >= 0 && !(ctx.calls[j][0] === '=fillStyle' && ctx.calls[j + 1]?.[0] === 'beginPath')) j--;
      return ctx.calls[j][1];
    };
    expect(bgOf(name('beds'))).toBe('#2f6b3a');
    expect(bgOf(name('herb'))).toBe('rgba(251,246,233,.94)');
  });
});

describe('mapView camera', () => {
  it('寬螢幕看到整個園區（置中）；手機填滿高度', () => {
    const wide = setup({ w: 1280, h: 720 }); wide.view.camera(0.016);
    expect(wide.view.cam.s).toBeCloseTo(720 / 1300, 3); expect(wide.view.cam.x).toBe(650);
    const phone = setup(); phone.view.camera(0.016);
    expect(phone.view.cam.s).toBeCloseTo(844 / 1300, 3);
  });

  it('角色模式的鏡頭資料由 cameraRole 掛接點提供；減少動態效果時一格就到位', () => {
    const target = { x: 900, y: 900 };
    const eased = setup({ opts: { cameraRole: () => ({ target, cover: 0, sheetWidth: 0 }) } });
    eased.park.state.mode = 'role';
    eased.view.camera(0.016);
    expect(eased.view.cam.x).toBeLessThan(900);
    const still = setup({ opts: { cameraRole: () => ({ target, cover: 0, sheetWidth: 0 }), reduceMotion: () => true } });
    still.park.state.mode = 'role';
    still.view.camera(0.016);
    expect(still.view.cam.x).toBeCloseTo(900, 5);
  });

  it('看園區模式不會去問 cameraRole', () => {
    let asked = 0;
    const { view } = setup({ opts: { cameraRole: () => { asked++; return {}; } } });
    view.camera(0.016);
    expect(asked).toBe(0);
  });
});
