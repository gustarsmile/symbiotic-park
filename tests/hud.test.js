// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createHud } from '../js/ui/hud.js';
import { createPark } from '../js/engine/park.js';
import { createAuto } from '../js/engine/auto.js';
import { mountPage } from './helpers/page.js';
import { installFakeCanvas } from './helpers/canvas.js';
import { readData } from './helpers/data.js';

let restore, data, park, auto;
const $ = (id) => document.getElementById(id);
beforeEach(() => { mountPage(); restore = installFakeCanvas(); data = readData(); park = createPark(data); park.beginWatch(); auto = createAuto(park); });
afterEach(() => restore());

describe('hud', () => {
  it('時鐘：時段字加上 12 小時制的時間，分鐘補到兩位', () => {
    const hud = createHud(park, auto, data, {});
    park.state.clock = 6 * 60 + 5; hud.update();
    expect($('clock-t').textContent).toBe(data.ui.period.dawn + ' 6:00');
    park.state.clock = 15 * 60 + 40; hud.update();
    expect($('clock-t').textContent).toBe(data.ui.period.afternoon + ' 3:40');
    park.state.clock = 19 * 60 + 30; hud.update();
    expect($('clock-t').textContent).toBe(data.ui.period.night + ' 7:30');
  });

  it('看園區的任務卡文字都來自資料，按鈕會叫 onMenu', () => {
    const onMenu = vi.fn();
    const hud = createHud(park, auto, data, {}, { onMenu });
    hud.update();
    expect($('task-go').textContent).toBe(data.ui.watch.go);
    expect($('task-go').disabled).toBe(false); expect($('task-go').hidden).toBe(false);
    $('task-go').click();
    expect(onMenu).toHaveBeenCalledTimes(1);
  });

  it('showInfo / hideInfo：第三行沒有字就收起來；有臉才放臉', () => {
    const hud = createHud(park, auto, data, {});
    const face = document.createElement('canvas');
    hud.showInfo('標題', '第二行', '第三行', face);
    expect($('who').hidden).toBe(false); expect($('who-face').firstChild).toBe(face);
    expect($('who-why').hidden).toBe(false);
    hud.showInfo('招牌', '介紹', '');
    expect($('who-why').hidden).toBe(true); expect($('who-face').firstChild).toBeNull();
    hud.hideInfo();
    expect($('who').hidden).toBe(true);
  });

  it('不在看園區、也不在角色模式（例如選單）時不改畫面上的字', () => {
    const hud = createHud(park, auto, data, {});
    park.state.mode = 'menu'; $('clock-t').textContent = 'keep';
    hud.update();
    expect($('clock-t').textContent).toBe('keep');
  });

  it('只做看園區：自動、加速、選單三顆鈕收著', () => {
    createHud(park, auto, data, {});
    for (const id of ['auto-btn', 'speed-btn', 'menu-btn']) expect($(id).hidden).toBe(true);
  });
});
