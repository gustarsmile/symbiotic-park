// Park clock helpers. All times are minutes since midnight.
export const DAY_START = 355;
export const DAY_END = 1180;
export const WATCH_START = 375;
export const ROLE_EARLIEST = 372;
export const LEAD = 14;
export const FF_GAP = 20;
// Game minutes per real second.
export const RATE = { idle: 4.2, role: 2.2, ff: 20, end: 3 };
// Walking speeds, in map units per real second.
export const NPC_SPEED = 66;
export const NPC_SPEED_FF = 220;
export const PLAYER_SPEED = 118;
export const NEAR = 60;
// Minutes a person stays where they arrived before heading to the next place.
export const DWELL = 8;

export function toMin(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function period(min) {
  const h = min / 60;
  if (h < 7) return 'dawn';
  if (h < 11) return 'morning';
  if (h < 13) return 'noon';
  if (h < 17) return 'afternoon';
  if (h < 19) return 'dusk';
  return 'night';
}

// Minutes are rounded down to a multiple of 10; hours past 12 wrap to a 12-hour face.
export function clockParts(min) {
  const m = Math.floor(min / 10) * 10;
  let h12 = Math.floor(m / 60);
  if (h12 > 12) h12 -= 12;
  return { period: period(min), h12, mm: m % 60 };
}
