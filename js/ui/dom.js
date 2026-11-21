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

// Writes only when the text is different, so a node that is being watched or selected is not disturbed.
export function setText(node, text) {
  if (node._text === String(text)) return;
  fill(node, text);
}
