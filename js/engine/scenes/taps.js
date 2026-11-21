import { fill } from '../text.js';
import { accepted, rejected, indexOf } from './util.js';

// Tap each thing once. No wrong presses.
export function create(spec) {
  const items = spec.items;
  const pressed = items.map(() => false);
  let n = 0;
  const open = () => items.flatMap((_, i) => (pressed[i] ? [] : ['i' + i]));
  return {
    view() {
      return {
        type: 'taps',
        status: fill(spec.count, { n, t: items.length }),
        tip: null,
        items: items.map((it, i) => ({ id: 'i' + i, icon: pressed[i] && it.iconDone !== undefined ? it.iconDone : it.icon, aria: it.aria, pressed: pressed[i] })),
        gone: Boolean(spec.gone),
        meter: spec.meter ? { icon: spec.meter, level: n } : null,
      };
    },
    controls: open,
    press(id) {
      if (!open().includes(id)) return rejected();
      pressed[indexOf(id)] = true; n++;
      return accepted();
    },
    auto() { return open()[0] ?? null; },
    advance() {},
    get done() { return n === items.length; },
  };
}
