// While a visitor plays a role, a few computer-run people change their day so that
// nobody stands next to the visitor doing the visitor's own job (each role's data
// carries these as `npc`). Pure: the people passed in are never changed.
//
// Override = { who, at, drop: true }  the entry at that time is removed, so the
//                                     person stays where the entry before left them
//          | { who, at, act }         the entry keeps its time and place, with another act

function check(o) {
  const drop = o.drop === true, act = typeof o.act === 'string' && o.act !== '';
  if (drop === act) throw new Error(`override for ${o.who} at ${o.at}: give either drop: true or an act`);
}

// applyOverrides(people, overrides = []) -> a new people array with new day arrays.
// Throws when an override names a person, or a time in that person's day, that does not exist.
export function applyOverrides(people, overrides = []) {
  const out = people.map((p) => ({ ...p, day: p.day.map((e) => ({ ...e, spot: [...e.spot] })) }));
  for (const o of overrides) {
    check(o);
    const p = out.find((x) => x.id === o.who);
    if (!p) throw new Error(`override: no person ${o.who}`);
    const i = p.day.findIndex((e) => e.at === o.at);
    if (i < 0) throw new Error(`override: ${o.who} has nothing at ${o.at}`);
    if (o.drop) p.day.splice(i, 1);
    else p.day[i] = { ...p.day[i], act: o.act };
  }
  return out;
}
