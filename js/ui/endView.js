// The end-of-day card: who you were, what you did, the closing line, and three ways to go on.
// No scores, no marks of any kind: only what was done.
import { $, el } from './dom.js';
import { portrait } from './character.js';
import { fill } from '../engine/text.js';

// handlers: { onWatch, onAgain, onMenu } (each optional)
export function showEnd(day, data, { onWatch, onAgain, onMenu } = {}) {
  const ui = data.ui.end, root = $('end');
  const who = data.people.find((p) => p.id === day.who);
  const panel = el('div', 'panel'), head = el('div', 'end-head'), face = el('span'), titles = el('div');
  panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-labelledby', 'end-title');
  face.append(portrait(who.look, 'happy', 60));
  const title = el('h2', '', ui.title); title.id = 'end-title';
  titles.append(el('p', 'eyebrow', day.name), title);
  head.append(face, titles);
  const did = el('ul', 'did');
  for (const t of day.did) did.append(el('li', '', t));
  const row = el('div', 'row'), button = (id, cls, text, handler) => {
    const b = el('button', cls, text); b.id = id; b.addEventListener('click', () => handler?.()); return b;
  };
  const watch = button('end-watch', 'primary', ui.watch, onWatch);
  row.append(watch, button('end-again', 'ghost', fill(ui.again, { s: day.name.slice(2) }), onAgain), button('end-menu', 'ghost', ui.menu, onMenu));
  panel.append(head, did, el('p', 'lead', day.line.text), row, el('p', 'fine', ui.fine));
  root.textContent = ''; root.append(panel); root.hidden = false;
  watch.focus();
}

export function hideEnd() {
  const root = $('end');
  root.hidden = true; root.textContent = '';
}
