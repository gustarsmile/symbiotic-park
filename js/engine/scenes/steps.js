import { fill } from '../text.js';
import { accepted, rejected } from './util.js';

// A button pressed step by step. A step may need several presses (each adds a
// token) and may end with a wait that only advance(seconds) moves along.
export function create(spec) {
  const steps = spec.steps;
  const last = steps.length - 1;
  let idx = 0, presses = 0, waited = null, finished = steps.length === 0;
  let show = spec.show ?? null, status = spec.status ?? '', tokens = null, progress = null;
  const timesOf = (st) => st.times ?? 1;
  const enter = () => {
    presses = 0;
    if (steps[idx].token !== undefined) tokens = { icon: steps[idx].token, n: 0 };
  };
  const complete = () => {
    const st = steps[idx];
    if (st.status !== undefined) status = st.status;
    else status = st.count !== undefined ? fill(st.count, { n: timesOf(st), t: timesOf(st) }) : '';
    if (st.show !== undefined) show = st.show;
    if (st.wait) progress = 1;
    waited = null;
    if (idx === last) finished = true; else { idx++; enter(); }
  };
  if (!finished) {
    enter();
    if (steps[0].count !== undefined) status = fill(steps[0].count, { n: 0, t: timesOf(steps[0]) });
  }
  const open = () => (finished || waited !== null ? [] : ['step']);
  return {
    view() {
      return {
        type: 'steps',
        status,
        tip: null,
        show,
        tokens: tokens ? { ...tokens } : null,
        button: finished ? null : { id: 'step', label: steps[idx].label, disabled: waited !== null },
        progress,
      };
    },
    controls: open,
    press(id) {
      if (!open().includes(id)) return rejected();
      const st = steps[idx];
      presses++;
      if (st.token !== undefined) tokens.n++;
      if (presses < timesOf(st)) {
        if (st.count !== undefined) status = fill(st.count, { n: presses, t: timesOf(st) });
      } else if (st.wait && st.wait.seconds > 0) {
        waited = 0; progress = 0; status = st.wait.status;
      } else {
        complete();
      }
      return accepted();
    },
    auto() { return open()[0] ?? null; },
    advance(seconds) {
      if (waited === null || !(seconds > 0)) return;
      const total = steps[idx].wait.seconds;
      waited += seconds; progress = Math.min(1, waited / total);
      if (waited + 1e-9 >= total) complete();
    },
    get done() { return finished; },
  };
}
