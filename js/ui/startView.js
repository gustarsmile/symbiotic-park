// The role list: the seven roles to take over for a day, the auto-mode switch, a way to just watch the park, and the
// link back to the welcome. A role the visitor has picked before is green; a role finished by hand shows how many times.
// The role the data suggests to begin with carries a small tag until it has been picked.
import { $, el, setText } from './dom.js';
import { portrait } from './character.js';
import { fill } from '../engine/text.js';
import { ROLE_IDS, markTried } from '../engine/store.js';

// record: the visitor's record (a role button marks its role as tried; the caller saves it in onRole).
// auto: the one auto mode, shared with the button at the top right.
export function createStart(data, record, auto, { onRole, onWatch, onAbout } = {}) {
  const ui = data.ui.start, root = $('start');
  const panel = el('div', 'panel');
  const about = el('button', 'more', ui.about); about.id = 'about-btn';

  const switchRow = el('label', 'auto-row'), box = el('input'), sw = el('span', 'sw'), words = el('span');
  switchRow.htmlFor = 'auto-box'; box.type = 'checkbox'; box.id = 'auto-box'; sw.setAttribute('aria-hidden', 'true');
  words.append(el('b', '', ui.autoTitle), el('small', '', ui.autoNote));
  switchRow.append(box, sw, words);

  // A click that lands after the list has gone (a double press) is ignored, so a role starts once.
  const whileShown = (fn) => () => { if (!root.hidden) fn(); };
  const roles = el('div', 'roles'), marks = new Map(), first = ui.first ?? null;
  roles.id = 'roles';
  for (const id of ROLE_IDS) {
    const day = data.days[id], who = data.people.find((p) => p.id === day.who);
    if (!who) throw new Error('the role list names an unknown person: ' + day.who);
    const b = el('button', 'role'), pic = el('span'), text = el('span', 'role-text'), name = el('b', '', day.name), done = el('i', 'role-done');
    b.id = 'role-' + id; b.dataset.role = id;
    pic.append(portrait(who.look, 'happy', 36, day.hold));
    const tag = first && first.role === id ? el('i', 'role-first', first.label) : null;
    name.append(done); if (tag) name.append(tag);
    text.append(name, el('small', '', day.desc));
    b.append(pic, text);
    b.addEventListener('click', whileShown(() => { markTried(record, id); onRole?.(id); }));
    roles.append(b); marks.set(id, { b, done, tag });
  }
  const watch = el('button', 'ghost', ui.watch); watch.id = 'watch-btn';
  roles.append(watch);
  const fine = el('p', 'fine', ui.fine.text); fine.id = 'start-fine';

  panel.append(el('p', 'eyebrow', ui.eyebrow), el('h1', '', ui.title), el('p', 'lead', ui.lead), about, switchRow, roles, fine);
  root.textContent = ''; root.append(panel); root.hidden = true;

  about.addEventListener('click', whileShown(() => onAbout?.()));
  watch.addEventListener('click', whileShown(() => onWatch?.()));
  box.addEventListener('change', () => auto.set(box.checked));

  // Green for every role picked before; "played n times" for a role finished by hand n times; the suggestion's tag only
  // while its role is not green yet. The switch shows auto mode.
  function refresh() {
    for (const [id, { b, done, tag }] of marks) {
      const n = record.done[id] ?? 0, played = n > 0 || !!record.tried[id];
      b.classList.toggle('played', played);
      setText(done, !played ? '' : n > 0 ? fill(ui.done, { n }) : ui.tried);
      if (tag) tag.hidden = played;
    }
    box.checked = auto.on;
  }

  // If a control had the focus (it is about to vanish), the focus moves to the first role; on a fresh page nothing is taken.
  function show() {
    const had = document.activeElement;
    refresh();
    root.hidden = false;
    if (had && had !== document.body && !root.contains(had)) marks.get(ROLE_IDS[0]).b.focus();
  }

  function hide() { root.hidden = true; }

  return { show, hide, refresh };
}
