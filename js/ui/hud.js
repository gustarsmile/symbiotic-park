// The cards laid over the map: the clock, the card at the bottom, and the explanation of a person or a signboard.
// Watching has the card that opens the role list; playing a role has the job card (which job, take me there, start),
// and at the top right the auto-mode button, its speed button and the way back to the role list.
import { $, setText } from './dom.js';
import { portrait } from './character.js';
import { clockParts } from '../engine/time.js';
import { fill } from '../engine/text.js';

// hooks: { onMenu() } opens the role list: the card's button while watching, and the menu button while playing a role.
// auto: the one auto mode, shared with the switch on the role list.
export function createHud(park, auto, data, record, hooks = {}) {
  void record;                                    // the record is the role list's to show, not the hud's
  const ui = data.ui;
  const autoBtn = $('auto-btn'), speedBtn = $('speed-btn');

  // The top-right buttons appear only while playing a role.
  for (const id of ['menu-btn', 'auto-btn', 'speed-btn']) $(id).hidden = true;
  setText($('who-close'), ui.info.close);
  speedBtn.title = ui.auto.speedTitle;

  // Auto mode on or off, and how fast it goes. The speed button is there only while auto mode is on: 1x, or 1.5x
  // (the words go by one and a half times faster, the walking and the waiting twice; see pace in engine/auto.js).
  function showAuto() {
    const role = park.state.mode === 'role';
    autoBtn.hidden = !role; speedBtn.hidden = !role || !auto.on;
    if (!role) return;
    setText(autoBtn, auto.on ? ui.auto.on : ui.auto.off);
    autoBtn.classList.toggle('on', auto.on); autoBtn.setAttribute('aria-pressed', auto.on ? 'true' : 'false');
    setText(speedBtn, fill(ui.auto.speed, { n: auto.speed }));
    speedBtn.classList.toggle('on', auto.speed !== 1); speedBtn.setAttribute('aria-label', fill(ui.auto.speedLabel, { n: auto.speed }));
  }
  // Assigned, not added: a second boot after a failed one must not leave two handlers that toggle twice.
  autoBtn.onclick = () => { auto.set(!auto.on); showAuto(); $('map').focus(); };
  speedBtn.onclick = () => { auto.setSpeed(auto.speed === 1 ? 1.5 : 1); showAuto(); $('map').focus(); };

  function hideInfo() { $('who').hidden = true; }

  function showInfo(title, doing, why, faceCanvas) {
    setText($('who-name'), title); setText($('who-do'), doing); setText($('who-why'), why || ''); $('who-why').hidden = !why;
    const face = $('who-face'); face.textContent = ''; if (faceCanvas) face.appendChild(faceCanvas);
    $('who').hidden = false;
  }

  // A person: name and what they are, what they are doing (or heading for), and why the park arranges it so.
  function showPerson(a, wasMoving) {
    const id = data.identities[a.identity], act = data.acts[a.act];
    showInfo(
      a.name + ui.info.sep + id.name,
      (wasMoving ? ui.info.going : ui.info.now) + act.does.text + ui.info.end,
      id.why.text,
      portrait(a.look, 'happy', 46, a.carry, a.arrived && !!act.sit),
    );
  }

  // A signboard: its name and what the place is for.
  function showPlace(label) { showInfo(label.name, label.about.text, ''); }

  $('who-close').addEventListener('click', () => { park.release(); hideInfo(); });
  $('menu-btn').addEventListener('click', () => hooks.onMenu?.());
  $('task-go').addEventListener('click', () => {
    const st = park.state;
    if (st.mode === 'watch') hooks.onMenu?.();
    else if (st.mode === 'role') { if (st.near) park.openScene(); else park.walkTo(park.task.spot, true); }
  });

  function update() {
    const st = park.state;
    if (st.mode !== 'watch' && st.mode !== 'role') return;
    const p = clockParts(st.clock);
    setText($('clock-t'), ui.period[p.period] + ' ' + p.h12 + ':' + String(p.mm).padStart(2, '0'));
    $('clock').classList.toggle('ff', !!st.ff);
    $('menu-btn').hidden = st.mode !== 'role';
    showAuto();
    if (st.mode === 'watch') {
      $('task').hidden = false; setText($('clock-s'), ui.watch.clock); setText($('task-step'), ui.watch.step); setText($('task-title'), ui.watch.title); setText($('task-note'), ui.watch.note);
      setText($('task-go'), ui.watch.go); $('task-go').disabled = false; $('task-go').hidden = false;
      return;
    }
    // role mode: the job card
    setText($('menu-btn'), ui.menu);
    const day = park.day, t = park.task;
    if (st.scene) { $('task').hidden = true; if (!$('who').hidden) { park.release(); hideInfo(); } return; }       // the close-up has the floor
    $('task').hidden = false;
    setText($('clock-s'), st.ff ? ui.task.ffClock : day.name);
    setText($('task-step'), fill(ui.task.step, { i: st.ti + 1, t: day.tasks.length }));
    if (st.ff) {
      setText($('task-title'), fill(ui.task.waitTitle, { s: t.title })); setText($('task-note'), t.wait ?? ui.task.ffNote);
      $('task-go').hidden = true; return;
    }
    setText($('task-title'), t.title); setText($('task-note'), t.note); $('task-go').hidden = false;
    setText($('task-go'), st.near ? t.verb : st.guided ? ui.task.walking : ui.task.go);
    $('task-go').disabled = !st.near && st.guided;
  }

  return { update, showInfo, hideInfo, showPerson, showPlace };
}
