import * as taps from './taps.js';
import * as sort from './sort.js';
import * as quiz from './quiz.js';
import * as order from './order.js';
import * as tick from './tick.js';
import * as any from './any.js';
import * as steps from './steps.js';
import * as handout from './handout.js';
import * as ledger from './ledger.js';
import * as pick from './pick.js';
import * as jars from './jars.js';

const TYPES = { taps, sort, quiz, order, tick, any, steps, handout, ledger, pick, jars };

function createPart(spec) {
  const type = spec && spec.type;
  if (!Object.prototype.hasOwnProperty.call(TYPES, type)) throw new Error('unknown scene type: ' + type);
  return TYPES[type].create(spec);
}

// createScene(part | part[]) -> Scene. An array is a multi-part scene: only the
// current part is shown; when it is done the next one takes over, and the scene
// is done when the last part is.
// Any part may carry `hideHow: true`: while it is the current part, view().hideHow
// is true and the job's how-line is hidden. Every view() carries the boolean.
export function createScene(spec) {
  const specs = Array.isArray(spec) ? spec : [spec];
  const parts = specs.map(createPart);
  if (parts.length === 0) throw new Error('a scene needs at least one part');
  let cur = 0;
  const settle = () => { while (parts[cur].done && cur < parts.length - 1) cur++; };
  settle();
  const finished = () => cur === parts.length - 1 && parts[cur].done;
  return {
    view() { return { ...parts[cur].view(), part: cur, hideHow: specs[cur].hideHow === true }; },
    controls() { return finished() ? [] : parts[cur].controls(); },
    press(id) {
      if (finished()) return { ok: false, tip: null };
      const r = parts[cur].press(id);
      settle();
      return r;
    },
    auto() { return finished() ? null : parts[cur].auto(); },
    advance(seconds) {
      if (finished()) return;
      parts[cur].advance(seconds);
      settle();
    },
    get done() { return finished(); },
  };
}
