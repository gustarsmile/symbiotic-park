// A few small helpers for building page elements.
export const $ = (id) => document.getElementById(id);

// Fills a node with text. Text is never read as HTML; a newline becomes a <br>.
function fill(node, text) {
  node.textContent = '';
  String(text).split('\n').forEach((line, i) => {
    if (i) node.appendChild(document.createElement('br'));
    if (line) node.appendChild(document.createTextNode(line));
  });
  node._text = String(text);
}

export function el(tag, className, text) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text !== undefined) fill(e, text);
  if (tag === 'button') e.type = 'button';
  return e;
}

// How long a screen that has just appeared ignores presses (milliseconds).
export const SETTLE_MS = 350;

// A press that lands on a screen in its first moments is the second half of a double tap meant for the screen before it.
// Returns arm(): from then on, for `ms`, every click inside root (a tap, or Enter or the space bar on a focused control,
// which the browser sends as a click) is stopped before it reaches the control, and does nothing (a checkbox stays as it
// was). now() gives the time in milliseconds: performance.now() on the page, a clock of the test's own in tests.
export function settleClicks(root, now, ms = SETTLE_MS) {
  let at = -Infinity;
  root.addEventListener('click', (e) => {
    if (now() - at < ms) { e.preventDefault(); e.stopPropagation(); }
  }, true);
  return () => { at = now(); };
}

// Writes only when the text is different, so a node that is being watched or selected is not disturbed.
export function setText(node, text) {
  if (node._text === String(text)) return;
  fill(node, text);
}
