// The welcome: three pages on one card. The first says what the park hopes to be; the other two, how it runs and how to
// look around, are there for whoever wants them. It opens by itself the first time on a device (the caller decides that);
// afterwards it opens from the link on the role list. All the words come from data.intro.
import { $, el } from './dom.js';
import { portrait } from './character.js';
import { fill } from '../engine/text.js';

// The two pictures of the comparison on the first page: a straight line, and a circle (copied from the prototype).
const SHAPES = {
  line: '<svg viewBox="0 0 48 48" aria-hidden="true"><g fill="none" stroke="#8a8f7c" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 24h31"/><path d="M29 14l10 10-10 10"/></g></svg>',
  circle: '<svg viewBox="0 0 48 48" aria-hidden="true"><g fill="none" stroke="#2f6b3a" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"><path d="M32 10.9A15 15 0 1 1 16.5 11"/><path d="M11.5 7.5l8.5 2-3 8"/></g></svg>',
};

// A chain of steps; the arrows between them come from the stylesheet.
function chain(steps) {
  const b = el('b');
  for (const s of steps) b.append(el('span', 'step', s));
  return b;
}

// One page. Each part is drawn when the page has it, always in this order.
function buildPage(p, face) {
  const sec = el('section');
  if (p.hello) { const row = el('div', 'hello'); for (const id of p.hello) row.append(face(id, 46)); sec.append(row); }
  sec.append(el('h2', '', p.title));
  for (const l of p.lead ?? []) sec.append(el('p', 'lead', l.text));
  if (p.flow) {
    const box = el('div', 'flow');
    for (const r of p.flow) {
      if (!SHAPES[r.shape]) throw new Error('the welcome names an unknown shape: ' + r.shape);
      const row = el('div', r.shape === 'circle' ? 'flow-row now' : 'flow-row');
      row.innerHTML = SHAPES[r.shape];                            // a fixed picture from this file, never data
      row.append(el('small', '', r.text), chain(r.steps));
      box.append(row);
    }
    sec.append(box);
  }
  if (p.tip) { const tip = el('p', 'why tap-tip'); tip.append(el('b', '', p.tip.label), p.tip.text); sec.append(tip); }
  if (p.loops) {
    const box = el('div', 'loops');
    for (const l of p.loops) {
      const mark = el('i', l.color, l.mark), body = el('div');
      mark.style.background = 'var(--' + l.color + ')';
      if (l.faces) {
        const faces = el('div', 'faces');
        for (const f of l.faces) { const s = el('span'); s.append(face(f.who, 34), f.name); faces.append(s); }
        body.append(faces);
      } else body.append(chain(l.steps));
      if (l.text) body.append(el('p', '', l.text));
      const row = el('div', 'loop'); row.append(mark, body); box.append(row);
    }
    sec.append(box);
  }
  if (p.ways) {
    const list = el('ul', 'ways');
    for (const w of p.ways) { const li = el('li'); li.append(el('b', '', w.title), w.text); list.append(li); }
    sec.append(list);
  }
  if (p.fine) sec.append(el('p', 'fine', p.fine.text));
  return sec;
}

// record: the visitor's record; closing marks the welcome as seen (the caller saves it in onClose).
export function createIntro(data, record, { onClose } = {}) {
  const intro = data.intro, B = intro.buttons, root = $('intro');
  const looks = new Map(data.people.map((p) => [p.id, p.look]));
  const face = (id, px) => {
    if (!looks.has(id)) throw new Error('the welcome names an unknown person: ' + id);
    return portrait(looks.get(id), 'happy', px);
  };

  const panel = el('div', 'panel'), top = el('div', 'in-top'), step = el('p', 'eyebrow'), skip = el('button', 'pop-close', B.skip);
  panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', intro.label);
  step.id = 'in-step'; skip.id = 'in-skip';
  top.append(step, skip);
  const box = el('div', 'in-pages'); box.id = 'in-pages';
  const pages = intro.pages.map((p) => buildPage(p, face));
  box.append(...pages);
  const row = el('div', 'row in-row'), back = el('button', 'ghost'), next = el('button', 'primary');
  back.id = 'in-back'; next.id = 'in-next';
  row.append(back, next);
  panel.append(top, box, row);
  root.textContent = ''; root.append(panel); root.hidden = true;

  const last = pages.length - 1;
  let at = 0;

  // The pages share one grid cell, so the card keeps the height of the tallest; the others are hidden and cannot be reached.
  function page(i) {
    at = Math.max(0, Math.min(last, i));
    pages.forEach((p, k) => { p.setAttribute('aria-hidden', k === at ? 'false' : 'true'); p.toggleAttribute('inert', k !== at); });
    step.textContent = fill(intro.step, { s: intro.pages[at].name, i: at + 1, t: pages.length });
    skip.hidden = at === 0;
    back.textContent = at === 0 ? B.start : B.back;
    next.textContent = at === 0 ? B.how : at === last ? B.pick : B.next;
    root.scrollTop = 0;
  }

  // Opens on the first page. If a control had the focus (it is about to vanish), the focus moves here; on a fresh page
  // nothing is focused, and nothing is taken.
  function open() {
    const had = document.activeElement;
    page(0);
    root.hidden = false;
    if (had && had !== document.body && !root.contains(had)) next.focus();
  }

  // Closing for any reason means the welcome has been seen. A second press on a closed card does nothing.
  function close() {
    if (root.hidden) return;
    root.hidden = true;
    record.intro = true;
    onClose?.();
  }

  back.addEventListener('click', () => { if (root.hidden) return; if (at === 0) close(); else page(at - 1); });
  next.addEventListener('click', () => { if (root.hidden) return; if (at === last) close(); else page(at + 1); });
  skip.addEventListener('click', close);

  return { open, close };
}
