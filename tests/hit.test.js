import { describe, it, expect } from 'vitest';
import { toWorld, agentAt, labelAt } from '../js/ui/hit.js';

const cam = { x: 650, y: 650, s: 1 };
const W = 800, H = 600;
// A person standing at world (x, y) is measured at the point 36 above their feet, which is on screen at:
const at = (a, c = cam) => [(a.x - c.x) * c.s + W / 2, (a.y - 36 - c.y) * c.s + H / 2];
const person = (o) => ({ x: 650, y: 650, vis: 1, player: false, ...o });

describe('hit', () => {
  it('toWorld 是畫面座標換回地圖座標', () => {
    expect(toWorld(cam, W, H, W / 2, H / 2)).toEqual([650, 650]);
    expect(toWorld({ x: 100, y: 200, s: 2 }, W, H, W / 2 + 20, H / 2 - 10)).toEqual([110, 195]);
  });

  it('點在人身上點得到；看不見的人和你自己點不到', () => {
    const a = person({ id: 'a' }), ghost = person({ id: 'g', x: 400, y: 400, vis: 0.4 }), me = person({ id: 'me', x: 900, y: 900, player: true });
    const agents = [a, ghost, me];
    expect(agentAt(agents, cam, W, H, ...at(a))).toBe(a);
    expect(agentAt(agents, cam, W, H, ...at(ghost))).toBeNull();
    expect(agentAt(agents, cam, W, H, ...at(me))).toBeNull();
    expect(agentAt(agents, cam, W, H, 5, 5)).toBeNull();
  });

  it('兩個人疊在一起，點到比較近的那個', () => {
    const a = person({ id: 'a', x: 650, y: 650 }), b = person({ id: 'b', x: 670, y: 650 });
    const [ax, ay] = at(a);
    expect(agentAt([a, b], cam, W, H, ax + 3, ay)).toBe(a);
    expect(agentAt([b, a], cam, W, H, ax + 3, ay)).toBe(a);
    expect(agentAt([a, b], cam, W, H, ax + 17, ay)).toBe(b);
  });

  it('半徑至少 36 個地圖單位；縮得很小時放大到手指點得到', () => {
    const a = person({ id: 'a' });
    const [ax, ay] = at(a);
    expect(agentAt([a], cam, W, H, ax + 35, ay)).toBe(a);
    expect(agentAt([a], cam, W, H, ax + 37, ay)).toBeNull();
    const far = { x: 650, y: 650, s: 0.4 };               // 22 / 0.4 = 55 units, which is 22 px
    const [fx, fy] = at(a, far);
    expect(agentAt([a], far, W, H, fx + 21, fy)).toBe(a);
    expect(agentAt([a], far, W, H, fx + 23, fy)).toBeNull();
  });

  it('招牌的範圍比看起來大一圈，手指好點', () => {
    // mapView hands out rects already grown around the pill (4 px at the sides, 5 above, 32 tall); here we test the hit rule itself
    const rects = [{ key: 'a', x: 100, y: 50, w: 80, h: 32 }, { key: 'b', x: 400, y: 300, w: 60, h: 32 }];
    expect(labelAt(rects, 140, 66)).toBe(rects[0]);
    expect(labelAt(rects, 100, 50)).toBe(rects[0]);
    expect(labelAt(rects, 180, 82)).toBe(rects[0]);
    expect(labelAt(rects, 181, 66)).toBeNull();
    expect(labelAt(rects, 430, 310)).toBe(rects[1]);
    expect(labelAt([], 1, 1)).toBeNull();
  });
});
