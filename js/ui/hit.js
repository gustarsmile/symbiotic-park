// What is under a finger or a pointer. Pure: arithmetic on the camera and on the rectangles the map view drew.

// Screen position to map position.
export function toWorld(cam, W, H, sx, sy) {
  return [(sx - W / 2) / cam.s + cam.x, (sy - H / 2) / cam.s + cam.y];
}

// The person nearest the point, measured at 36 above their feet (the middle of the body). Invisible people and the player do not count.
export function agentAt(agents, cam, W, H, sx, sy) {
  const [wx, wy] = toWorld(cam, W, H, sx, sy);
  let hit = null, best = Math.max(36, 22 / cam.s);
  for (const a of agents) {
    if (a.vis < 0.5 || a.player) continue;
    const d = Math.hypot(a.x - wx, a.y - 36 - wy);
    if (d < best) { best = d; hit = a; }
  }
  return hit;
}

// The signboard whose (already enlarged) rectangle holds the point.
export function labelAt(rects, sx, sy) {
  for (const r of rects) if (sx >= r.x && sx <= r.x + r.w && sy >= r.y && sy <= r.y + r.h) return r;
  return null;
}
