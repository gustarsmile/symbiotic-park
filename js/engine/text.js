// Replaces %key markers in a template with the matching values (e.g. %n, %t, %s).
// A marker with no matching key is left as it is.
export function fill(template, vars) {
  return template.replace(/%(\w)/g, (m, k) => (Object.prototype.hasOwnProperty.call(vars, k) ? String(vars[k]) : m));
}
