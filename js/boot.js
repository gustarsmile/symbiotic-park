// Starts the page: loads the data, builds the park, and runs the frame loop. The first time on a device the welcome
// opens; after that the page opens on the role list. Behind both, the park keeps moving.
import { loadData } from './data.js';
import { createPark } from './engine/park.js';
import { createAuto, pace } from './engine/auto.js';
import { createRng } from './engine/rng.js';
import { safeStorage, loadRecord, saveRecord, credit } from './engine/store.js';
import { paintMap } from './ui/paint.js';
import { createMapView, roleHooks } from './ui/mapView.js';
import { createHud } from './ui/hud.js';
import { createSceneView } from './ui/sceneView.js';
import { showEnd, hideEnd } from './ui/endView.js';
import { createIntro } from './ui/introView.js';
import { createStart } from './ui/startView.js';
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
    if (st.mode === 'role') park.walkTo([(sx - view.W / 2) / view.cam.s + view.cam.x, (sy - view.H / 2) / view.cam.s + view.cam.y], false);      // bare ground: walk there
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

// Builds everything from loaded data. Nothing is attached to the page (listeners, frame loop, visible hud) until
// every step that can throw has run, so a failure here leaves nothing behind.
function build(data, win, storage) {
  const record = loadRecord(storage);
  const park = createPark(data);                  // it starts in 'menu': the people go about their day behind the welcome and the list
  const auto = createAuto(park);
  const painted = paintMap(data.map, createRng(PAINT_SEED), (win.devicePixelRatio || 1) >= 1.5 ? 2 : 1.5);
  const canvas = $('map');
  const reduceMotion = () => !!win.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  const view = createMapView(canvas, park, painted, data.ui, { win, reduceMotion, ...roleHooks(park, data.ui) });

  // The welcome and the role list. Closing the welcome marks it seen; a role button marks the role tried. Both are saved
  // here; a browser that will not save still plays, it only forgets. Both ignore presses for a moment after they appear,
  // timed by the page's clock.
  const now = () => win.performance.now();
  const intro = createIntro(data, record, { now, onClose() { saveRecord(storage, record); start.show(); } });
  const start = createStart(data, record, auto, {
    now,
    onRole(id) { saveRecord(storage, record); beginRole(id); },
    onWatch: beginWatch,
    onAbout() { start.hide(); intro.open(); },
  });
  const hud = createHud(park, auto, data, record, { onMenu: toMenu });
  // The day is over: a day finished by hand is counted and saved (auto mode's is not), then the end card.
  const sheets = createSceneView(park, auto, data, {
    raf: (cb) => win.requestAnimationFrame(cb),
    onEnd() {
      const role = park.state.role;
      credit(record, role, auto.on); saveRecord(storage, record);
      $('hud').hidden = true;
      showEnd(park.day, data, { now, onWatch: beginWatch, onAgain() { beginRole(role); }, onMenu: toMenu });
    },
  });

  // Every way into the park and back out goes through beginWatch, beginRole or toMenu, so nothing of the last day is left
  // on screen: the end card, the list, an open person's card, a close-up. The engine starts each day afresh (a new run:
  // no close-up, no fast-forward, auto mode starts its steps over); auto mode itself stays as the visitor set it.
  // The cards are brought up to date at once rather than on the next frame, which a background tab never draws.
  function look(x, y) { view.cam.x = x; view.cam.y = y; view.cam.free = 0; }      // the camera starts where the day starts
  function enter() { hideEnd(); start.hide(); hud.hideInfo(); sheets.update(); hud.update(); $('hud').hidden = false; }
  function beginWatch() { park.beginWatch(); look(data.map.world.cx, data.map.world.cy); enter(); }
  function beginRole(id) { park.beginRole(id); look(park.player.x, park.player.y); enter(); }
  function toMenu() {
    park.toMenu(); hud.hideInfo(); sheets.update(); $('hud').hidden = true;
    start.show(); hideEnd();                      // the list first: it moves the focus off the end card's button before that card is emptied
  }

  view.resize();
  $('end').hidden = true; $('hud').hidden = true;
  if (record.intro) start.show(); else intro.open();
  win.addEventListener('resize', view.resize);
  bindInput(canvas, park, view, hud);

  let last = 0, time = 0, raf = 0, stopped = false;
  function frame(now) {
    if (stopped) return;
    raf = win.requestAnimationFrame(frame);
    const dt = frameSeconds(now, last); last = now; time += dt;
    if (win.document.hidden) return;            // a hidden tab skips the whole frame
    const p = pace(dt, auto, park.state.mode);
    park.tick(p.move); auto.step(p.read); sheets.update(); view.camera(dt); view.render(time); hud.update();
  }
  raf = win.requestAnimationFrame(frame);
  const stop = () => { stopped = true; win.cancelAnimationFrame?.(raf); win.removeEventListener('resize', view.resize); };

  win.__park = { park, auto, view, stop };
  return { park, auto, data, record, view, hud, stop };
}

// Resolves with { park, auto, data, record, view, hud, stop }. If anything fails before the park is running (the data
// included, when it has not arrived in time) it shows the retry panel in place of the loading line and rejects. While a
// retry is under way the button is disabled, so a double tap starts only one boot.
export async function boot({ fetchFn = fetch, win = window, storage = safeStorage(win) } = {}) {
  const retry = $('load-retry');
  try {
    const data = await loadData(DATA_BASE, fetchFn, { timers: win });
    const result = build(data, win, storage);
    $('load-error').hidden = true; retry.disabled = false;
    return result;
  } catch (err) {
    $('start').hidden = true; $('load-error').hidden = false; retry.disabled = false;
    retry.onclick = () => {
      if (retry.disabled) return;
      retry.disabled = true;
      boot({ fetchFn, win, storage }).catch(() => {});
    };
    throw err;
  }
}
