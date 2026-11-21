// What the browser remembers: which roles were tried, and how many times each was finished by hand.
// Pure: it never touches the globals; callers hand in a storage object.
import { STORAGE_KEY } from '../config.js';

export const ROLE_IDS = ['farm', 'work', 'shop', 'acct', 'learner', 'vol', 'mentor'];

// Some browsers throw even when reading win.localStorage.
export function safeStorage(win) {
  try { return win?.localStorage ?? undefined; } catch { return undefined; }
}

export function emptyRecord() { return { intro: false, tried: {}, done: {} }; }

const isRole = (id) => ROLE_IDS.includes(id);
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

export function loadRecord(storage) {
  const rec = emptyRecord();
  let raw;
  try { raw = storage?.getItem(STORAGE_KEY); } catch { return rec; }
  if (typeof raw !== 'string') return rec;
  let v;
  try { v = JSON.parse(raw); } catch { return rec; }
  if (!isObj(v)) return rec;
  rec.intro = v.intro === true;
  if (isObj(v.tried)) for (const id of ROLE_IDS) if (Object.prototype.hasOwnProperty.call(v.tried, id) && v.tried[id]) rec.tried[id] = true;
  if (isObj(v.done)) for (const id of ROLE_IDS) {
    const n = Object.prototype.hasOwnProperty.call(v.done, id) ? v.done[id] : undefined;
    if (Number.isInteger(n) && n > 0) rec.done[id] = n;
  }
  return rec;
}

export function saveRecord(storage, record) {
  try { storage.setItem(STORAGE_KEY, JSON.stringify(record)); return true; } catch { return false; }
}

export function markTried(record, roleId) {
  if (isRole(roleId)) record.tried[roleId] = true;
}

// Only a day finished by hand counts; the computer playing does not.
export function credit(record, roleId, autoOn) {
  if (autoOn || !isRole(roleId)) return;
  record.done[roleId] = (record.done[roleId] ?? 0) + 1;
}
