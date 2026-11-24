// All of the park's content lives in js/data/*.json. This module fetches those files and puts them together.

// Paths relative to js/data/.
export const DATA_FILES = [
  'map.json', 'people.json', 'identities.json', 'acts.json',
  'days/farm.json', 'days/work.json', 'days/shop.json', 'days/acct.json',
  'days/learner.json', 'days/vol.json', 'days/mentor.json',
  'intro.json', 'ui.json',
];

// days/<role>.json is the day of that role.
const DAY_FILE = /^days\/(\w+)\.json$/;

export function assemble(parts) {
  const days = {};
  for (const [file, day] of Object.entries(parts)) {
    const m = DAY_FILE.exec(file);
    if (m) days[m[1]] = day;
  }
  return {
    map: parts['map.json'] ?? {},
    people: parts['people.json'] ?? [],
    identities: parts['identities.json'] ?? {},
    acts: parts['acts.json'] ?? {},
    days,
    intro: parts['intro.json'] ?? {},
    ui: parts['ui.json'] ?? {},
  };
}

// How long the data may take to arrive before the page gives up and offers to try again (milliseconds).
export const LOAD_LIMIT_MS = 20000;

// Fetches every file at once; rejects as soon as any one of them fails, or if they have not all arrived within `limit`
// (a request that stalls would otherwise leave the page loading for ever); the requests still out are then aborted.
// timers: { setTimeout, clearTimeout } — the page's window, or the test's own; the timer is cleared however it ends.
export async function loadData(base, fetchFn = fetch, { limit = LOAD_LIMIT_MS, timers = globalThis } = {}) {
  const root = base.endsWith('/') ? base : `${base}/`;
  const stop = typeof AbortController === 'function' ? new AbortController() : null;
  let timer;
  const late = new Promise((_, reject) => {
    timer = timers.setTimeout(() => { stop?.abort(); reject(new Error(`data: not all here after ${limit} ms`)); }, limit);
  });
  try {
    const bodies = await Promise.race([late, Promise.all(DATA_FILES.map(async (file) => {
      const res = await fetchFn(root + file, stop ? { signal: stop.signal } : undefined);
      if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`);
      return res.json();
    }))]);
    return assemble(Object.fromEntries(DATA_FILES.map((file, i) => [file, bodies[i]])));
  } finally {
    timers.clearTimeout(timer);
  }
}
