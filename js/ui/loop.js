// Seconds to give the simulation for one animation frame. A frame never counts for more than 0.05 seconds, so a tab that
// sat in the background, a phone that was locked, or one very slow frame cannot make the clock jump.
export function frameSeconds(nowMs, lastMs) {
  const dt = (nowMs - lastMs) / 1000;
  if (!lastMs || !Number.isFinite(dt) || dt < 0) return 0;
  return Math.min(0.05, dt);
}
