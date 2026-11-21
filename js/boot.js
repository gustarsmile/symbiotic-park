// Starts the page: loads the data, builds the park, and runs the frame loop. For now the page opens straight into watching the park.
import { loadData } from './data.js';
import { createPark } from './engine/park.js';
import { createAuto, pace } from './engine/auto.js';
import { createRng } from './engine/rng.js';
import { safeStorage, loadRecord } from './engine/store.js';
import { paintMap } from './ui/paint.js';
import { createMapView } from './ui/mapView.js';
import { createHud } from './ui/hud.js';
import { agentAt, labelAt } from './ui/hit.js';
import { frameSeconds } from './ui/loop.js';
import { $ } from './ui/dom.js';

// The data sits next to this module (js/data/), wherever the page itself lives.
const DATA_BASE = import.meta.url.split(/[?#]/)[0].replace(/[^/]*$/, '') + 'data/';
const PAINT_SEED = 20261120;                    // the same seed the prototype used for its grass and trees

// Tapping, dragging and pointing at the map. Watching: tap a signboard or a person to ask; drag to look around.
function bindInput(canvas, park, view, hud) {
  let ptr = null;
  const st = park.state;
  const active = () => st.mode === 'watch' || st.mode === 'role';

  function onTap(cx, cy) {
    if (!active() || st.scene) return;
    const r = canvas.getBoundingClientRect(), sx = cx - r.left, sy = cy - r.top;
    const L = labelAt(view.labelRects, sx, sy);
    if (L) { park.release(); hud.showPlace(park.data.map.labels.find((l) => l.key === L.key)); return; }
    const hit = agentAt(park.agents, view.cam, view.W, view.H, sx, sy);
    if (hit && hit !== st.sel) {                // they stop and turn to you; tap them again, or move the mouse away, and they go on
      const was = hit.moving;
      park.select(hit);
      hud.showPerson(hit, was);
      return;
    }
    const had = st.sel;
    park.release(); hud.hideInfo();
    if (hit || had) return;
    // role mode: tapping bare ground walks there (next task)
  }

  canvas.addEventListener('pointermove', (e) => {
    if (ptr || e.pointerType !== 'mouse' || !active()) return;
    const r = canvas.getBoundingClientRect(), sx = e.clientX - r.left, sy = e.clientY - r.top;
    canvas.style.cursor = !st.scene && (agentAt(park.agents, view.cam, view.W, view.H, sx, sy) || labelAt(view.labelRects, sx, sy)) ? 'pointer' : '';
    const sel = st.sel;
    if (sel && Math.hypot(sx - ((sel.x - view.cam.x) * view.cam.s + view.W / 2), sy - ((sel.y - 36 - view.cam.y) * view.cam.s + view.H / 2)) > 90) park.release();
  });
  canvas.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') { canvas.style.cursor = ''; park.release(); } });
  canvas.addEventListener('pointerdown', (e) => {
    if (ptr) return;
    ptr = { id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now(), moved: false };
    try { canvas.setPointerCapture(e.pointerId); } catch { /* not every browser lets us */ }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!ptr || e.pointerId !== ptr.id) return;
    const dx = e.clientX - ptr.x, dy = e.clientY - ptr.y;
    ptr.x = e.clientX; ptr.y = e.clientY;
    if (!ptr.moved && Math.hypot(e.clientX - ptr.sx, e.clientY - ptr.sy) > 8) ptr.moved = true;
    if (ptr.moved && active()) { view.cam.free = 3; view.cam.x -= dx / view.cam.s; view.cam.y -= dy / view.cam.s; }      // a drag: look around, and the camera stays put for 3 seconds
  });
  const endPtr = (e) => {
    if (!ptr || e.pointerId !== ptr.id) return;
    const p = ptr; ptr = null;
    if (!p.moved && performance.now() - p.t < 500 && e.type === 'pointerup') onTap(e.clientX, e.clientY);
  };
  canvas.addEventListener('pointerup', endPtr);
  canvas.addEventListener('pointercancel', endPtr);
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
}

// Resolves with { park, auto, data, record, view, hud, stop }. If the data cannot be loaded it shows the retry panel and rejects.
export async function boot({ fetchFn = fetch, win = window, storage = safeStorage(win) } = {}) {
  let data;
  try {
    data = await loadData(DATA_BASE, fetchFn);
  } catch (err) {
    $('load-error').hidden = false;
    $('load-retry').onclick = () => { boot({ fetchFn, win, storage }).catch(() => {}); };
    throw err;
  }
  $('load-error').hidden = true;

  const record = loadRecord(storage);
  const park = createPark(data);
  const auto = createAuto(park);
  const painted = paintMap(data.map, createRng(PAINT_SEED), (win.devicePixelRatio || 1) >= 1.5 ? 2 : 1.5);
  const canvas = $('map');
  const reduceMotion = () => !!win.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  const view = createMapView(canvas, park, painted, data.ui, { win, reduceMotion });
  const hud = createHud(park, auto, data, record, { onMenu() { /* the role list comes with the welcome */ } });

  park.beginWatch();
  for (const id of ['start', 'intro', 'end']) $(id).hidden = true;
  $('hud').hidden = false;
  view.resize();
  win.addEventListener('resize', view.resize);
  bindInput(canvas, park, view, hud);

  let last = 0, time = 0, raf = 0, stopped = false;
  function frame(now) {
    if (stopped) return;
    raf = win.requestAnimationFrame(frame);
    const dt = frameSeconds(now, last); last = now; time += dt;
    if (win.document.hidden) return;            // a hidden tab skips the whole frame
    const p = pace(dt, auto, park.state.mode);
    park.tick(p.move); auto.step(p.read); view.camera(dt); view.render(time); hud.update();
  }
  raf = win.requestAnimationFrame(frame);
  const stop = () => { stopped = true; win.cancelAnimationFrame?.(raf); win.removeEventListener('resize', view.resize); };

  win.__park = { park, auto, view, stop };
  return { park, auto, data, record, view, hud, stop };
}
