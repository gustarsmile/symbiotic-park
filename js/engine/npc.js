// While a visitor plays a role, a few computer-run people change their day so that
// nobody stands next to the visitor doing the visitor's own job, or so that someone
// is there for the visitor (each role's data carries these as `npc`). Pure: the
// people and the overrides passed in are never changed.
//
// Override = { who, at, drop: true }          the entry at that time is removed, so the
//                                             person stays where the entry before left them
//          | { who, at, act }                 the entry keeps its time and place, with another act
//          | { who, at, add: { via, spot, act } }  a new entry at a time that is free, put in time order

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

function check(o) {
  const given = [o.drop === true, typeof o.act === 'string' && o.act !== '', o.add !== undefined].filter(Boolean).length;
  if (given !== 1) throw new Error(`override for ${o.who} at ${o.at}: give exactly one of drop: true, an act, or an add`);
  if (o.add === undefined) return;
  const a = o.add;
  const whole = !!a && typeof a.via === 'string' && a.via !== '' && typeof a.act === 'string' && a.act !== ''
    && Array.isArray(a.spot) && a.spot.length === 2 && a.spot.every(Number.isFinite);
  if (!whole) throw new Error(`override for ${o.who} at ${o.at}: an add needs via, spot and act`);
  if (typeof o.at !== 'string' || !HHMM.test(o.at)) throw new Error(`override for ${o.who}: an add needs a time as hh:mm, not ${o.at}`);
}

// applyOverrides(people, overrides = []) -> a new people array with new day arrays.
// Throws when an override names a person that does not exist, when a drop or act names a time
// that is not in that person's day, or when an add names a time that already is.
export function applyOverrides(people, overrides = []) {
  const out = people.map((p) => ({ ...p, day: p.day.map((e) => ({ ...e, spot: [...e.spot] })) }));
  for (const o of overrides) {
    check(o);
    const p = out.find((x) => x.id === o.who);
    if (!p) throw new Error(`override: no person ${o.who}`);
    const i = p.day.findIndex((e) => e.at === o.at);
    if (o.add !== undefined) {
      if (i >= 0) throw new Error(`override: ${o.who} already has something at ${o.at}`);
      const k = p.day.findIndex((e) => e.at > o.at);
      p.day.splice(k < 0 ? p.day.length : k, 0, { at: o.at, via: o.add.via, spot: [...o.add.spot], act: o.add.act });
      continue;
    }
    if (i < 0) throw new Error(`override: ${o.who} has nothing at ${o.at}`);
    if (o.drop) p.day.splice(i, 1);
    else p.day[i] = { ...p.day[i], act: o.act };
  }
  return out;
}
