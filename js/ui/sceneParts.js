// Draws the stage of a close-up card from a scene's view(): one small function per scene type.
// The layouts follow the prototype's close-ups, and its class names, so the stylesheet applies as it did there.
// Text from the data goes in as text, never as HTML; icons are trusted SVG strings from icons.js.
// env = { btn(id, className) -> <button data-id>, face(personId, mood, px, carry, sit) -> <canvas>, wait: bool }
import { el, setText } from './dom.js';
import { icon } from './icons.js';

const withIcon = (node, name, arg) => { node.innerHTML = icon(name, arg); return node; };
const iconBox = (cls, name, arg) => withIcon(el('div', cls), name, arg);
const tip = (text) => el('p', 'tip', text ?? '');
const label = (text) => el('b', '', text);

// A person's face and what they say.
function ask(env, who, mood, say) {
  const top = el('div', 'ask');
  if (who) top.append(env.face(who, mood, 54));
  if (say !== null && say !== undefined) top.append(el('p', 'bigcard', say));
  return top;
}

// A row of big buttons with one line of text each.
function choose(env, options, cls, extra = '') {
  const row = el('div', 'choose' + extra);
  for (const o of options) { const b = env.btn(o.id, cls); b.append(label(o.label)); row.append(b); }
  return row;
}

const PARTS = {
  taps(v, env) {
    const row = el('div', 'items');
    for (const it of v.items) {
      const b = withIcon(env.btn(it.id, 'it'), it.icon);
      b.setAttribute('aria-label', it.aria);
      if (it.pressed) b.classList.add(v.gone ? 'gone' : 'cut');
      row.append(b);
    }
    return v.meter ? [row, iconBox('slot', v.meter.icon, v.meter.level)] : [row];
  },

  sort(v, env) {
    const out = [], top = ask(env, v.who, 'smile', v.card ? v.card.label ?? null : v.doneText);
    if (top.childNodes.length) out.push(top);
    if (v.card && v.card.icon) out.push(iconBox('one', v.card.icon));
    out.push(tip(v.tip));
    const row = el('div', 'choose');
    for (const c of v.cats) {
      const b = env.btn(c.id, c.icon ? 'pick-btn' : 'pick-btn plain wrap');
      if (c.icon) b.innerHTML = icon(c.icon);
      b.append(label(c.label));
      if (c.icon && v.counters) b.append(el('span', 'cnt', String(c.n)));
      row.append(b);
    }
    out.push(row);
    return out;
  },

  quiz(v, env) {
    return [ask(env, v.who, v.mood, v.say), tip(v.tip), choose(env, v.options, 'pick-btn plain wrap')];
  },

  order(v, env) {
    const done = el('div', 'steps');
    v.placed.forEach((text, i) => done.append(el('span', 'stepchip', (i + 1) + '. ' + text)));
    const out = [done, tip(v.tip)];
    if (v.options.length) out.push(choose(env, v.options, 'pick-btn plain'));
    return out;
  },

  tick(v, env) {
    const out = [];
    if (v.who) out.push(ask(env, v.who, 'smile', v.say));
    const list = el('div', 'ticks');
    for (const it of v.items) {
      const b = env.btn(it.id, 'tick' + (v.board ? ' chalk' : '') + (it.on ? ' on' : ''));
      b.append(el('i'), label(it.label)); list.append(b);
    }
    return out.concat(list);
  },

  any(v, env) {
    const out = [ask(env, v.who, v.mood, v.say)];
    if (v.options.length) out.push(choose(env, v.options, 'pick-btn plain wrap', ' stack'));
    return out;
  },

  // The bench (what is on it, and the dryer's bar), the tokens earned so far, and the one button.
  steps(v, env) {
    const out = [], s = v.show, bar = el('div', 'bar');
    let shown = null;
    if (s && s.icon) shown = iconBox('slot', s.icon);
    else if (s && s.note !== undefined) shown = tip(s.note);
    else if (s && s.people) {
      shown = el('div', 'diners');
      for (const p of s.people) { const d = el('div', 'diner'); d.append(env.face(p.id, s.mood ?? 'happy', 50, s.carry, s.sit), el('span', '', p.label)); shown.append(d); }
    } else if (s) shown = ask(env, s.who, s.mood ?? 'smile', s.text);
    const fill = el('i'); fill.dataset.w = '100'; bar.append(fill);
    if (env.wait) { const bench = el('div', 'bench'); if (shown) bench.append(shown); bench.append(bar); out.push(bench); } else if (shown) out.push(shown);
    if (v.tokens) { const row = el('div', 'items'); for (let i = 0; i < v.tokens.n; i++) row.append(iconBox('it still', v.tokens.icon)); out.push(row); }
    if (v.button) { const b = env.btn(v.button.id, 'step-btn'); setText(b, v.button.label); b.disabled = b.disabled || v.button.disabled; out.push(b); }
    return out;
  },

  handout(v, env) {
    const queue = el('div', 'queue'), out = [queue];
    const look = (k, served) => env.face(v.people[k].id, served ? 'happy' : 'smile', v.layout === 'faces' ? 60 : 58, served ? v.give ?? undefined : undefined);
    if (v.layout === 'faces') {
      v.people.forEach((p, k) => {
        const b = env.btn(v.items[k].id, 'facebtn');
        if (v.items[k].aria) b.setAttribute('aria-label', v.items[k].aria);
        b.append(look(k, p.served)); queue.append(b);
      });
    } else {
      v.people.forEach((p, k) => { const f = el('div', 'fam' + (p.served ? ' got' : '')); f.append(look(k, p.served)); queue.append(f); });
    }
    out.push(tip(v.bubble));
    const row = el('div', 'items');
    if (v.layout === 'faces') { for (let i = 0; i < v.returned; i++) row.append(iconBox('it still', v.back)); }
    else {
      for (const it of v.items) {
        const b = withIcon(env.btn(it.id, 'it' + (it.pressed ? ' gone' : '')), v.give);
        if (it.aria) b.setAttribute('aria-label', it.aria);
        row.append(b);
      }
    }
    return row.childNodes.length ? out.concat(row) : out;            // no empty row (the faces layout before any box comes back)
  },

  // Bars are drawn empty; the card sets each width from the engine's progress every frame (data-w is the full width in percent).
  ledger(v, env) {
    const out = [];
    if (v.title) out.push(el('p', 'bigcard', v.title));
    const box = el('div', 'ledger');
    v.rows.forEach((r, k) => {
      const row = el('div', 'lrow'), head = el('div', 'lhead'), track = el('div', 'track'), fillBar = el('i', r.color);
      fillBar.dataset.w = String(r.width); track.append(fillBar);
      head.append(label(r.label), el('span', 'num', k === 0 ? v.valueShown : r.value));
      row.append(head, track, el('small', '', r.note)); box.append(row);
    });
    out.push(box);
    if (v.split) {
      const split = el('div', 'split'), chips = el('div', 'chips');
      for (const c of v.split.chips) { const s = el('span', '', c.label); s.append(el('i', '', c.note)); chips.append(s); }
      split.append(label(v.split.title), chips); out.push(split);
    }
    if (v.button) { const b = env.btn(v.button.id, 'step-btn'); setText(b, v.button.label); out.push(b); }
    return out;
  },

  pick(v, env) {
    const out = [el('p', 'bigcard', v.text)];
    if (!v.button) return out;
    out.push(choose(env, v.options, 'pick-btn plain'));
    const b = env.btn(v.button.id, 'step-btn'); setText(b, v.button.label); b.disabled = b.disabled || v.button.disabled;
    return out.concat(b);
  },

  jars(v, env) {
    const pile = el('div', 'items pile');
    for (let i = 0; i < v.left; i++) pile.append(iconBox('it coin', 'coin'));
    pile.hidden = v.left === 0;
    const row = el('div', 'choose');
    for (const j of v.jars) {
      const b = env.btn(j.id, 'pick-btn plain wrap'), head = el('b'), n = el('span', 'num', String(j.got));
      head.append(j.label + ' ', n, v.unit ? ' ' + v.unit : '');
      b.append(head, el('small', '', j.note)); row.append(b);
    }
    return [pile, tip(v.tip), row];
  },
};

// The nodes for one view. An unknown type is an error, so a new scene type cannot silently draw nothing.
export function buildStage(v, env) {
  const part = PARTS[v.type];
  if (!part) throw new Error('no drawing for scene type: ' + v.type);
  return part(v, env);
}

// Sets the widths of the bars from progress (0 to 1). Called every frame, and does not rebuild anything.
export function setProgress(stage, progress) {
  for (const bar of stage.querySelectorAll('[data-w]')) bar.style.width = Math.round((progress ?? 0) * Number(bar.dataset.w) * 100) / 100 + '%';
}
