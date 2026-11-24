// Boots the real park page inside happy-dom: the data comes from disk, and the animation frames run only when frame() is called.
import { boot } from '../../js/boot.js';
import { readDataFile } from './data.js';
import { STORAGE_KEY } from '../../js/config.js';

const fileOf = (url) => String(url).split('/js/data/')[1] ?? String(url).split('data/')[1];
export const diskFetch = (url) => Promise.resolve({ ok: true, status: 200, json: async () => readDataFile(fileOf(url)) });

// Keeps what is saved, like localStorage does. `init` is a record already there when the page opens.
export function memoryStorage(init) {
  const m = new Map();
  if (init) m.set(STORAGE_KEY, JSON.stringify(init));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); } };
}

// What the page saved last, read back.
export const saved = (storage) => JSON.parse(storage.getItem(STORAGE_KEY) ?? 'null');

export function pageRunner() {
  let queue = [], now = 1000;
  const stops = [];
  // `over` is copied by descriptor, so a getter that throws (a browser that refuses localStorage) stays a getter
  const makeWin = (over = {}) => Object.defineProperties({
    document, devicePixelRatio: 1, innerWidth: 390, innerHeight: 844,
    addEventListener() {}, removeEventListener() {},
    matchMedia: () => ({ matches: false }),
    requestAnimationFrame: (cb) => { queue.push(cb); return queue.length; },
    cancelAnimationFrame() {},
    performance: { now: () => now },          // the page's clock in milliseconds: frame() and wait() move it on
  }, Object.getOwnPropertyDescriptors(over));
  return {
    // opts: { storage, win } — leave storage out to get a fresh memoryStorage; pass storage: undefined for a browser that has none
    async open(opts = {}) {
      queue = [];
      const storage = 'storage' in opts ? opts.storage : memoryStorage();
      const r = await boot({ fetchFn: diskFetch, win: makeWin(opts.win), storage });
      stops.push(r.stop);
      return { ...r, storage };
    },
    // Runs the queued frame callbacks once, `ms` after the last one.
    frame(ms = 16) { now += ms; queue.splice(0).forEach((cb) => cb(now)); },
    // Lets `ms` pass without a frame: the pause between two presses of a hand that is not double-tapping.
    wait(ms = 400) { now += ms; },
    stop() { stops.splice(0).forEach((s) => s()); },
  };
}
