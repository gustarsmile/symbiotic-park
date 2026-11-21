// The cards laid over the map: the clock, the card at the bottom, and the explanation of a person or a signboard.
// This task only covers watching; the role's job card and the auto buttons plug in at the marked places.
import { $, setText } from './dom.js';
import { portrait } from './character.js';
import { clockParts } from '../engine/time.js';

// hooks: { onMenu() } what the card's button does while watching (it opens the role list; not built yet).
export function createHud(park, auto, data, record, hooks = {}) {
  void auto; void record;                         // the auto buttons and the played marks belong to the role mode
  const ui = data.ui;

  // These stay hidden until the role mode brings them.
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
  $('task-go').addEventListener('click', () => { if (park.state.mode === 'watch') hooks.onMenu?.(); });

  function update() {
    const st = park.state;
    if (st.mode !== 'watch' && st.mode !== 'role') return;
    const p = clockParts(st.clock);
    setText($('clock-t'), ui.period[p.period] + ' ' + p.h12 + ':' + String(p.mm).padStart(2, '0'));
    $('clock').classList.toggle('ff', !!st.ff);
    if (st.mode === 'watch') {
      setText($('clock-s'), ui.watch.clock); setText($('task-step'), ui.watch.step); setText($('task-title'), ui.watch.title); setText($('task-note'), ui.watch.note);
      setText($('task-go'), ui.watch.go); $('task-go').disabled = false; $('task-go').hidden = false;
      return;
    }
    // role mode: the job card, the auto buttons and the speed button are filled in here by the next task
  }

  return { update, showInfo, hideInfo, showPerson, showPlace };
}
