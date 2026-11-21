// Helpers for checking the explanatory texts. A sourced text is { text, source }.

export const SOURCE_RE = /^(運作設計 \S.*|產品線規劃 \S.*|口頭決定 \d{4}-\d{2}-\d{2}|示意數字|例子|待確認)$/;

export function isSourced(x) {
  return !!x && typeof x === 'object' && !Array.isArray(x)
    && typeof x.text === 'string' && x.text !== ''
    && typeof x.source === 'string' && x.source !== '';
}

const join = (path, key) => (typeof key === 'number' ? `${path}[${key}]` : path ? `${path}.${key}` : key);

function walk(node, path, visit) {
  if (Array.isArray(node)) node.forEach((v, i) => walk(v, join(path, i), visit));
  else if (node && typeof node === 'object') {
    if (visit(node, path) === false) return;
    for (const k of Object.keys(node)) walk(node[k], join(path, k), visit);
  }
}

// Calls back for every object that carries both `text` and `source`, well formed or not,
// so a broken one still reaches the caller's checks instead of being skipped.
export function eachSourced(obj, cb) {
  walk(obj, '', (node, path) => {
    if (!('text' in node && 'source' in node)) return true;
    cb(node, path);
    return false;
  });
}

// Calls back for every string value (not keys), at any depth.
export function eachString(obj, cb, path = '') {
  if (typeof obj === 'string') cb(obj, path);
  else if (Array.isArray(obj)) obj.forEach((v, i) => eachString(v, cb, join(path, i)));
  else if (obj && typeof obj === 'object') for (const k of Object.keys(obj)) eachString(obj[k], cb, join(path, k));
}
