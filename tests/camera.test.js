import { describe, it, expect } from 'vitest';
import { createCamera, updateCamera } from '../js/ui/camera.js';

const world = { w: 1300, h: 1300, cx: 650, cy: 650 };
const V = { W: 1280, H: 720, dt: 0.016, mode: 'watch', target: null, cover: 0, sheetWidth: 0 };

describe('camera', () => {
  it('電腦 1280×720：看得到整個園區，置中', () => {
    const cam = createCamera(world);
    updateCamera(cam, V, world);
    expect(cam.s).toBeCloseTo(720 / 1300, 3);
    expect(cam.x).toBe(650);
    expect(cam.y).toBe(650);
  });

  it('手機 390×844：填滿高度，左右不會露出地圖外面', () => {
    const cam = createCamera(world);
    const v = { ...V, W: 390, H: 844, mode: 'role' };
    for (const tx of [0, 1300]) {
      for (let i = 0; i < 200; i++) updateCamera(cam, { ...v, target: { x: tx, y: 650 } }, world);
      const half = 390 / (2 * cam.s);
      expect(cam.s).toBeCloseTo(0.649, 3);
      expect(cam.x).toBeGreaterThanOrEqual(half - 1e-9);
      expect(cam.x).toBeLessThanOrEqual(1300 - half + 1e-9);
    }
  });

  it('很小、很寬、轉成橫的：數字都正常', () => {
    const cam = createCamera(world);
    for (const [W, H] of [[320, 480], [2560, 1080], [844, 390], [0, 0]]) {
      updateCamera(cam, { W, H, dt: 0.016, mode: 'role', target: { x: 100, y: 100 }, cover: 300, sheetWidth: 0 }, world);
      expect([cam.x, cam.y, cam.s].every(Number.isFinite)).toBe(true);
    }
  });

  it('W 或 H 不大於 0：不改任何東西', () => {
    const cam = createCamera(world);
    updateCamera(cam, V, world);
    const before = { ...cam };
    const r = updateCamera(cam, { ...V, W: 0, H: 0, dt: 1, mode: 'role', target: { x: 5, y: 5 } }, world);
    expect(cam).toEqual(before);
    expect(r.sheetPad).toBe(0);
  });

  it('寬螢幕開著特寫：地圖往左讓，特寫卡緊貼在園區右邊', () => {
    const cam = createCamera(world);
    let r;
    for (let i = 0; i < 400; i++) r = updateCamera(cam, { ...V, mode: 'role', target: { x: 650, y: 650 }, sheetWidth: 400 }, world);
    expect(cam.shift).toBeCloseTo((400 + 20) / 2 / cam.s, 1);
    expect(cam.x).toBeCloseTo(650 + cam.shift, 1);
    expect(r.sheetPad).toBeGreaterThanOrEqual(16);
    // park (1300 * s) + 20 + card, centred in the window: the pad is half of what is left over
    expect(r.sheetPad).toBe(Math.round((1280 - (1300 * cam.s + 20 + 400)) / 2));
  });

  it('特寫收起來：地圖回到中間，不留邊', () => {
    const cam = createCamera(world);
    for (let i = 0; i < 400; i++) updateCamera(cam, { ...V, sheetWidth: 400 }, world);
    let r;
    for (let i = 0; i < 400; i++) r = updateCamera(cam, { ...V, sheetWidth: 0 }, world);
    expect(cam.shift).toBeCloseTo(0, 3);
    expect(r.sheetPad).toBe(0);
  });

  it('手機不給特寫卡讓位（只有寬螢幕才並排）', () => {
    const cam = createCamera(world);
    const r = updateCamera(cam, { ...V, W: 390, H: 844, sheetWidth: 380 }, world);
    expect(r.sheetPad).toBe(0);
    expect(cam.shift).toBe(0);
  });

  it('角色模式：鏡頭慢慢追上玩家；拖過以後 3 秒內不追', () => {
    const cam = createCamera(world);
    const v = { ...V, W: 390, H: 844, mode: 'role', target: { x: 900, y: 900 } };
    updateCamera(cam, v, world);
    const first = cam.x;
    expect(first).toBeGreaterThan(650); expect(first).toBeLessThan(900);
    cam.free = 3; cam.x = 500;
    updateCamera(cam, { ...v, dt: 1 }, world);
    expect(cam.x).toBe(500); expect(cam.free).toBe(2);
    updateCamera(cam, { ...v, dt: 2 }, world);
    updateCamera(cam, { ...v, dt: 0.5 }, world);
    expect(cam.free).toBe(0);
    expect(cam.x).toBeGreaterThan(500);
  });

  it('看園區模式：不追任何人，拖動的位置留得住（只被邊界限制）', () => {
    const cam = createCamera(world);
    const v = { ...V, W: 390, H: 844, target: { x: 900, y: 900 } };
    updateCamera(cam, v, world);
    cam.x = 400;
    updateCamera(cam, v, world);
    expect(cam.x).toBe(400);
    cam.x = -50;
    updateCamera(cam, v, world);
    expect(cam.x).toBeCloseTo(390 / (2 * cam.s), 6);
  });

  it('減少動態效果：一格就到位，沒有緩動', () => {
    const cam = createCamera(world);
    updateCamera(cam, { ...V, W: 390, H: 844, mode: 'role', target: { x: 900, y: 900 }, instant: true }, world);
    expect(cam.x).toBeCloseTo(900, 6);
    const wide = createCamera(world);
    updateCamera(wide, { ...V, mode: 'role', target: { x: 650, y: 650 }, sheetWidth: 400, instant: true }, world);
    expect(wide.shift).toBeCloseTo((400 + 20) / 2 / wide.s, 6);
  });

  it('角色模式在手機上有任務卡蓋著：鏡頭往下讓，玩家不被卡片擋住', () => {
    const a = createCamera(world), b = createCamera(world);
    const v = { ...V, W: 390, H: 844, mode: 'role', target: { x: 650, y: 1000 }, instant: true };
    updateCamera(a, { ...v, cover: 0 }, world);
    updateCamera(b, { ...v, cover: 200 }, world);
    expect(b.y).toBeGreaterThan(a.y);
  });
});
