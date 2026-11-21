import { accepted, rejected } from './util.js';

// Bars that fill over `wait` seconds of game time. Starts at once, or when the
// button is pressed if there is one.
export function create(spec) {
  const wait = spec.wait;
  let revealed = spec.button === undefined, pressedGo = false, elapsed = 0;
  const finished = () => revealed && elapsed >= wait;
  const open = () => (spec.button !== undefined && !revealed ? ['go'] : []);
  return {
    view() {
      const first = spec.rows[0].value;
      let progress = 0;
      if (revealed) progress = wait <= 0 ? 1 : Math.min(1, elapsed / wait);
      return {
        type: 'ledger',
        status: pressedGo && spec.statusAfter !== undefined ? spec.statusAfter : spec.status,
        tip: null,
        title: spec.title ?? null,
        rows: spec.rows,
        split: spec.split ?? null,
        revealed,
        progress,
        button: open().length ? { id: 'go', label: spec.button } : null,
        valueShown: revealed || spec.before === undefined ? first : spec.before,
      };
    },
    controls: open,
    press(id) {
      if (!open().includes(id)) return rejected();
      revealed = true; pressedGo = true;
      return accepted();
    },
    auto() { return open()[0] ?? null; },
    advance(seconds) {
      if (revealed && !finished() && seconds > 0) elapsed = Math.min(wait, elapsed + seconds + 1e-9);
    },
    get done() { return finished(); },
  };
}
