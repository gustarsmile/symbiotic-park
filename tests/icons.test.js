import { describe, it, expect } from 'vitest';
import { readData } from './helpers/data.js';
import { eachKey } from './helpers/sourced.js';
import { ICON_NAMES, icon } from '../js/ui/icons.js';

const d = readData();

describe('icons', () => {
  it('每個圖示都畫得出來', () => { for (const n of ICON_NAMES) expect(icon(n, 2)).toMatch(/^<svg[\s\S]*<\/svg>$/); });
  it('資料裡用到的圖示名稱都存在', () => {
    const used = new Set();
    eachKey(d.days, ['icon', 'iconDone', 'token', 'give', 'back', 'meter'], (v) => used.add(v));
    expect(used.size).toBeGreaterThan(0);
    for (const n of used) expect(ICON_NAMES).toContain(n);
  });
  it('不認得的名稱會報錯，不是靜靜畫不出來', () => expect(() => icon('nope')).toThrow());
  it('鍋子的層數不同，畫出來的也不同', () => { expect(icon('pot', 0)).not.toBe(icon('pot', 5)); });
  it('多了手機與感測器：照現有的畫法（64 格、平塗、底下一個淡淡的影子），兩個畫得不一樣', () => {
    for (const n of ['phone', 'sensor']) {
      expect(ICON_NAMES).toContain(n);
      const s = icon(n);
      expect(s.startsWith('<svg viewBox="0 0 64 64" aria-hidden="true">')).toBe(true);
      expect(s).toContain('<ellipse cx="32" cy="56" rx="16" ry="4" fill="rgba(60,50,30,.18)"/>');
      expect(s).not.toMatch(/Gradient|filter|<image|<text/);
    }
    expect(icon('phone')).not.toBe(icon('sensor'));
    expect(ICON_NAMES).toHaveLength(22);
  });
});
