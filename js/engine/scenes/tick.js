import { fill } from '../text.js';
import { accepted, rejected, indexOf, textOf } from './util.js';

// A short list; tap each line to put it up. No wrong presses.
export function create(spec) {
  const items = spec.items;
  const on = items.map(() => false);
  let n = 0;
  const open = () => items.flatMap((_, i) => (on[i] ? [] : ['i' + i]));
  return {
    view() {
      return {
        type: 'tick',
        status: fill(spec.count, { n, t: items.length }),
        tip: null,
        who: spec.who ?? null,
        say: spec.say ?? null,
        board: Boolean(spec.board),
        items: items.map((it, i) => ({ id: 'i' + i, label: textOf(it), on: on[i] })),
      };
    },
    controls: open,
    press(id) {
      if (!open().includes(id)) return rejected();
      on[indexOf(id)] = true; n++;
      return accepted();
    },
    auto() { return open()[0] ?? null; },
    advance() {},
    get done() { return n === items.length; },
  };
}
