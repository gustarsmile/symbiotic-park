// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { showEnd, hideEnd } from '../js/ui/endView.js';
import { mountPage } from './helpers/page.js';
import { installFakeCanvas } from './helpers/canvas.js';
import { readData } from './helpers/data.js';

let restore, d;
const $ = (id) => document.getElementById(id);
beforeEach(() => { mountPage(); restore = installFakeCanvas(); d = readData(); });
afterEach(() => restore());

describe('endView', () => {
  it('結尾卡列出今天做的事與收尾的那一句，沒有分數', () => {
    showEnd(d.days.vol, d, {});
    expect([...document.querySelectorAll('#end .did li')].map((li) => li.textContent)).toEqual(d.days.vol.did);
    expect($('end').textContent).toContain(d.days.vol.line.text); expect($('end').textContent).toContain('再當一次志工');
    expect($('end').textContent).not.toMatch(/分數|得分|排名|第 \d+ 名|等級|徽章/);
  });

  it('每個角色：名稱、收工了、頭像、三顆按鈕；「再當一次」接的是名稱去掉前兩個字', () => {
    for (const day of Object.values(d.days)) {
      showEnd(day, d, {});
      expect(document.querySelector('#end .eyebrow').textContent).toBe(day.name);
      expect(document.querySelector('#end h2').textContent).toBe(d.ui.end.title);
      expect(document.querySelector('#end canvas')).not.toBeNull();
      expect($('end-again').textContent).toBe('再當一次' + day.name.slice(2));
      expect(document.querySelectorAll('#end button')).toHaveLength(3);
      expect([...document.querySelectorAll('#end .did li')].map((li) => li.textContent)).toEqual(day.did);
      expect($('end').textContent).not.toMatch(/分數|得分|排名|第 \d+ 名|等級|徽章/);
    }
  });

  it('小字說明數字是示意', () => {
    showEnd(d.days.farm, d, {});
    expect($('end').textContent).toContain('示意');
    expect(document.querySelector('#end .fine').textContent).toBe(d.ui.end.fine);
  });

  it('三顆按鈕各叫各的；沒給的不會出錯', () => {
    const cb = { onWatch: vi.fn(), onAgain: vi.fn(), onMenu: vi.fn() };
    showEnd(d.days.farm, d, cb);
    $('end-watch').click(); expect(cb.onWatch).toHaveBeenCalledTimes(1); expect(cb.onAgain).not.toHaveBeenCalled(); expect(cb.onMenu).not.toHaveBeenCalled();
    $('end-again').click(); expect(cb.onAgain).toHaveBeenCalledTimes(1); expect(cb.onMenu).not.toHaveBeenCalled();
    $('end-menu').click(); expect(cb.onMenu).toHaveBeenCalledTimes(1);
    expect(cb.onWatch).toHaveBeenCalledTimes(1);
    showEnd(d.days.farm, d, {});
    expect(() => { $('end-watch').click(); $('end-again').click(); $('end-menu').click(); }).not.toThrow();
  });

  it('顯示後焦點在第一顆鈕；再顯示一次不會疊上去；hideEnd 收起來並清空', () => {
    showEnd(d.days.farm, d, {});
    expect($('end').hidden).toBe(false); expect(document.activeElement).toBe($('end-watch'));
    showEnd(d.days.work, d, {});
    expect(document.querySelectorAll('#end .did')).toHaveLength(1);
    hideEnd();
    expect($('end').hidden).toBe(true); expect($('end').textContent).toBe('');
  });

  it('資料文字當純文字，不當 HTML', () => {
    const day = { ...d.days.farm, did: ['<img src=x>'], name: '一日<b>x</b>' };
    showEnd(day, d, {});
    expect(document.querySelector('#end img')).toBeNull(); expect(document.querySelector('#end b')).toBeNull();
    expect(document.querySelector('#end .did li').textContent).toBe('<img src=x>');
  });
});
