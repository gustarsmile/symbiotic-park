// Draws the park onto the canvas: the painted map, the people, the time-of-day tint, the lit windows and the signboards.
// Ported from the prototype's render and camera code. It reads the park but never changes it.
import { drawChar, rr, disc } from './character.js';
import { createCamera, updateCamera } from './camera.js';
import { $ } from './dom.js';
import { toMin } from '../engine/time.js';
import { moodOf } from '../engine/agents.js';

const TAU = Math.PI * 2;
const FONT = '"Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif';
const CS = 1.3;                                  // people are drawn larger than life, so their faces read on a phone
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const T = (h, m) => h * 60 + m;

// The colour the whole scene is multiplied by, by the minute of the day.
const TINT = [[T(5, 50), 255, 214, 176], [T(7, 30), 255, 240, 220], [T(9, 30), 255, 255, 255], [T(15, 30), 255, 255, 255], [T(17, 10), 255, 232, 198], [T(18, 30), 246, 196, 160], [T(19, 40), 176, 164, 204]];
export function tintAt(m) {
  for (let i = 1; i < TINT.length; i++) {
    if (m <= TINT[i][0]) {
      const a = TINT[i - 1], b = TINT[i], k = clamp((m - a[0]) / (b[0] - a[0]), 0, 1);
      return [lerp(a[1], b[1], k), lerp(a[2], b[2], k), lerp(a[3], b[3], k)];
    }
  }
  return TINT[TINT.length - 1].slice(1);
}

// painted: what paintMap made. opts (all optional): win, reduceMotion() -> bool, and the seams the role mode plugs into:
//   under(g, time)             draw on the map before the people (world coordinates): the job's ring and arrow, the player's mark
//   currentKey()               the key of the signboard that is the next job (drawn dark green)
//   labels(pill, ox, oy, s)    draw more signboards after the others (the "you" tag)
//   cameraRole()               { target: {x, y}, cover, sheetWidth } for the camera while in role mode
export function createMapView(canvas, park, painted, ui, opts = {}) {
  const win = opts.win ?? window;
  const world = park.data.map.world, labels = park.data.map.labels, acts = park.data.acts;
  const WW = world.w, WH = world.h;
  const SS = painted.base.width / WW;
  const ctx = canvas.getContext('2d');
  const cam = createCamera(world);
  let W = 0, H = 0, dpr = 1, labelRects = [];
  if (ui?.mapLabel) canvas.setAttribute('aria-label', ui.mapLabel);

  function resize() {
    W = canvas.clientWidth || win.innerWidth; H = canvas.clientHeight || win.innerHeight;
    dpr = Math.min(win.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  }

  function camera(dt) {
    const mode = park.state.mode;
    const role = mode === 'role' && opts.cameraRole ? opts.cameraRole() : null;
    const { sheetPad } = updateCamera(cam, {
      W, H, dt, mode, target: role?.target ?? null, cover: role?.cover ?? 0, sheetWidth: role?.sheetWidth ?? 0,
      instant: !!opts.reduceMotion?.(),
    }, world);
    const sheet = $('sheet'), side = sheetPad ? sheetPad + 'px' : '';
    if (sheet && sheet.style.paddingRight !== side) sheet.style.paddingRight = side;
  }

  // What drawChar needs to know about one person right now.
  function stateOf(a, t) {
    const w = acts[a.act], here = a.arrived && !a.player;
    if (a.paused) return { t, ph: a.ph, moving: false, step: a.step, bend: false, sit: here && !!w.sit, carry: a.carry, mood: 'happy', dir: 1, back: false };      // stopped, and turned to face you
    return { t, ph: a.ph, moving: a.moving, step: a.step, bend: here && !!w.bend, sit: here && !!w.sit, carry: a.carry, mood: moodOf(a, acts), dir: a.dir, back: a.moving && a.up };
  }

  function pill(text, sx, sy, bg, fg, key) {
    ctx.font = '700 12.5px ' + FONT;
    const w = ctx.measureText(text).width + 16, x = Math.round(sx - w / 2), y = Math.round(sy - 22);
    ctx.fillStyle = bg; rr(ctx, x, y, w, 22, 6); ctx.fill(); ctx.strokeStyle = 'rgba(36,48,31,.28)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = fg; ctx.textBaseline = 'middle'; ctx.textAlign = 'center'; ctx.fillText(text, x + w / 2, y + 11.5);
    if (key) labelRects.push({ key, name: text, x: x - 4, y: y - 5, w: w + 8, h: 32 });      // a bit bigger than it looks, so a finger finds it
  }

  function render(time) {
    const s = cam.s, ox = W / 2 - cam.x * s, oy = H / 2 - cam.y * s, state = park.state, clock = state.clock;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = '#6f9657'; ctx.fillRect(0, 0, W, H);
    const x0 = clamp(-ox / s, 0, WW), y0 = clamp(-oy / s, 0, WH), x1 = clamp((W - ox) / s, 0, WW), y1 = clamp((H - oy) / s, 0, WH);
    const blit = (img) => { if (x1 > x0 && y1 > y0) ctx.drawImage(img, x0 * SS, y0 * SS, (x1 - x0) * SS, (y1 - y0) * SS, ox + x0 * s, oy + y0 * s, (x1 - x0) * s, (y1 - y0) * s); };
    blit(painted.base);
    ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
    opts.under?.(ctx, time);
    const sel = state.sel;
    if (sel) { ctx.strokeStyle = 'rgba(240,180,41,.95)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(sel.x, sel.y + 1, 24, 9.5, 0, 0, TAU); ctx.stroke(); }
    const list = painted.props.concat(park.agents.filter((a) => a.vis > 0.02)).sort((a, b) => a.y - b.y);
    list.forEach((a) => {
      if (a.draw) { a.draw(ctx); return; }
      ctx.save(); ctx.translate(a.x, a.y); ctx.scale(CS, CS); ctx.globalAlpha = a.vis; drawChar(ctx, a.look, stateOf(a, time)); ctx.restore();
    });
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); blit(painted.over);
    const tc = tintAt(clock);
    ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = 'rgb(' + Math.round(tc[0]) + ',' + Math.round(tc[1]) + ',' + Math.round(tc[2]) + ')'; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over';
    const dusk = clamp((clock - toMin('17:20')) / 60, 0, 1);
    ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
    if (dusk > 0) { ctx.fillStyle = 'rgba(255,214,120,' + 0.85 * dusk + ')'; ctx.shadowColor = 'rgba(255,200,90,' + dusk + ')'; ctx.shadowBlur = 14 * dpr; painted.windows.forEach((w) => ctx.fillRect(w[0], w[1], w[2], w[3])); }
    ctx.fillStyle = dusk > 0 ? 'rgba(255,226,150,' + (0.5 + 0.5 * dusk) + ')' : 'rgba(255,250,225,.9)'; painted.lights.forEach((p) => disc(ctx, p[0], p[1], dusk > 0 ? 3.2 : 2.2));
    ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    labelRects = [];
    if (state.mode !== 'menu') {
      const cur = opts.currentKey?.() ?? null;
      for (const L of labels) {
        const sx = ox + L.x * s, sy = oy + L.y * s;
        if (sx < -80 || sx > W + 80 || sy < 0 || sy > H + 30) continue;
        if (L.key === cur) pill(L.name, sx, sy, '#2f6b3a', '#fdfbf2', L.key); else pill(L.name, sx, sy, 'rgba(251,246,233,.94)', '#24301f', L.key);
      }
      opts.labels?.(pill, ox, oy, s);
    }
  }

  return { resize, camera, render, cam, get W() { return W; }, get H() { return H; }, get labelRects() { return labelRects; } };
}
