import { accepted, rejected, indexOf, textOf } from './util.js';

// A question with no wrong answer: choose one and see the reply.
export function create(spec) {
  const opts = spec.opts;
  let chosen = null;
  const open = () => (chosen === null ? opts.map((_, k) => 'o' + k) : []);
  return {
    view() {
      return {
        type: 'any',
        status: '',
        tip: null,
        who: spec.who,
        mood: chosen === null ? 'smile' : 'happy',
        say: chosen === null ? spec.say : textOf(opts[chosen].reply),
        options: chosen === null ? opts.map((o, k) => ({ id: 'o' + k, label: o.label })) : [],
      };
    },
    controls: open,
    press(id) {
      if (!open().includes(id)) return rejected();
      chosen = indexOf(id);
      return accepted();
    },
    auto() { return chosen === null ? 'o0' : null; },
    advance() {},
    get done() { return chosen !== null; },
  };
}
