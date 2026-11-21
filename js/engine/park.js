// The park simulation: the clock, the people, the visitor's role and job progress.
// Pure: no drawing, no real time. Whoever drives it calls tick(dt) with seconds.
import { createRng } from './rng.js';
import { createRoads } from './roads.js';
import { createAgents, resetAgent, settle, updateAgent, follow } from './agents.js';
import { createScene } from './scenes/index.js';
import { applyOverrides } from './npc.js';
import {
  toMin, DAY_START, DAY_END, WATCH_START, ROLE_EARLIEST, LEAD, FF_GAP,
  RATE, NPC_SPEED, NPC_SPEED_FF, PLAYER_SPEED, NEAR,
} from './time.js';

export function createPark(data, { rng = createRng(20261120) } = {}) {
  const roads = createRoads(data.map);
  const ctx = { roads, acts: data.acts, map: data.map, rng };
  const state = {
    mode: 'menu', role: null, ti: 0, clock: WATCH_START,
    ff: false, near: false, guided: false, scene: null, sel: null, run: 0,
  };

  const park = {
    data, agents: [], state,
    get player() { return park.agents.find((a) => a.player) ?? null; },
    get day() { return state.role ? data.days[state.role] : null; },
    get task() { const day = park.day; return day ? day.tasks[state.ti] ?? null : null; },

    beginWatch() {
      newRun();
      park.agents = createAgents(data.people, rng);
      park.agents.forEach((a) => resetAgent(a, data.map, rng));
      state.mode = 'watch'; state.clock = WATCH_START;
    },

    beginRole(roleId, ti = 0) {
      const day = Object.prototype.hasOwnProperty.call(data.days, roleId) ? data.days[roleId] : null;
      if (!day) throw new Error(`beginRole: unknown role ${roleId}`);
      if (!Number.isInteger(ti) || ti < 0 || ti >= day.tasks.length) throw new Error(`beginRole: bad task index ${ti} for role ${roleId}`);
      newRun();
      state.mode = 'role'; state.role = roleId; state.ti = ti;
      state.clock = Math.max(ROLE_EARLIEST, toMin(day.tasks[ti].at) - LEAD);
      park.agents = createAgents(applyOverrides(data.people, day.npc), rng);
      settle(park.agents, state.clock, data.acts, data.map, rng);
      const p = park.agents.find((a) => a.id === day.who);
      p.player = true; p.vis = 1; p.path = null; p.moving = false; p.arrived = false;
      const prev = ti > 0 ? day.tasks[ti - 1] : null;
      p.carry = prev ? prev.carry : null;
      [p.x, p.y] = prev ? prev.spot : data.map.start;
    },

    toMenu() {
      newRun();
      park.agents = createAgents(data.people, rng);
      park.agents.forEach((a) => resetAgent(a, data.map, rng));
      state.mode = 'menu'; state.clock = WATCH_START;
    },

    tick(dt) {
      let rate = RATE.idle, speed = NPC_SPEED;
      const task = park.task;
      if (state.mode === 'role') {
        if (state.ff && state.clock >= toMin(task.at)) state.ff = false;
        if (state.ff) { rate = RATE.ff; speed = NPC_SPEED_FF; } else rate = RATE.role;
        const hold = toMin(task.hold);
        state.clock = state.ff ? Math.min(state.clock + rate * dt, toMin(task.at)) : Math.max(state.clock, Math.min(state.clock + rate * dt, hold));
      } else {
        if (state.mode === 'end') rate = RATE.end;
        state.clock += rate * dt;
        if (state.clock > DAY_END) {
          state.clock = DAY_START;
          park.agents.forEach((a) => resetAgent(a, data.map, rng));
        }
      }
      park.agents.forEach((a) => updateAgent(a, dt, state.clock, speed, ctx));
      if (state.mode === 'role') movePlayer(dt);
      state.scene?.advance(dt);
    },

    walkTo(point, guided = false) {
      const p = park.player;
      if (!p || state.mode !== 'role') return;
      p.path = roads.route([p.x, p.y], point);
      if (guided) p.path.push(point);
      p.pi = -1; state.guided = !!guided;
    },

    openScene() {
      if (state.mode !== 'role' || !state.near || state.ff || state.scene) return;
      state.scene = createScene(park.task.scene); state.guided = false;
    },

    press(id) { return state.scene ? state.scene.press(id) : { ok: false, tip: null }; },

    finishTask() {
      if (!state.scene || !state.scene.done) return null;
      const day = park.day, p = park.player;
      p.carry = park.task.carry; state.scene = null; state.near = false; state.guided = false;
      state.ti++;
      if (state.ti >= day.tasks.length) { state.ti = day.tasks.length - 1; state.mode = 'end'; state.ff = false; return 'end'; }
      if (toMin(park.task.at) - state.clock > FF_GAP) state.ff = true;
      return 'next';
    },

    select(agent) {
      if (agent.player) return;
      if (state.sel && state.sel !== agent) park.release();
      agent.paused = true; agent.path = null; agent.moving = false; state.sel = agent;
    },

    release() {
      const a = state.sel;
      if (!a) return;
      a.paused = false; a.cur = -2; state.sel = null;
    },
  };

  function newRun() {
    state.run++; state.scene = null; state.sel = null; state.ff = false; state.near = false; state.guided = false;
    state.role = null; state.ti = 0;
  }

  function movePlayer(dt) {
    const p = park.player;
    let arrived = false;
    if (p.path) {
      p.moving = true; p.step += dt * 11;
      if (follow(p, PLAYER_SPEED * dt)) { p.moving = false; arrived = true; }
    }
    const [sx, sy] = park.task.spot;
    state.near = !state.ff && Math.hypot(p.x - sx, p.y - sy) < NEAR;
    if (arrived) {
      if (state.guided && !state.scene && !state.ff) park.openScene();
      state.guided = false;
    }
  }

  park.beginWatch();
  state.mode = 'menu'; state.run = 0;
  return park;
}
