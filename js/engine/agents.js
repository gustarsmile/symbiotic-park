// The computer-run people: each follows the day written in the data. No drawing happens here.
import { DWELL, toMin } from './time.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// Everyone starts at [0, 0], invisible, before their day has begun.
export function createAgents(people, rng) {
  void rng;
  return people.map((p, i) => ({
    id: p.id, name: p.name, identity: p.identity, look: p.look,
    day: p.day.map((e) => ({ at: e.at, via: e.via, spot: e.spot, act: e.act, t: toMin(e.at) })),
    x: 0, y: 0, path: null, pi: -1, vis: 0, cur: -1, dir: 1, step: i, ph: i * 1.7,
    moving: false, arrived: false, act: 'leave', carry: null, player: false, paused: false, up: false, since: 0,
  }));
}

// A point just outside the gate, with a little spread so people do not stack.
function spawn(a, map, rng) {
  const w = map.world, deg = w.gate + (rng() - 0.5) * map.spawn.spread, r = map.spawn.r, rad = deg * Math.PI / 180;
  a.x = w.cx + r * Math.cos(rad);
  a.y = w.cy + r * Math.sin(rad);
}

export function resetAgent(a, map, rng) {
  a.cur = -1; a.vis = 0; a.path = null; a.pi = -1; a.arrived = false; a.moving = false; a.paused = false; a.up = false;
  spawn(a, map, rng);
}

function currentIndex(a, clock) {
  let idx = -1;
  for (let i = 0; i < a.day.length; i++) if (a.day[i].t <= clock) idx = i;
  return idx;
}

// Put everyone where their day has them at this minute, as if the park had been running all along.
export function settle(agents, clock, acts, map, rng) {
  agents.forEach((a) => {
    resetAgent(a, map, rng);
    const idx = currentIndex(a, clock);
    if (idx < 0) return;
    const e = a.day[idx], k = acts[e.act];
    a.cur = idx; a.x = e.spot[0]; a.y = e.spot[1]; a.act = e.act; a.arrived = true; a.since = clock - DWELL;
    a.vis = k.in || k.out ? 0 : 1;
  });
}

// Move along the current path; true when it ends.
export function follow(a, dist) {
  while (dist > 0 && a.path) {
    const p = a.path[a.pi + 1];
    if (!p) { a.path = null; return true; }
    const dx = p[0] - a.x, dy = p[1] - a.y, d = Math.hypot(dx, dy);
    if (d > 1) {
      a.up = dy < 0 && -dy > Math.abs(dx) * 1.1;      // walking away up the map, or across it
      if (Math.abs(dx) > d * 0.25) a.dir = dx > 0 ? 1 : -1;
    }
    if (d <= dist) { a.x = p[0]; a.y = p[1]; a.pi++; dist -= d; } else { a.x += dx / d * dist; a.y += dy / d * dist; dist = 0; }
  }
  return !a.path;
}

export function updateAgent(a, dt, clock, speed, ctx) {
  const { roads, acts, map, rng } = ctx;
  if (a.player) return;
  if (a.paused) { a.moving = false; a.vis = clamp(a.vis + 3 * dt, 0, 1); return; }      // someone has stopped to talk to them: they wait
  const idx = currentIndex(a, clock);
  if (idx < 0) { a.vis = 0; a.cur = -1; return; }
  if (idx !== a.cur && (a.cur < 0 || (a.arrived && clock - a.since >= DWELL))) {      // they stay a little while where they went, before the next thing
    if (a.cur === -1) spawn(a, map, rng);
    a.cur = idx;
    const s = a.day[idx];
    a.path = roads.route([a.x, a.y], map.nodes[s.via]).concat([s.spot]); a.pi = -1; a.act = s.act; a.arrived = false;
  }
  if (a.path) {
    a.moving = true; a.step += dt * speed * 0.1;
    if (follow(a, speed * dt)) { a.arrived = true; a.moving = false; a.since = clock; }
  } else a.moving = false;
  const k = acts[a.act], show = !(a.arrived && (k.in || k.out));
  a.vis = clamp(a.vis + (show ? 3 : -3) * dt, 0, 1);
  a.carry = k.carry && (a.moving || k.bend) ? k.carry
    : a.arrived && a.act === 'eat' ? 'bowl'
      : a.arrived && (a.act === 'study' || a.act === 'class') ? 'paper' : null;
}

export function moodOf(a, acts) {
  if (a.player || !a.arrived) return 'smile';
  const k = a.act;
  if (k === 'eat' || k === 'pickup' || k === 'chat' || k === 'tutor') return 'happy';
  if (acts[k].bend || k === 'study' || k === 'class' || k === 'sort' || k === 'pack' || k === 'dry' || k === 'teabag' || k === 'post' || k === 'stock') return 'focus';
  return 'smile';
}
