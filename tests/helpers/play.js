import { readData } from './data.js';

const DT = 0.05;
const elapsed = new WeakMap();

// Every step of the helpers goes through here so that simulated seconds can be counted.
function step(park) {
  park.tick(DT);
  elapsed.set(park, (elapsed.get(park) ?? 0) + DT);
}

// Wait out fast-forward, then walk to the job and open its scene.
export function openTask(park, maxSteps = 4000) {
  let n = 0;
  park.tick(DT);
  while (park.state.ff) {
    if (++n > maxSteps) throw new Error('openTask: fast-forward never ended');
    step(park);
  }
  n = 0;
  while (!park.state.scene) {
    if (++n > maxSteps) throw new Error('openTask: the scene never opened');
    if (park.state.near) park.openScene();
    else if (!park.state.guided) park.walkTo(park.task.spot, true);
    step(park);
  }
}

// Do one job the way a hand would: press what auto() says, wait when it says nothing.
export function playTask(park, maxSteps = 20000) {
  openTask(park);
  let rejected = 0, n = 0;
  while (!park.state.scene.done) {
    if (++n > maxSteps) throw new Error('playTask: the scene never finished');
    const id = park.state.scene.auto();
    if (id === null) step(park);
    else if (!park.press(id).ok) rejected++;
  }
  park.finishTask();
  return { rejected };
}

export function playDay(park) {
  const t0 = elapsed.get(park) ?? 0;
  let rejected = 0;
  while (park.state.mode !== 'end') rejected += playTask(park).rejected;
  return { rejected, seconds: Math.round(((elapsed.get(park) ?? 0) - t0) * 100) / 100 };
}

const data = readData();
export const ALL_TASKS = Object.entries(data.days).flatMap(([id, day]) => day.tasks.map((_, i) => [id, i]));
