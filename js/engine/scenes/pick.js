import { fill } from '../text.js';
import { accepted, rejected, indexOf } from './util.js';

// Choose `need` of the options (kept in the order chosen), then press the button.
export function create(spec) {
  const options = spec.options, need = spec.need;
  const chosen = [];
  let went = false;
  const open = () => {
    if (went) return [];
    if (chosen.length < need) return options.flatMap((_, k) => (chosen.includes(k) ? [] : ['o' + k]));
    return ['go'];
  };
  const list = () => chosen.map((k) => options[k]).join('、');   // joined with the ideographic comma
  return {
    view() {
      let text = spec.empty;
      if (went) text = fill(spec.result, { s: list() });
      else if (chosen.length > 0) text = fill(spec.chosen, { s: list() });
      return {
        type: 'pick',
        status: went ? '' : fill(spec.count, { n: chosen.length, t: need }),
        tip: null,
        text,
        options: options.map((label, k) => ({ id: 'o' + k, label, chosen: chosen.includes(k) })),
        button: went ? null : { id: 'go', label: spec.button, disabled: chosen.length < need },
      };
    },
    controls: open,
    press(id) {
      if (!open().includes(id)) return rejected();
      if (id === 'go') went = true; else chosen.push(indexOf(id));
      return accepted();
    },
    auto() { return open()[0] ?? null; },
    advance() {},
    get done() { return went; },
  };
}
