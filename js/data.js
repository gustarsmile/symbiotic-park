// All of the park's content lives in js/data/*.json. This module fetches those files and puts them together.

// Paths relative to js/data/.
export const DATA_FILES = [
  'map.json', 'people.json', 'identities.json', 'acts.json',
  'days/farm.json', 'days/work.json', 'days/shop.json', 'days/acct.json',
  'days/learner.json', 'days/vol.json', 'days/mentor.json',
  'ui.json',
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

// Fetches every file at once; rejects as soon as any one of them fails.
export async function loadData(base, fetchFn = fetch) {
  const root = base.endsWith('/') ? base : `${base}/`;
  const bodies = await Promise.all(DATA_FILES.map(async (file) => {
    const res = await fetchFn(root + file);
    if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`);
    return res.json();
  }));
  return assemble(Object.fromEntries(DATA_FILES.map((file, i) => [file, bodies[i]])));
}
