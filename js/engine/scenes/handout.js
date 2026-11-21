import { fill } from '../text.js';
import { accepted, rejected, indexOf } from './util.js';

// Hand something to each person. "counter": the k-th press serves person k,
// whichever item is pressed. "faces": item i serves person i.
export function create(spec) {
  const people = spec.people;
  const pressed = people.map(() => false);
  const served = people.map(() => false);
  let n = 0, bubble = null;
  const open = () => pressed.flatMap((p, i) => (p ? [] : ['i' + i]));
  return {
    view() {
      return {
        type: 'handout',
        status: fill(spec.count, { n, t: people.length }),
        tip: null,
        layout: spec.layout,
        people: people.map((id, k) => ({ id, served: served[k] })),
        items: pressed.map((p, i) => ({ id: 'i' + i, pressed: p, aria: spec.aria?.[i] ?? null })),
        give: spec.give ?? null,
        back: spec.back ?? null,
        returned: spec.back !== undefined ? n : 0,
        bubble,
      };
    },
    controls: open,
    press(id) {
      if (!open().includes(id)) return rejected();
      const k = indexOf(id), who = spec.layout === 'faces' ? k : n;
      pressed[k] = true; served[who] = true; bubble = spec.says[who]; n++;
      return accepted();
    },
    auto() { return open()[0] ?? null; },
    advance() {},
    get done() { return n === people.length; },
  };
}
