// The close-up card for a job: place, title, the stage drawn from the scene's view(), the status line,
// then the explanation and the "next" button once the scene is done. The scenes themselves live in the engine;
// this only draws what view() says and sends presses back to park.press().
import { $, setText } from './dom.js';
import { portrait } from './character.js';
import { buildStage, setProgress } from './sceneParts.js';
import { fill } from '../engine/text.js';

// onEnd(): called once when the last job of the day is finished (by the visitor or by auto mode).
// raf(cb): runs cb on the next animation frame (the page's requestAnimationFrame; the test's own in tests).
export function createSceneView(park, auto, data, { onEnd, raf = (cb) => requestAnimationFrame(cb) } = {}) {
  const ui = data.ui, looks = new Map(data.people.map((p) => [p.id, p.look]));
  const sheet = $('sheet'), card = sheet.firstElementChild, stage = $('sh-stage'), why = $('sh-why'), next = $('sh-next'), status = $('sh-status'), how = $('sh-how');
  let cur = null, key = '', hitEl = null, endRun = -1, nextLabel = '', drawnPart = null;

  const face = (id, mood, px, carry, sit) => {
    if (!looks.has(id)) throw new Error('scene names an unknown person: ' + id);
    return portrait(looks.get(id), mood, px, carry, sit);
  };

  const enabled = () => [...stage.querySelectorAll('[data-id]:not([disabled])')];

  // The frame round the control that auto mode is about to press.
  function markTarget() {
    const t = auto.target;
    const found = t ? [...stage.querySelectorAll('[data-id]')].find((b) => b.dataset.id === t) ?? null : null;
    if (found === hitEl) return;
    if (hitEl) hitEl.classList.remove('auto-hit');
    hitEl = found;
    if (found) { found.classList.add('auto-hit'); if (found.scrollIntoView) found.scrollIntoView({ block: 'nearest' }); }
  }

  // The classes of each control on the stage now, by id (auto mode's frame left out: markTarget looks after it).
  const classesById = () => new Map([...stage.querySelectorAll('[data-id]')].map((b) => [b.dataset.id, [...b.classList].filter((c) => c !== 'auto-hit')]));

  // The stage is drawn anew after every change, so a control whose classes changed (a bunch picked: gone; a line ticked:
  // on) would never show its CSS transition. Such a control starts with the classes of the one it replaces and gets its
  // own on the next frame. Only within the same part of the scene; a control with nothing before it is drawn as it is.
  // Under reduced motion the stylesheet turns these transitions off, as before.
  function replay(before) {
    const moves = [];
    for (const b of stage.querySelectorAll('[data-id]')) {
      const old = before.get(b.dataset.id);
      if (!old) continue;
      const add = [...b.classList].filter((c) => !old.includes(c)), drop = old.filter((c) => !b.classList.contains(c));
      if (!add.length && !drop.length) continue;
      b.classList.remove(...add); b.classList.add(...drop);
      moves.push({ b, add, drop });
    }
    if (!moves.length) return;
    for (const { b } of moves) void getComputedStyle(b).opacity;       // the old look is worked out now, so there is something to move from
    raf(() => { for (const { b, add, drop } of moves) { b.classList.remove(...drop); b.classList.add(...add); } });
  }

  function render(v, controls) {
    const was = document.activeElement, keepId = was && stage.contains(was) ? was.dataset.id : null;
    const before = v.part === drawnPart ? classesById() : null;
    const env = {
      face,
      wait: [].concat(park.task.scene)[v.part].steps?.some((s) => s.wait) ?? false,
      btn(id, className) {
        const b = document.createElement('button');
        b.type = 'button'; b.className = className; b.dataset.id = id; b.disabled = !controls.includes(id);
        b.addEventListener('click', () => { if (b.disabled) return; park.press(id); update(); });
        return b;
      },
    };
    for (const b of stage.querySelectorAll('button')) b.disabled = true;       // a button from before this drawing can no longer be pressed
    stage.textContent = '';
    stage.append(...buildStage(v, env));
    drawnPart = v.part; hitEl = null;
    if (before) replay(before);
    if (keepId !== null) focusOn(keepId);
  }

  // Keyboard users keep their place: the same control if it can still be pressed, else the first one that can.
  function focusOn(id) {
    const list = enabled();
    (list.find((b) => b.dataset.id === id) ?? list[0])?.focus();
  }

  function open(scene) {
    cur = scene; key = ''; hitEl = null; drawnPart = null;
    const task = park.task, last = park.state.ti === park.day.tasks.length - 1;
    nextLabel = last ? ui.scene.last : ui.scene.next;
    setText($('sh-place'), task.placeName); setText($('sh-title'), task.head); setText(status, '');
    why.hidden = true; next.hidden = true; setText(next, nextLabel);
    card.scrollTop = 0; sheet.hidden = false;
  }

  function close() {
    cur = null; key = ''; hitEl = null; drawnPart = null; stage.textContent = ''; sheet.hidden = true;
  }

  function refresh(fresh) {
    const task = park.task, v = cur.view(), controls = cur.controls();
    const sheetHadFocus = card.contains(document.activeElement);
    const k = JSON.stringify([{ ...v, progress: v.progress == null ? null : 0 }, controls]);       // progress moves every frame; it must not redraw the stage
    if (k !== key) {
      key = k; render(v, controls);
      const a = document.activeElement;
      if (fresh && (!a || a === document.body || $('task').contains(a))) enabled()[0]?.focus();
    }
    setProgress(stage, v.progress);
    setText(status, v.status);
    setText(how, task.how ?? ''); how.hidden = !task.how || v.hideHow;
    markTarget();
    if (cur.done && why.hidden) {
      setText(why, task.why.text); why.hidden = false; next.hidden = false;
      if (sheetHadFocus && !card.contains(document.activeElement)) next.focus();
      card.scrollTop = card.scrollHeight;
      if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => { card.scrollTop = card.scrollHeight; });
    }
    setText(next, auto.reading ? fill(ui.scene.countdown, { s: nextLabel, n: Math.max(1, Math.ceil(auto.countdown)) }) : nextLabel);
  }

  // Called every frame: opens, closes and redraws only when something changed.
  function update() {
    const st = park.state, scene = st.mode === 'role' ? st.scene : null;
    let fresh = false;
    if (scene !== cur) { if (cur) close(); if (scene) { open(scene); fresh = true; } }
    if (cur) refresh(fresh);
    if (st.mode === 'end' && endRun !== st.run) { endRun = st.run; onEnd?.(); }
  }

  next.addEventListener('click', () => {
    const r = park.finishTask();
    if (r === null) return;
    update();
    if (r === 'next') $('map')?.focus();
  });

  return { update };
}
