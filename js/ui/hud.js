// The cards laid over the map: the clock, the card at the bottom, and the explanation of a person or a signboard.
// Watching has the card that opens the role list; playing a role has the job card (which job, take me there, start).
// The auto buttons plug in at the marked place.
import { $, setText } from './dom.js';
import { portrait } from './character.js';
import { clockParts } from '../engine/time.js';
import { fill } from '../engine/text.js';

// hooks: { onMenu() } opens the role list: the card's button while watching, and the menu button while playing a role.
export function createHud(park, auto, data, record, hooks = {}) {
  void auto; void record;                         // the auto buttons and the played marks belong to the role mode
  const ui = data.ui;

  // The auto and speed buttons stay hidden until the auto mode brings them.
  for (const id of ['menu-btn', 'auto-btn', 'speed-btn']) $(id).hidden = true;
  setText($('who-close'), ui.info.close);

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
    if (st.mode === 'watch') {
      $('task').hidden = false; setText($('clock-s'), ui.watch.clock); setText($('task-step'), ui.watch.step); setText($('task-title'), ui.watch.title); setText($('task-note'), ui.watch.note);
      setText($('task-go'), ui.watch.go); $('task-go').disabled = false; $('task-go').hidden = false;
      return;
    }
    // role mode: the job card. (The auto buttons and the speed button are filled in here by the next task.)
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
