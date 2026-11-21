// Auto mode: the computer walks, presses and turns the page for the visitor, slowly enough to read along.
// Pure: no drawing. Every pause is counted in seconds handed to step(), never in real time.
export const AUTO = {
  afterBegin: 1.2, afterToggle: 0.8, afterWalk: 0.6, sceneOpen: 1.8, highlight: 0.5,
  afterPress: 0.8, idle: 0.3, afterNext: 1.2, readBase: 3, readPerChar: 0.16, readMin: 6, readMax: 18,
};

// Parts with words only go 1.5x; parts without words go 2x.
export const FAST = { read: 1.5, move: 2 };

export function readSeconds(text) {
  const t = AUTO.readBase + String(text ?? '').length * AUTO.readPerChar;
  return Math.min(AUTO.readMax, Math.max(AUTO.readMin, t));
}

// move: for park.tick (walking, the clock, fast-forward, waits inside scenes).
// read: for auto.step (pauses after opening, highlight, press, and the reading pause).
export function pace(dt, auto, mode) {
  if (auto.on && mode === 'role' && auto.speed === 1.5) return { move: dt * FAST.move, read: dt * FAST.read };
  return { move: dt, read: dt };
}

export function createAuto(park) {
  const st = park.state;
  let wait = 0, lastRun = null, lastScene = null;

  const auto = {
    on: false, speed: 1, k: 1, target: null, reading: false, countdown: 0,

    set(on) {
      auto.on = !!on; auto.target = null; auto.reading = false; auto.countdown = 0;
      wait = AUTO.afterToggle * auto.k;
    },

    setSpeed(v) { auto.speed = v === 1.5 ? 1.5 : 1; },

    step(dt) {
      if (!auto.on || st.mode !== 'role') return;
      if (st.run !== lastRun) {
        lastRun = st.run; lastScene = null;
        auto.target = null; auto.reading = false; auto.countdown = 0;
        wait = AUTO.afterBegin * auto.k;
      }
      if (st.ff) return;
      if (wait > 0) {
        wait -= dt;
        if (auto.reading) auto.countdown = Math.max(0, wait);
        return;
      }
      const scene = st.scene;
      if (!scene) {
        if (st.near) park.openScene();
        else if (!st.guided) { park.walkTo(park.task.spot, true); wait = AUTO.afterWalk * auto.k; }
        return;
      }
      if (scene !== lastScene) {
        lastScene = scene; auto.target = null;
        wait = AUTO.sceneOpen * auto.k;
        return;
      }
      if (scene.done) {
        if (!auto.reading) {
          auto.reading = true; wait = readSeconds(park.task.why.text) * auto.k; auto.countdown = wait;
        } else {
          auto.reading = false; auto.countdown = 0;
          park.finishTask(); wait = AUTO.afterNext * auto.k;
        }
        return;
      }
      const id = scene.auto();
      if (id === null) wait = AUTO.idle * auto.k;
      else if (id !== auto.target) { auto.target = id; wait = AUTO.highlight * auto.k; }
      else { park.press(id); auto.target = null; wait = AUTO.afterPress * auto.k; }
    },
  };
  return auto;
}
