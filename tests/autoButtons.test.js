// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readData } from './helpers/data.js';
import { mountPage } from './helpers/page.js';
import { installFakeCanvas } from './helpers/canvas.js';
import { pageRunner, memoryStorage } from './helpers/boot.js';
import { createHud } from '../js/ui/hud.js';
import { createPark } from '../js/engine/park.js';
import { createAuto } from '../js/engine/auto.js';

const d = readData();
const $ = (id) => document.getElementById(id);
const ui = d.ui.auto;

describe('右上角的自動與速度鈕', () => {
  let restore, park, auto, hud;
  beforeEach(() => { mountPage(); restore = installFakeCanvas(); park = createPark(d); auto = createAuto(park); hud = createHud(park, auto, d, {}); });
  afterEach(() => restore());

  it('速度鈕在 1× 與 1.5× 之間切換，1.5× 時有 on；自動關掉就藏起來', () => {
    park.beginRole('farm'); auto.set(true); hud.update();
    const sp = $('speed-btn');
    expect(sp.hidden).toBe(false);
    expect(sp.textContent).toBe('1×'); expect(sp.classList.contains('on')).toBe(false);
    expect(sp.getAttribute('aria-label')).toBe('自動模式的速度：1 倍'); expect(sp.title).toBe(ui.speedTitle);
    sp.click();
    expect(auto.speed).toBe(1.5);
    expect(sp.textContent).toBe('1.5×'); expect(sp.classList.contains('on')).toBe(true);
    expect(sp.getAttribute('aria-label')).toBe('自動模式的速度：1.5 倍');
    sp.click();
    expect(auto.speed).toBe(1); expect(sp.textContent).toBe('1×'); expect(sp.classList.contains('on')).toBe(false);
    $('auto-btn').click();
    expect(auto.on).toBe(false); expect(sp.hidden).toBe(true);
    hud.update(); expect(sp.hidden).toBe(true);
  });

  it('自動鈕：開關、字、on 與 aria-pressed 跟著 auto；按完焦點回到地圖', () => {
    park.beginRole('vol'); hud.update();
    const b = $('auto-btn');
    expect(b.hidden).toBe(false);
    expect(b.textContent).toBe(ui.off); expect(b.classList.contains('on')).toBe(false); expect(b.getAttribute('aria-pressed')).toBe('false');
    b.focus(); b.click();
    expect(auto.on).toBe(true);
    expect(b.textContent).toBe(ui.on); expect(b.classList.contains('on')).toBe(true); expect(b.getAttribute('aria-pressed')).toBe('true');
    expect(document.activeElement).toBe($('map'));
    // the state can also change elsewhere (the role list); the next frame shows it
    auto.set(false); hud.update();
    expect(b.textContent).toBe(ui.off); expect(b.getAttribute('aria-pressed')).toBe('false'); expect($('speed-btn').hidden).toBe(true);
  });

  it('看園區模式沒有自動與速度兩顆鈕', () => {
    park.beginWatch(); auto.set(true); hud.update();
    expect($('auto-btn').hidden).toBe(true); expect($('speed-btn').hidden).toBe(true);
    park.beginRole('shop'); hud.update();
    expect($('auto-btn').hidden).toBe(false); expect($('speed-btn').hidden).toBe(false);
    park.beginWatch(); hud.update();
    expect($('auto-btn').hidden).toBe(true); expect($('speed-btn').hidden).toBe(true);
  });
});

describe('自動模式接到真的頁面', () => {
  let restore, page;
  beforeEach(() => { mountPage(); restore = installFakeCanvas(); page = pageRunner(); });
  afterEach(() => { page.stop(); restore(); });
  const seen = () => memoryStorage({ intro: true, tried: {}, done: {} });

  it('清單上的開關和右上角的鈕是同一個狀態', async () => {
    const r = await page.open({ storage: seen() });
    $('auto-box').click();
    expect(r.auto.on).toBe(true);
    $('role-work').click(); page.frame();
    expect($('auto-btn').hidden).toBe(false); expect($('auto-btn').textContent).toBe(ui.on); expect($('speed-btn').hidden).toBe(false);
    $('auto-btn').click();
    expect(r.auto.on).toBe(false);
    $('menu-btn').click();
    expect($('auto-box').checked).toBe(false);
    $('auto-box').click();
    $('role-work').click(); page.frame();
    expect($('auto-btn').textContent).toBe(ui.on); expect($('auto-btn').getAttribute('aria-pressed')).toBe('true');
  });

  it('1.5× 的意思：有字要讀的部分 1.5 倍，走路與時鐘 2 倍；1× 時都照常', async () => {
    const r = await page.open({ storage: seen() });
    $('auto-box').click(); $('role-farm').click(); page.frame(); page.frame();
    const st = r.park.state, reads = [], step = r.auto.step;
    r.auto.step = (dt) => { reads.push(dt); step(dt); };              // what auto mode is handed each frame for its reading pauses
    const frameOnce = () => { const c = st.clock; page.frame(16); return { clock: st.clock - c, read: reads.at(-1) }; };
    const normal = frameOnce();
    page.frame(); $('speed-btn').click();
    const fast = frameOnce();
    expect(normal.clock).toBeGreaterThan(0); expect(normal.read).toBeCloseTo(0.016, 6);
    expect(fast.clock / normal.clock).toBeCloseTo(2, 5);
    expect(fast.read / normal.read).toBeCloseTo(1.5, 5);
  });

  it('看園區時沒有自動與速度鈕，就算自動模式開著', async () => {
    const r = await page.open({ storage: seen() });
    $('auto-box').click(); $('watch-btn').click(); page.frame();
    expect(r.auto.on).toBe(true);
    expect($('auto-btn').hidden).toBe(true); expect($('speed-btn').hidden).toBe(true); expect($('menu-btn').hidden).toBe(true);
  });
});
