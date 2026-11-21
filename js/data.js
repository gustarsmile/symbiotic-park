// All of the park's content lives in js/data/*.json. This module fetches those files and puts them together.

// Paths relative to js/data/.
export const DATA_FILES = ['map.json', 'people.json', 'identities.json', 'acts.json'];

export function assemble(parts) {
  return {
    map: parts['map.json'] ?? {},
    people: parts['people.json'] ?? [],
    identities: parts['identities.json'] ?? {},
    acts: parts['acts.json'] ?? {},
    days: {},
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
