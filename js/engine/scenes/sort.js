import { fill } from '../text.js';
import { accepted, rejected, wrong, indexOf, textOf } from './util.js';

// One card at a time, into the right one of the categories.
export function create(spec) {
  const items = spec.items, cats = spec.cats;
  const got = cats.map(() => 0);
  let i = 0, tip = null;
  const finished = () => i >= items.length;
  const open = () => (finished() ? [] : cats.map((_, k) => 'c' + k));
  const cardOf = (it) => {
    const c = {};
    if (it.label !== undefined) c.label = it.label;
    if (it.icon !== undefined) c.icon = it.icon;
    return c;
  };
  return {
    view() {
      let status = '';
      if (!finished()) status = fill(spec.count, { i: i + 1, t: items.length });
      else if (spec.doneStatus !== undefined) status = fill(spec.doneStatus, Object.fromEntries(got.map((v, k) => [k, v])));
      return {
        type: 'sort',
        status,
        tip,
        who: spec.who ?? null,
        card: finished() ? null : cardOf(items[i]),
        cats: cats.map((c, k) => {
          const o = { id: 'c' + k, label: c.label };
          if (c.icon !== undefined) o.icon = c.icon;
          o.n = got[k];
          return o;
        }),
        counters: Boolean(spec.counters),
        finished: finished(),
        doneText: spec.done,
      };
    },
    controls: open,
    press(id) {
      if (!open().includes(id)) return rejected();
      const k = indexOf(id), right = items[i].cat;
      if (k !== right) { tip = textOf(spec.tips[right]); return wrong(tip); }
      tip = null; got[k]++; i++;
      return accepted();
    },
    auto() { return finished() ? null : 'c' + items[i].cat; },
    advance() {},
    get done() { return finished(); },
  };
}
