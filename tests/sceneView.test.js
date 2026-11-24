// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createSceneView } from '../js/ui/sceneView.js';
import { createPark } from '../js/engine/park.js';
import { createAuto } from '../js/engine/auto.js';
import { fill } from '../js/engine/text.js';
import { mountPage } from './helpers/page.js';
import { installFakeCanvas } from './helpers/canvas.js';
import { readData } from './helpers/data.js';
import { openTask, ALL_TASKS } from './helpers/play.js';

let restore, d, park, auto, view, onEnd, stage, frames;
const $ = (id) => document.getElementById(id);
const roleAt = (role, i) => { park.beginRole(role, i); openTask(park); view.update(); };
const idsShown = () => [...stage.querySelectorAll('[data-id]:not([disabled])')].map((b) => b.dataset.id);
const textNodes = (root) => { const out = [], w = document.createTreeWalker(root, 4); for (let n = w.nextNode(); n; n = w.nextNode()) out.push(n.nodeValue); return out; };
// The animation frames the card asks for, run by hand.
const flush = () => frames.splice(0).forEach((cb) => cb(0));
const pressAuto = () => { stage.querySelector(`[data-id="${park.state.scene.auto()}"]`).click(); view.update(); };
const finishScene = () => {
  for (let i = 0; i < 400 && !park.state.scene.done; i++) {
    const id = park.state.scene.auto();
    if (id === null) park.tick(0.1); else stage.querySelector(`[data-id="${id}"]`).click();
    view.update();
  }
};

beforeEach(() => {
  mountPage(); restore = installFakeCanvas(); d = readData(); park = createPark(d); auto = createAuto(park);
  onEnd = vi.fn(); frames = []; view = createSceneView(park, auto, d, { onEnd, raf: (cb) => frames.push(cb) }); stage = $('sh-stage');
});
afterEach(() => restore());

describe('sceneView', () => {
  it.each(ALL_TASKS.map(([r, i]) => [r, i + 1]))('%s 第 %i 件事：畫面上的按鈕跟可以按的 id 一一對應，照自動的走法按得完', (role, n) => {
    park.beginRole(role, n - 1); openTask(park); view.update();
    expect($('sheet').hidden).toBe(false);
    for (let i = 0; i < 400 && !park.state.scene.done; i++) {
      const ids = park.state.scene.controls();
      expect(idsShown().sort()).toEqual([...ids].sort());
      expect([...stage.querySelectorAll('[data-id]')].every((b) => b.tagName === 'BUTTON')).toBe(true);
      const id = park.state.scene.auto();
      if (id === null) park.tick(0.1); else stage.querySelector(`[data-id="${id}"]`).click();
      view.update();
    }
    expect(park.state.scene.done).toBe(true);
    expect(idsShown()).toEqual([]);
    expect($('sh-why').hidden).toBe(false); expect($('sh-why').textContent).toBe(park.task.why.text);
    expect($('sh-next').hidden).toBe(false);
    expect($('sh-next').textContent).toBe(n === d.days[role].tasks.length ? d.ui.scene.last : d.ui.scene.next);
  });

  it('卡片上有地點、標題、how；說明跟下一步在做完以前是藏著的', () => {
    roleAt('farm', 1);
    const t = park.task;
    expect($('sh-place').textContent).toBe(t.placeName); expect($('sh-title').textContent).toBe(t.head);
    expect($('sh-how').textContent).toBe(t.how); expect($('sh-how').hidden).toBe(false);
    expect($('sh-status').textContent).toBe(fill(t.scene[0].count, { n: 0, t: 6 }));
    expect($('sh-why').hidden).toBe(true); expect($('sh-next').hidden).toBe(true);
  });

  it('沒有 how 的那件事、以及 hideHow 的那一段，how 那一行藏起來', () => {
    roleAt('farm', 8);
    expect(park.task.how).toBeUndefined(); expect($('sh-how').hidden).toBe(true);
    roleAt('acct', 2);
    expect($('sh-how').hidden).toBe(false);
    while (park.state.scene.view().part === 0) pressAuto();
    expect($('sh-how').hidden).toBe(true);
    expect(stage.querySelector('.ledger')).not.toBeNull();
  });

  it('選錯只出現提示，可以再選', () => {
    roleAt('mentor', 0);
    const q = park.task.scene.q;
    const say = stage.querySelector('.bigcard').textContent;
    stage.querySelector('[data-id="bad"]').click(); view.update();
    expect(stage.querySelector('.tip').textContent).toBe(q[0].tip.text);
    expect(stage.querySelector('.bigcard').textContent).toBe(say);
    expect(idsShown().sort()).toEqual(['bad', 'good']);
    stage.querySelector('[data-id="good"]').click(); view.update();
    expect(stage.querySelector('.bigcard').textContent).toBe(q[1].say);
    expect(stage.querySelector('.tip').textContent).toBe('');
  });

  it('提示那一行一直在（沒有提示時是空的），版面不會跳', () => {
    roleAt('mentor', 0);
    expect(stage.querySelectorAll('.tip')).toHaveLength(1); expect(stage.querySelector('.tip').textContent).toBe('');
  });

  it('資料裡的 \\n 變成換行，不會把標籤當成 HTML', () => {
    roleAt('work', 3);
    expect(stage.querySelectorAll('.pick-btn br')).toHaveLength(2);
    expect(stage.querySelector('.pick-btn b').childNodes.length).toBe(3);
    for (const t of textNodes(stage)) expect(t).not.toContain('<');
  });

  it('資料文字當純文字：帶 < 的選項不會長出元素', () => {
    roleAt('mentor', 0);
    const orig = park.state.scene.view;
    park.state.scene.view = () => ({ ...orig(), say: '<img src=x>', options: [{ id: 'good', label: '<b>a</b>' }, { id: 'bad', label: 'b' }] });
    view.update();
    expect(stage.querySelector('img')).toBeNull();
    expect(stage.querySelector('.bigcard').textContent).toBe('<img src=x>');
    expect(stage.querySelector('[data-id="good"] b').textContent).toBe('<b>a</b>');
    expect(stage.querySelector('[data-id="good"] b b')).toBeNull();
  });

  it('自動模式讀解說時，按鈕上有倒數', () => {
    roleAt('farm', 0);
    finishScene();
    expect($('sh-next').textContent).toBe('好，下一件事');
    auto.reading = true; auto.countdown = 2.2; view.update();
    expect($('sh-next').textContent).toBe('好，下一件事（3）');
    auto.countdown = 0.1; view.update();
    expect($('sh-next').textContent).toBe('好，下一件事（1）');
    auto.reading = false; view.update();
    expect($('sh-next').textContent).toBe('好，下一件事');
  });

  it('自動模式框起來的那一顆有 auto-hit，只有那一顆，換目標就跟著換', () => {
    const spy = vi.fn(); const proto = globalThis.HTMLElement.prototype; const had = proto.scrollIntoView; proto.scrollIntoView = spy;
    try {
      roleAt('farm', 1);
      auto.target = 'i2'; view.update();
      const hits = () => [...stage.querySelectorAll('.auto-hit')].map((b) => b.dataset.id);
      expect(hits()).toEqual(['i2']); expect(spy).toHaveBeenCalledWith({ block: 'nearest' });
      auto.target = 'i3'; view.update();
      expect(hits()).toEqual(['i3']);
      stage.querySelector('[data-id="i3"]').click(); view.update();         // the stage is drawn again; the frame must not be lost or doubled
      auto.target = 'i4'; view.update();
      expect(hits()).toEqual(['i4']);
      auto.target = null; view.update();
      expect(hits()).toEqual([]);
    } finally { if (had) proto.scrollIntoView = had; else delete proto.scrollIntoView; }
  });

  it('連點同一顆：只算一次（不管按的是舊的還是新的那一顆）', () => {
    roleAt('farm', 1);
    const first = stage.querySelector('[data-id="i0"]');
    first.click(); first.click();
    expect($('sh-status').textContent).toBe(fill(park.task.scene[0].count, { n: 1, t: 6 }));
    stage.querySelector('[data-id="i0"]').click();
    expect($('sh-status').textContent).toBe(fill(park.task.scene[0].count, { n: 1, t: 6 }));
    expect(park.state.scene.controls()).toHaveLength(5);
    expect(stage.querySelector('[data-id="i0"]').disabled).toBe(true);
  });

  it('重畫以後，舊的按鈕按不動', () => {
    roleAt('mentor', 0);
    const good = stage.querySelector('[data-id="good"]');
    stage.querySelector('[data-id="bad"]').click();
    expect(good.disabled).toBe(true);
  });

  it('畫面沒變就不重畫（按到一半的鈕不會被換掉）', () => {
    roleAt('farm', 1);
    const b = stage.querySelector('[data-id="i1"]');
    view.update(); view.update();
    expect(stage.querySelector('[data-id="i1"]')).toBe(b);
  });

  // The stage is drawn anew after every press. For a CSS transition to run, a control whose classes changed first shows
  // the classes of the one it replaces, and gets its own a frame later.
  it('採收：按掉的那把先保留原本的樣子，下一格才加上 gone（掉下去的轉場跑得出來）；其他幾把不動、不等', () => {
    roleAt('farm', 1);
    expect(frames).toHaveLength(0);                                     // opening the card: nothing before it, nothing delayed
    const b0 = stage.querySelector('[data-id="i0"]');
    expect(b0.className).toBe('it');
    b0.click();
    const n0 = stage.querySelector('[data-id="i0"]');
    expect(n0).not.toBe(b0); expect(n0.disabled).toBe(true);
    expect(n0.className).toBe('it');                                    // the old look first
    expect(frames).toHaveLength(1);
    flush();
    expect(n0.className).toBe('it gone');                               // then the new one
    expect(stage.querySelector('[data-id="i0"]')).toBe(n0);
    for (const k of [1, 2, 3, 4, 5]) expect(stage.querySelector(`[data-id="i${k}"]`).className).toBe('it');
    // a press while the frame is still to come starts again from what is on screen
    stage.querySelector('[data-id="i1"]').click(); stage.querySelector('[data-id="i2"]').click();
    expect(['i0', 'i1', 'i2'].map((id) => stage.querySelector(`[data-id="${id}"]`).className)).toEqual(['it gone', 'it', 'it']);
    flush();
    expect(['i0', 'i1', 'i2'].map((id) => stage.querySelector(`[data-id="${id}"]`).className)).toEqual(['it gone', 'it gone', 'it gone']);
  });

  it('黑板打勾也一樣：先是原來的樣子，下一格才變 on；自動模式的框留著', () => {
    roleAt('mentor', 3);
    auto.target = 'i1'; view.update();
    stage.querySelector('[data-id="i0"]').click();
    const t0 = stage.querySelector('[data-id="i0"]'), t1 = stage.querySelector('[data-id="i1"]');
    expect(t0.classList.contains('on')).toBe(false); expect(t1.classList.contains('auto-hit')).toBe(true);
    flush();
    expect(t0.classList.contains('on')).toBe(true); expect(t0.classList.contains('chalk')).toBe(true);
    expect(t1.classList.contains('auto-hit')).toBe(true); expect(t1.classList.contains('on')).toBe(false);
  });

  it('按完換到下一段（新的按鈕）：照新的樣子直接畫，不延後', () => {
    roleAt('farm', 1);
    const orig = park.state.scene.view.bind(park.state.scene);
    park.state.scene.view = () => ({ ...orig(), part: 1, items: orig().items.map((it) => ({ ...it, pressed: true })) });   // same ids, another part
    view.update();
    expect([...stage.querySelectorAll('[data-id]')].every((b) => b.className === 'it gone')).toBe(true);
    expect(frames).toHaveLength(0);
    park.state.scene.view = orig;
    while (park.state.scene.view().part === 0) pressAuto();
    flush();
    expect(stage.querySelector('[data-id="step"]').className).toBe('step-btn');
    expect(frames).toHaveLength(0);
  });

  it('長條的寬度跟著 progress × width 走，不重畫、不靠 CSS 轉場', () => {
    roleAt('farm', 8);
    const rows = d.days.farm.tasks[8].scene.rows, wait = d.days.farm.tasks[8].scene.wait;
    const bars = [...stage.querySelectorAll('.track i')];
    expect(bars).toHaveLength(rows.length);
    park.tick(wait / 2); view.update();
    const p = park.state.scene.view().progress;
    expect(p).toBeGreaterThan(0.4); expect(p).toBeLessThan(0.7);
    bars.forEach((bar, k) => expect(parseFloat(bar.style.width)).toBeCloseTo(p * rows[k].width, 1));
    expect(stage.querySelector('.track i')).toBe(bars[0]);
    park.tick(wait); view.update();
    bars.forEach((bar, k) => expect(parseFloat(bar.style.width)).toBeCloseTo(rows[k].width, 5));
    expect(park.state.scene.done).toBe(true);
  });

  it('烘乾機的長條也是 progress × 100', () => {
    roleAt('farm', 4);
    stage.querySelector('[data-id="step"]').click();         // lay the tray
    expect(parseFloat(stage.querySelector('.bar i').style.width)).toBe(0);
    stage.querySelector('[data-id="step"]').click();         // start the dryer
    const btn = stage.querySelector('[data-id="step"]');
    expect(btn.disabled).toBe(true);
    park.tick(1.3); view.update();
    expect(parseFloat(stage.querySelector('.bar i').style.width)).toBeCloseTo(50, 0);
    expect(stage.querySelector('[data-id="step"]')).toBe(btn);
  });

  it('志工簽退：按之前 0 小時、長條是空的；按了以後 4.5 小時，長條跑滿', () => {
    roleAt('vol', 6);
    const sc = park.task.scene;
    expect(stage.querySelector('.lrow .num').textContent).toBe(sc.before);
    expect(parseFloat(stage.querySelector('.track i').style.width)).toBe(0);
    stage.querySelector('[data-id="go"]').click();
    expect(stage.querySelector('.lrow .num').textContent).toBe('4.5 小時');
    expect($('sh-status').textContent).toBe(sc.statusAfter);
    park.tick(sc.wait + 0.1); view.update();
    expect(parseFloat(stage.querySelector('.track i').style.width)).toBe(100);
    expect(park.state.scene.done).toBe(true);
  });

  it('用鍵盤按完一顆，焦點留在畫面上（下一顆能按的），不掉到頁面最上面', () => {
    roleAt('farm', 1);
    stage.querySelector('[data-id="i0"]').focus();
    expect(document.activeElement.dataset.id).toBe('i0');
    document.activeElement.click();
    expect(stage.contains(document.activeElement)).toBe(true);
    expect(document.activeElement.disabled).toBe(false);
    expect(document.activeElement.dataset.id).toBe('i1');
  });

  it('最後一顆按完，焦點移到「好，下一件事」', () => {
    roleAt('farm', 1);
    stage.querySelector('[data-id="i0"]').focus();
    while (!park.state.scene.done) { stage.querySelector(`[data-id="${park.state.scene.auto()}"]`).focus(); document.activeElement.click(); }
    expect(document.activeElement).toBe($('sh-next'));
  });

  it('不是畫面上的東西有焦點時，重畫不搶焦點', () => {
    roleAt('farm', 1);
    const other = document.createElement('input'); document.body.appendChild(other); other.focus();
    stage.querySelector('[data-id="i0"]').click();
    expect(document.activeElement).toBe(other);
  });

  it('按「好，下一件事」：換下一件，卡片收起來；最後一件做完叫 onEnd 一次', () => {
    roleAt('farm', 0);
    finishScene();
    $('sh-next').click();
    expect(park.state.ti).toBe(1); expect(park.state.scene).toBeNull(); expect($('sheet').hidden).toBe(true);
    expect(onEnd).not.toHaveBeenCalled();
    roleAt('farm', 8);
    finishScene();
    $('sh-next').click(); $('sh-next').click(); view.update(); view.update();
    expect(park.state.mode).toBe('end'); expect(onEnd).toHaveBeenCalledTimes(1);
    expect($('sheet').hidden).toBe(true);
  });

  it('電腦自己做完最後一件（不是按鈕）也會叫 onEnd，而且只叫一次', () => {
    roleAt('vol', 6);
    while (!park.state.scene.done) { const id = park.state.scene.auto(); if (id === null) park.tick(0.1); else park.press(id); }
    expect(park.finishTask()).toBe('end');
    view.update(); view.update();
    expect(onEnd).toHaveBeenCalledTimes(1); expect($('sheet').hidden).toBe(true);
  });

  it('回到看園區：卡片收起來', () => {
    roleAt('farm', 0);
    park.beginWatch(); view.update();
    expect($('sheet').hidden).toBe(true);
  });

  it('分級那種有圖的分類：卡片是一個大圖，兩顆鈕帶圖示和計數', () => {
    roleAt('farm', 3);
    expect(stage.querySelector('.one svg')).not.toBeNull();
    const btns = [...stage.querySelectorAll('.pick-btn')];
    expect(btns).toHaveLength(2);
    btns.forEach((b) => { expect(b.querySelector('svg')).not.toBeNull(); expect(b.querySelector('.cnt').textContent).toBe('0'); });
  });

  it('分類做完，沒有 done 文字就把卡片藏起來；有的話顯示它', () => {
    roleAt('farm', 3);
    finishScene();
    expect(stage.querySelector('.one')).toBeNull();
    roleAt('vol', 0);
    finishScene();
    expect(stage.querySelector('.bigcard').textContent).toBe(park.task.scene.done);
  });

  it('交菜箱（櫃台）：排隊的人、箱子、對話；交一箱就多一句話', () => {
    roleAt('farm', 6);
    expect(stage.querySelectorAll('.queue .fam')).toHaveLength(3);
    expect(stage.querySelectorAll('.items .it')).toHaveLength(3);
    stage.querySelector('[data-id="i0"]').click();
    expect(stage.querySelector('.tip').textContent).toBe(park.task.scene.says[0]);
    expect(stage.querySelectorAll('.fam.got')).toHaveLength(1);
  });

  it('交菜箱（人臉）：點人臉；收回空箱一個一個出現', () => {
    roleAt('shop', 4);
    expect(stage.querySelectorAll('.facebtn')).toHaveLength(3);
    expect(stage.querySelectorAll('.items .it.still')).toHaveLength(0);
    stage.querySelector('[data-id="i1"]').click();
    expect(stage.querySelector('[data-id="i1"]').disabled).toBe(true);
    expect(stage.querySelectorAll('.items .it.still')).toHaveLength(1);
    expect(stage.querySelector('.tip').textContent).toBe(park.task.scene.says[1]);
  });

  it('罐子：錢幣一枚一枚少，滿了的罐子出現提示', () => {
    roleAt('acct', 5);
    expect(stage.querySelectorAll('.pile .coin')).toHaveLength(10);
    for (let i = 0; i < 5; i++) stage.querySelector('[data-id="j0"]').click();
    expect(stage.querySelectorAll('.pile .coin')).toHaveLength(5);
    expect(stage.querySelector('[data-id="j0"] .num').textContent).toBe('5');
    expect(stage.querySelector('[data-id="j0"]').textContent).toContain(park.task.scene.unit);
    stage.querySelector('[data-id="j0"]').click();
    expect(stage.querySelector('.tip').textContent).toBe(fill(park.task.scene.full.text, { s: '公積金', n: 5 }));
    expect(stage.querySelectorAll('.pile .coin')).toHaveLength(5);
  });

  it('茶要放三種才能試泡；放滿了，其他的灰掉，只剩「試泡一杯」', () => {
    roleAt('work', 2);
    expect(stage.querySelector('[data-id="go"]').disabled).toBe(true);
    for (const k of [0, 1, 2]) stage.querySelector(`[data-id="o${k}"]`).click();
    expect(stage.querySelector('.bigcard').textContent).toBe(fill(park.task.scene.chosen, { s: '香茅、薄荷、洛神' }));
    expect(idsShown()).toEqual(['go']);
    stage.querySelector('[data-id="go"]').click();
    expect(stage.querySelector('[data-id="go"]')).toBeNull();
    expect(stage.querySelector('.bigcard').textContent).toBe(fill(park.task.scene.result, { s: '香茅、薄荷、洛神' }));
  });

  it('排順序：排好的變成「1. …」的小標籤，排完整排選項收起來', () => {
    roleAt('learner', 4);
    const sc = park.task.scene;
    stage.querySelector('[data-id="s0"]').click();
    expect([...stage.querySelectorAll('.stepchip')].map((c) => c.textContent)).toEqual(['1. ' + sc.steps[0]]);
    finishScene();
    expect(stage.querySelectorAll('.stepchip')).toHaveLength(sc.steps.length);
    expect(stage.querySelector('.choose')).toBeNull();
  });

  it('黑板那一張用黑板的樣子；一般的清單不是', () => {
    roleAt('mentor', 3);
    const sc = park.task.scene;
    expect(sc.board).toBe(true);
    expect(stage.querySelectorAll('.tick.chalk')).toHaveLength(sc.items.length);
    roleAt('acct', 2);
    expect(stage.querySelectorAll('.tick')).toHaveLength(4);
    expect(stage.querySelectorAll('.tick.chalk')).toHaveLength(0);
    expect(stage.querySelector('.tick.on')).toBeNull();
    stage.querySelector('[data-id="i0"]').click(); flush();             // the new class comes a frame later (see the fall-away tests)
    expect(stage.querySelector('[data-id="i0"]').classList.contains('on')).toBe(true);
  });

  it('任何一個都對的問題：選了以後換成回覆，選項收起來', () => {
    roleAt('learner', 1);
    expect(stage.querySelectorAll('.choose.stack .pick-btn').length).toBeGreaterThan(1);
    stage.querySelector('[data-id="o0"]').click();
    expect(stage.querySelector('.choose')).toBeNull();
    expect(stage.querySelector('.bigcard').textContent).toBe(park.task.scene.opts[0].reply.text);
  });

  it('接手帳務第 3 件：四張貼完，換成「每 100 元」的長條圖，標題與備註都在', () => {
    roleAt('acct', 2);
    while (park.state.scene.view().part === 0) pressAuto();
    const sc = park.task.scene[1];
    expect(stage.querySelector('.bigcard').textContent).toBe(sc.title);
    expect([...stage.querySelectorAll('.lrow small')].map((s) => s.textContent)).toEqual(sc.rows.map((r) => r.note));
    expect(stage.querySelector('.split')).toBeNull();
    expect($('sh-status').textContent).toBe(sc.status);
  });

  it('農夫收工那張：盈餘怎麼分的三格都在', () => {
    roleAt('farm', 8);
    expect(stage.querySelectorAll('.split .chips span')).toHaveLength(3);
    expect(stage.querySelector('.split b').textContent).toBe(park.task.scene.split.title);
  });

  it('大門口的對話：導師的臉和他說的那一句，按鈕是你的回答；來源不畫出來', () => {
    roleAt('farm', 0);
    const sc = park.task.scene;
    const said = () => stage.querySelector('.ask .bigcard').textContent;
    expect(stage.querySelector('.ask canvas')).not.toBeNull(); expect(said()).toBe(sc.show.text);
    sc.steps.forEach((st, k) => {
      expect(stage.querySelector('[data-id="step"]').textContent).toBe(st.label);
      stage.querySelector('[data-id="step"]').click(); view.update();
      expect(said()).toBe(st.show.text);
      expect(stage.textContent).not.toContain(st.show.source);
      expect($('sh-why').hidden).toBe(k < sc.steps.length - 1);
    });
    expect(stage.querySelector('[data-id="step"]')).toBeNull();
    expect($('sh-why').textContent).toBe(park.task.why.text);
  });

  it('採收完換手機那一段（how 藏起來）；香草園割完換三區感測器，分錯有提示，做完那一句跟解說一起出現', () => {
    roleAt('farm', 1);
    while (park.state.scene.view().part === 0) pressAuto();
    const phone = park.task.scene[1];
    expect(stage.querySelector('.slot svg')).not.toBeNull(); expect($('sh-how').hidden).toBe(true); expect($('sh-status').textContent).toBe(phone.status);
    pressAuto();
    expect(stage.querySelector('.tip').textContent).toBe(phone.steps[0].show.note); expect($('sh-status').textContent).toBe(phone.steps[0].status);
    expect($('sh-why').hidden).toBe(false);
    roleAt('farm', 2);
    while (park.state.scene.view().part === 0) pressAuto();
    const water = park.task.scene[1];
    expect($('sh-how').hidden).toBe(false); expect($('sh-status').textContent).toBe(fill(water.count, { i: 1, t: 3 }));
    expect(stage.querySelector('.bigcard').textContent).toBe(water.items[0].label); expect(stage.querySelector('.one svg')).not.toBeNull();
    stage.querySelector('[data-id="c0"]').click(); view.update();                // the first zone is still wet: the valve does not open
    expect(stage.querySelector('.tip').textContent).toBe(water.tips[1].text); expect(stage.querySelector('.bigcard').textContent).toBe(water.items[0].label);
    finishScene();
    expect(stage.querySelector('.bigcard').textContent).toBe(water.done); expect($('sh-why').hidden).toBe(false);
  });
});
