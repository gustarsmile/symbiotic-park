import { fill } from '../text.js';
import { accepted, rejected, wrong, indexOf, textOf } from './util.js';

// Put coins into jars; a jar already at its cap refuses the coin.
export function create(spec) {
  const jars = spec.jars;
  const got = jars.map(() => 0);
  let left = spec.coins, tip = null;
  const open = () => (left > 0 ? jars.map((_, k) => 'j' + k) : []);
  return {
    view() {
      return {
        type: 'jars',
        status: fill(spec.count, { n: spec.coins - left, t: spec.coins }),
        tip,
        left,
        coins: spec.coins,
        jars: jars.map((j, k) => ({ id: 'j' + k, label: j.label, note: j.note, got: got[k] })),
      };
    },
    controls: open,
    press(id) {
      if (!open().includes(id)) return rejected();
      const k = indexOf(id);
      if (got[k] >= jars[k].cap) { tip = fill(textOf(spec.full), { s: jars[k].label, n: jars[k].cap }); return wrong(tip); }
      tip = null; got[k]++; left--;
      return accepted();
    },
    auto() {
      if (left === 0) return null;
      const k = jars.findIndex((j, x) => got[x] < j.cap);
      return k >= 0 ? 'j' + k : null;
    },
    advance() {},
    get done() { return left === 0; },
  };
}
