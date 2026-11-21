import { fill } from '../text.js';
import { accepted, rejected, wrong, indexOf, textOf } from './util.js';

// Tap the steps in their right order (the order of the step list). The buttons
// are shown in the `show` order.
export function create(spec) {
  const steps = spec.steps;
  const show = spec.show ?? steps.map((_, k) => k);
  const placed = [];
  let tip = null;
  const finished = () => placed.length === steps.length;
  const open = () => show.filter((k) => !placed.includes(k)).map((k) => 's' + k);
  return {
    view() {
      return {
        type: 'order',
        status: fill(spec.count, { n: placed.length, t: steps.length }),
        tip,
        placed: placed.map((k) => steps[k]),
        options: open().map((id) => ({ id, label: steps[indexOf(id)] })),
      };
    },
    controls: open,
    press(id) {
      if (!open().includes(id)) return rejected();
      if (indexOf(id) !== placed.length) { tip = textOf(spec.tip); return wrong(tip); }
      tip = null; placed.push(indexOf(id));
      return accepted();
    },
    auto() { return finished() ? null : 's' + placed.length; },
    advance() {},
    get done() { return finished(); },
  };
}
