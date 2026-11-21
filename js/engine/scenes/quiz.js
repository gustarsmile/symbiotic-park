import { fill } from '../text.js';
import { accepted, rejected, wrong, textOf } from './util.js';

// Someone says something and you choose how to answer. The better answer
// alternates sides: question i puts "good" first when (i + flip) is odd.
export function create(spec) {
  const qs = spec.q, flip = spec.flip ?? 0;
  let i = 0, tip = null;
  const finished = () => i >= qs.length;
  const order = () => ((i + flip) % 2 === 1 ? ['good', 'bad'] : ['bad', 'good']);
  return {
    view() {
      const q = finished() ? null : qs[i];
      return {
        type: 'quiz',
        status: q && spec.count !== undefined ? fill(spec.count, { i: i + 1, t: qs.length }) : '',
        tip,
        who: q ? (q.who ?? spec.who ?? null) : (spec.done.who ?? spec.who ?? null),
        mood: q ? (q.mood ?? 'smile') : 'happy',
        say: q ? q.say : spec.done.text,
        options: q ? order().map((id) => ({ id, label: q[id] })) : [],
      };
    },
    controls() { return finished() ? [] : order(); },
    press(id) {
      if (finished() || (id !== 'good' && id !== 'bad')) return rejected();
      if (id === 'bad') { tip = textOf(qs[i].tip); return wrong(tip); }
      tip = null; i++;
      return accepted();
    },
    auto() { return finished() ? null : 'good'; },
    advance() {},
    get done() { return finished(); },
  };
}
