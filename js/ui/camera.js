// The camera: where on the map the screen looks, and how big the map is drawn. Pure: it only does arithmetic.
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function createCamera(world) {
  return { x: world.w / 2, y: world.h / 2, s: 1, free: 0, shift: 0 };
}

// v = { W, H, dt, mode, target: {x, y} | null, cover, sheetWidth, instant? }
//   W, H        the drawing area in pixels
//   mode        'role' follows target; 'menu' drifts back to the middle; anything else (watching) stays where it is put
//   cover       pixels of the screen taken by a card at the bottom (role only; a phone keeps the player clear of it)
//   sheetWidth  width of the close-up card standing beside the park (wide screens only)
//   instant     true when the viewer asked for less motion: no easing
// Returns { sheetPad }: how much room the close-up card needs on its right so that park and card are centred together.
export function updateCamera(cam, v, world) {
  const { W, H, dt, mode, target, cover, sheetWidth, instant } = v;
  if (!(W > 0 && H > 0)) return { sheetPad: 0 };
  const WW = world.w, WH = world.h;
  const fit = Math.min(W / WW, H / WH);
  cam.s = fit >= 0.5 ? fit : clamp(H / WH, 0.6, 0.8);              // a wide screen shows the whole park; a phone fills its height and follows sideways
  const hw = W / (2 * cam.s), hh = H / (2 * cam.s);
  const pad = W >= 1000 ? 0 : (cover || 0) / cam.s;
  const ease = (rate) => (instant ? 1 : 1 - Math.exp(-rate * dt));
  cam.free = Math.max(0, cam.free - dt);
  if (mode === 'role' && target && cam.free <= 0) {
    const k = ease(4);
    cam.x += (target.x - cam.x) * k; cam.y += (target.y - 24 + pad / 2 - cam.y) * k;
  } else if (mode === 'menu') {
    const k = ease(2);
    cam.x += (world.cx - cam.x) * k; cam.y += (world.cy - cam.y) * k;
  }
  // on a wide screen the close-up stands right beside the park, and the two are centred together however wide the window is
  const cardW = W >= 1000 && sheetWidth > 0 ? sheetWidth : 0;
  const group = WW * cam.s + 20 + cardW;
  const sheetPad = cardW ? Math.max(16, Math.round((W - group) / 2)) : 0;
  cam.shift += ((cardW ? (cardW + 20) / 2 / cam.s : 0) - cam.shift) * ease(6);
  cam.x = hw * 2 >= WW ? WW / 2 + cam.shift : clamp(cam.x, hw, WW - hw);
  cam.y = clamp(cam.y, Math.min(hh, WH / 2), Math.max(WH - hh + pad, WH / 2));
  return { sheetPad };
}
