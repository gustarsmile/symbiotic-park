import { describe, it, expect } from 'vitest';
import { frameSeconds } from '../js/ui/loop.js';

describe('loop', () => {
  it('一格最多算 0.05 秒；第一格、時間倒退、不是數字都算 0', () => {
    expect(frameSeconds(1016, 1000)).toBeCloseTo(0.016);
    expect(frameSeconds(60000, 1000)).toBe(0.05);
    expect(frameSeconds(1000, 0)).toBe(0);
    expect(frameSeconds(900, 1000)).toBe(0);
    expect(frameSeconds(NaN, 1000)).toBe(0);
    expect(frameSeconds(1000, NaN)).toBe(0);
    expect(frameSeconds(1000, 1000)).toBe(0);
  });

  it('分頁在背景一小時再回來：這一格只算 0.05 秒，時鐘不會暴衝', () => {
    const hour = 60 * 60 * 1000;
    expect(frameSeconds(1000 + hour, 1000)).toBe(0.05);
  });
});
