// The map, painted once: the ground and everything on it (base), then whatever stands above people's heads (over).
// Ported line by line from the prototype's painter. All the randomness comes from the rng that is passed in.
import { rr, disc, oval } from './character.js';

const TAU = Math.PI * 2;
const rad = (d) => d * Math.PI / 180;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16), f = (v) => Math.round(clamp(k < 0 ? v * (1 + k) : v + (255 - v) * k, 0, 255)); return 'rgb(' + f(n >> 16) + ',' + f((n >> 8) & 255) + ',' + f(n & 255) + ')'; };
function crate(g, x, y, c) { g.fillStyle = '#a8743c'; rr(g, x, y, 22, 15, 2); g.fill(); g.fillStyle = '#8a5c2c'; g.fillRect(x, y + 7, 22, 1.5); g.fillStyle = c; disc(g, x + 6, y + 2, 4.2); disc(g, x + 12, y + 0.5, 4.6); disc(g, x + 17, y + 2.2, 4); }
function bench(g, x, y) { g.fillStyle = 'rgba(30,40,20,.2)'; rr(g, x - 20, y + 3, 44, 9, 3); g.fill(); g.fillStyle = '#8a6238'; rr(g, x - 22, y - 2, 44, 9, 3); g.fill(); g.fillStyle = '#a57a4a'; g.fillRect(x - 20, y - 1, 40, 2.4); }

const BENCH = [[567, 570], [733, 570], [733, 736], [556, 816], [744, 816], [470, 700]];
const BEDR = [415, 458, 501, 544];

// The edge groups of the prototype, found again from the edges by the names of their ends.
function edgeGroups(edges) {
  const kind = (n) => (/^R\d+$/.test(n) ? 'R' : /^L\d+$/.test(n) ? 'L' : 'O');
  const g = { ring: [], loop: [], spoke: [], avenue: [], spur: [] };
  for (const [a, b] of edges) {
    const k = kind(a) + kind(b);
    if (k === 'RR') g.ring.push([a, b]);
    else if (k === 'LL') g.loop.push([a, b]);
    else if (k === 'RL' || k === 'LR') g.spoke.push([a, b]);
    else if ((a === 'R3' && b === 'G') || (a === 'G' && b === 'R3')) g.avenue.push([a, b]);
    else g.spur.push([a, b]);
  }
  return g;
}

// map: the map data. rng: the random number source (the prototype's stream starts at seed 20261120). scale: pixels per world unit.
export function paintMap(map, rng, scale) {
  const SS = scale, rnd = rng;
  const { w: WW, h: WH, cx: CX, cy: CY, edge: RB, ring: RR, gate: GATE } = map.world;
  const N = map.nodes, AVE = map.avenue, { spoke: SPOKE, spur: SPUR } = edgeGroups(map.edges);
  const pol = (deg, r) => [CX + r * Math.cos(rad(deg)), CY + r * Math.sin(rad(deg))];
  const base = document.createElement('canvas'), over = document.createElement('canvas');
  [base, over].forEach((c) => { c.width = WW * SS; c.height = WH * SS; });
  const WIN = [], TREES = [], LIGHTS = [];

  function house(g, o) {
    const { x, y, w, d, h } = o, ov = 12, rx = x - ov, rw = w + ov * 2, ridge = y + d * 0.44, wy = y + d;
    g.save(); g.shadowColor = 'rgba(26,36,16,.4)'; g.shadowBlur = 16 * SS; g.shadowOffsetX = 12 * SS; g.shadowOffsetY = 12 * SS; g.fillStyle = 'rgba(26,36,16,.35)'; g.fillRect(x + 6, y + 22, w - 8, d + h - 26); g.restore();
    const wg = g.createLinearGradient(0, wy, 0, wy + h); wg.addColorStop(0, shade(o.wall, -0.2)); wg.addColorStop(0.3, o.wall); wg.addColorStop(1, shade(o.wall, -0.06));
    g.fillStyle = wg; g.fillRect(x, wy, w, h);
    g.fillStyle = 'rgba(90,80,60,.4)'; g.fillRect(x, wy + h - 5, w, 5);
    g.fillStyle = '#7a4f2c'; rr(g, x + o.door, wy + h - 46, 40, 46, 5); g.fill(); g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(x + o.door + 19.4, wy + h - 44, 1.2, 44);
    o.wins.forEach((wx) => { const X = x + wx, Y = wy + 15; g.fillStyle = '#5d7f93'; rr(g, X, Y, 28, 24, 3); g.fill(); g.strokeStyle = '#fff8e6'; g.lineWidth = 2; g.stroke(); g.beginPath(); g.moveTo(X + 14, Y); g.lineTo(X + 14, Y + 24); g.stroke(); WIN.push([X + 1, Y + 1, 26, 22]); });
    g.fillStyle = shade(o.roof, -0.18); g.fillRect(rx, y, rw, ridge - y);
    g.fillStyle = o.roof; g.fillRect(rx, ridge, rw, wy + 6 - ridge);
    g.strokeStyle = 'rgba(0,0,0,.14)'; g.lineWidth = 1; for (let yy = y + 7; yy < wy + 4; yy += 8) { g.beginPath(); g.moveTo(rx, yy); g.lineTo(rx + rw, yy); g.stroke(); }
    g.strokeStyle = 'rgba(255,255,255,.1)'; for (let xx = rx + 9; xx < rx + rw; xx += 18) { g.beginPath(); g.moveTo(xx, y); g.lineTo(xx, wy + 6); g.stroke(); }
    g.fillStyle = shade(o.roof, 0.25); g.fillRect(rx, ridge - 2.5, rw, 5);
    g.fillStyle = 'rgba(0,0,0,.24)'; g.fillRect(rx, wy + 6, rw, 4);
  }
  const g = base.getContext('2d'), o = over.getContext('2d');
  g.scale(SS, SS); o.scale(SS, SS); g.lineCap = 'round'; g.lineJoin = 'round';
  // the land outside, then the park as one round piece of ground
  g.fillStyle = '#6f9657'; g.fillRect(0, 0, WW, WH);
  for (let i = 0; i < 1500; i++) { const x = rnd() * WW, y = rnd() * WH; g.strokeStyle = 'rgba(40,80,36,.35)'; g.lineWidth = 1.3; g.beginPath(); g.moveTo(x - 2, y - 3); g.lineTo(x, y); g.lineTo(x + 2, y - 3); g.stroke(); }
  g.save(); g.beginPath(); g.arc(CX, CY, RB, 0, TAU); g.clip();
  const gg = g.createRadialGradient(CX, CY, 120, CX, CY, RB); gg.addColorStop(0, '#b0cf82'); gg.addColorStop(1, '#97b96c'); g.fillStyle = gg; g.fillRect(0, 0, WW, WH);
  for (let i = 0; i < 70; i++) { g.fillStyle = rnd() < 0.5 ? 'rgba(255,255,210,.07)' : 'rgba(40,90,30,.07)'; oval(g, rnd() * WW, rnd() * WH, 40 + rnd() * 90, 24 + rnd() * 50); }
  g.lineWidth = 1.3;
  for (let i = 0; i < 3000; i++) { const x = rnd() * WW, y = rnd() * WH; g.strokeStyle = rnd() < 0.5 ? 'rgba(60,105,45,.4)' : 'rgba(215,230,150,.4)'; g.beginPath(); g.moveTo(x - 2, y - 3); g.lineTo(x, y); g.lineTo(x + 2, y - 3); g.stroke(); }
  for (let i = 0; i < 220; i++) { g.fillStyle = ['#fffdf0', '#ffe27a', '#f6b6c8'][i % 3]; disc(g, rnd() * WW, rnd() * WH, 1.5); }
  g.restore();
  // a hedge round the edge, open at the gate
  g.lineCap = 'butt'; g.strokeStyle = '#3f7a3c'; g.lineWidth = 18; g.beginPath(); g.arc(CX, CY, RB - 5, rad(GATE + 4.6), rad(GATE - 4.6) + TAU); g.stroke();
  g.strokeStyle = '#5c9c4f'; g.lineWidth = 7; g.beginPath(); g.arc(CX, CY, RB - 9, rad(GATE + 4.6), rad(GATE - 4.6) + TAU); g.stroke(); g.lineCap = 'round';
  // the park in the middle: lawn, paths to stroll, a pond, benches
  g.fillStyle = '#b9d88c'; disc(g, CX, CY, RR - 20);
  for (let i = 0; i < 26; i++) { const a = rnd() * 360, r = rnd() * 240, p = pol(a, r); g.fillStyle = 'rgba(255,255,220,.08)'; oval(g, p[0], p[1], 30 + rnd() * 40, 18 + rnd() * 24); }
  const lines = (list, w, c) => { g.strokeStyle = c; g.lineWidth = w; list.forEach(([a, b]) => { g.beginPath(); g.moveTo(N[a][0], N[a][1]); g.lineTo(N[b][0], N[b][1]); g.stroke(); }); };
  [[26, '#d2c08f'], [21, '#efe2bd']].forEach(([w, c]) => { lines(SPOKE, w, c); g.strokeStyle = c; g.lineWidth = w; g.beginPath(); g.arc(CX, CY, 150, 0, TAU); g.stroke(); [0, 90, 180, 270].forEach((a) => { const p = pol(a, 150); g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(CX, CY); g.stroke(); }); });
  g.fillStyle = '#d2c08f'; disc(g, CX, CY, 66); g.fillStyle = '#efe2bd'; disc(g, CX, CY, 62); g.fillStyle = '#a9cc7c'; disc(g, CX, CY, 34);
  g.strokeStyle = '#8a6238'; g.lineWidth = 6; g.beginPath(); g.arc(CX, CY, 42, rad(20), rad(160)); g.stroke(); g.beginPath(); g.arc(CX, CY, 42, rad(200), rad(340)); g.stroke();
  g.fillStyle = '#d8cfae'; oval(g, 588, 712, 56, 38); const pg = g.createRadialGradient(574, 702, 6, 588, 712, 54); pg.addColorStop(0, '#a8dfe2'); pg.addColorStop(1, '#5aaec0'); g.fillStyle = pg; oval(g, 588, 712, 50, 32);
  [[566, 708, 9], [606, 724, 8], [612, 700, 6], [578, 728, 5.5]].forEach((p) => { g.fillStyle = '#4f9a4a'; disc(g, p[0], p[1], p[2]); }); g.fillStyle = '#f7a8c4'; disc(g, 608, 722, 3.4); disc(g, 568, 706, 3);
  g.strokeStyle = '#f08a3c'; g.lineWidth = 3.2; g.beginPath(); g.moveTo(584, 698); g.lineTo(595, 702); g.moveTo(598, 716); g.lineTo(588, 721); g.stroke();
  BENCH.forEach((b) => bench(g, b[0], b[1])); bench(g, 600, 818); bench(g, 788, 814);
  [22, 68, 112, 158, 202, 248, 292, 338].forEach((a, i) => { const p = pol(a, 210); g.fillStyle = '#7a5a3a'; disc(g, p[0], p[1], 19); g.fillStyle = '#5a9a4a'; disc(g, p[0], p[1], 16); for (let k = 0; k < 9; k++) { const q = pol(k * 40, 9.5); g.fillStyle = ['#f7a8c4', '#ffe27a', '#fffdf0', '#f08a6a'][i % 4]; disc(g, p[0] + q[0] - CX, p[1] + q[1] - CY, 3.2); } });
  // the ring road, the avenue from the gate, and the lanes off them
  [[52, '#cdb98a'], [46, '#ead9ae']].forEach(([w, c]) => { g.strokeStyle = c; g.lineWidth = w; g.beginPath(); g.arc(CX, CY, RR, 0, TAU); g.stroke(); g.beginPath(); g.moveTo(N.R3[0], N.R3[1]); g.lineTo(AVE[0], AVE[1]); g.stroke(); lines(SPUR, w - 18, c); });
  for (let i = 0; i < 900; i++) { const p = pol(rnd() * 360, RR + (rnd() - 0.5) * 38); g.fillStyle = rnd() < 0.5 ? 'rgba(150,128,88,.35)' : 'rgba(255,250,225,.5)'; disc(g, p[0], p[1], 1 + rnd()); }
  // vegetable beds, curved to the park: the outermost has just been replanted for the next round
  g.lineCap = 'butt';
  BEDR.forEach((r, i) => [[97, 110.3], [114.7, 122]].forEach(([a0, a1]) => {
    g.strokeStyle = '#7d5c3a'; g.lineWidth = 31; g.beginPath(); g.arc(CX, CY, r, rad(a0), rad(a1)); g.stroke();
    for (let a = a0 + 1.1; a < a1 - 0.6; a += 19 / r * 57.3) [-7.5, 7.5].forEach((dr) => {
      const p = pol(a + (rnd() - 0.5) * 0.3, r + dr);
      if (i === 3) { g.fillStyle = '#a6d977'; disc(g, p[0], p[1], 2.6); return; }
      const c = i === 1 ? ['#3f8a3a', '#e9f2d8'] : i === 2 && rnd() < 0.5 ? ['#8e4a5c', '#b96a7a'] : ['#6fb84a', '#a9de80'];
      g.fillStyle = 'rgba(40,30,10,.28)'; disc(g, p[0] + 1.2, p[1] + 1.6, 6); g.fillStyle = c[0]; disc(g, p[0], p[1], 6); g.fillStyle = c[1]; disc(g, p[0] - 0.8, p[1] - 0.8, 3.2);
    });
  }));
  // herb garden, in wedges: lemongrass, mint, perilla, basil, roselle, turmeric
  const HERB = ['#b9d86a', '#3f9a5a', '#7b4a86', '#57a84a', '#b02a3a', '#7dbb55'];
  [[350, 415], [425, 490], [500, 565]].forEach(([r0, r1], bi) => [[126, 134.4], [139.6, 148]].forEach(([a0, a1], ci) => {
    const kind = bi * 2 + ci; g.fillStyle = '#84623e'; g.beginPath(); g.arc(CX, CY, r1, rad(a0), rad(a1)); g.arc(CX, CY, r0, rad(a1), rad(a0), true); g.closePath(); g.fill();
    for (let k = 0; k < 30; k++) {
      const p = pol(a0 + 0.9 + rnd() * (a1 - a0 - 1.8), r0 + 9 + rnd() * (r1 - r0 - 18));
      if (kind === 0 || kind === 5) { g.strokeStyle = HERB[kind]; g.lineWidth = 1.9; g.lineCap = 'round'; for (let b = -2; b <= 2; b++) { g.beginPath(); g.moveTo(p[0], p[1] + 4); g.lineTo(p[0] + b * 2.5, p[1] - 6); g.stroke(); } }
      else { g.fillStyle = HERB[kind]; disc(g, p[0], p[1], 3.5); if (kind === 4) { g.fillStyle = '#3f8a3a'; disc(g, p[0] + 2.6, p[1] + 2, 2.4); } }
    }
  }));
  g.lineCap = 'round';
  // compost bins (three stages), the drying yard, and the packing shed
  ['#4f3520', '#66472a', '#7d5c38'].forEach((c, i) => { const x = 152 + i * 34; g.fillStyle = 'rgba(30,40,20,.22)'; g.fillRect(x + 4, 848, 28, 28); g.fillStyle = '#9a7445'; g.fillRect(x, 842, 28, 28); g.fillStyle = c; g.fillRect(x + 3, 845, 22, 22); });
  [['#b02a3a', 558], ['#7fae4d', 590], ['#e3c35a', 622]].forEach(([c, y]) => { g.fillStyle = 'rgba(30,40,20,.2)'; g.fillRect(154, y + 6, 86, 26); g.fillStyle = '#d7b87a'; rr(g, 150, y, 86, 26, 4); g.fill(); [168, 193, 218].forEach((x) => { g.fillStyle = '#f1e2b6'; disc(g, x, y + 13, 11); g.fillStyle = c; disc(g, x, y + 13, 8.6); }); });
  g.fillStyle = '#dccba0'; rr(g, 200, 662, 112, 76, 6); g.fill(); g.fillStyle = '#b98a55'; rr(g, 222, 688, 66, 20, 3); g.fill();
  crate(g, 208, 716, '#6fb84a'); crate(g, 238, 718, '#8fd05c'); crate(g, 270, 716, '#b9d86a');
  g.fillStyle = '#6b4a2a'; [[204, 666], [302, 666], [204, 730], [302, 730]].forEach((p) => g.fillRect(p[0], p[1], 6, 6));
  // greenhouse floor and seed trays
  g.fillStyle = 'rgba(30,40,20,.2)'; rr(g, 908, 935, 170, 130, 14); g.fill(); g.fillStyle = '#d5d9c4'; rr(g, 900, 925, 170, 130, 14); g.fill();
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) { const x = 915 + c * 50, y = 938 + r * 37; g.fillStyle = '#5f4f34'; rr(g, x, y, 42, 27, 3); g.fill(); g.fillStyle = r < 2 ? '#8fd05c' : '#b9e08a'; for (let k = 0; k < 8; k++) disc(g, x + 6.5 + (k % 4) * 9.6, y + 8 + Math.floor(k / 4) * 10.5, r < 2 ? 3 : 2); }
  // the terrace in front of the dining hall: by day a classroom with a blackboard, in the evening the shared table
  g.fillStyle = 'rgba(30,40,20,.18)'; rr(g, 986, 616, 220, 240, 10); g.fill(); g.fillStyle = '#e3d4aa'; rr(g, 980, 608, 220, 240, 10); g.fill();
  g.strokeStyle = 'rgba(150,128,88,.28)'; g.lineWidth = 1; for (let x = 1002; x < 1200; x += 22) { g.beginPath(); g.moveTo(x, 610); g.lineTo(x, 846); g.stroke(); } for (let y = 630; y < 848; y += 22) { g.beginPath(); g.moveTo(982, y); g.lineTo(1198, y); g.stroke(); }
  // buildings: workshop, shop, office, dining hall
  house(g, { x: 220, y: 216, w: 210, d: 120, h: 64, roof: '#c2643f', wall: '#f3e3c3', door: 85, wins: [14, 48, 136, 170] });
  g.fillStyle = '#8a5a44'; g.fillRect(384, 244, 16, 24); g.fillStyle = '#6d4635'; g.fillRect(382, 240, 20, 6);
  [[228, 70], [352, 60]].forEach(([x, w]) => { g.fillStyle = 'rgba(30,40,20,.2)'; g.fillRect(x + 3, 414, w, 15); g.fillStyle = '#c9a36a'; rr(g, x, 410, w, 15, 3); g.fill(); g.fillStyle = '#e5e8ea'; g.fillRect(x + 5, 412, 20, 10); g.fillRect(x + w - 25, 412, 20, 10); g.fillStyle = '#9cc46a'; g.fillRect(x + 7, 414, 16, 6); });
  house(g, { x: 535, y: 95, w: 230, d: 110, h: 64, roof: '#4f7896', wall: '#f6ead0', door: 95, wins: [16, 54, 148, 186] });
  for (let i = 0; i < 9; i++) { g.fillStyle = i % 2 ? '#fbf3e2' : '#c94f3f'; g.beginPath(); g.moveTo(586 + i * 14.2, 207); g.lineTo(600.2 + i * 14.2, 207); g.lineTo(578 + (i + 1) * 16, 230); g.lineTo(578 + i * 16, 230); g.closePath(); g.fill(); }
  [[548, '#6fb84a'], [574, '#e9a13a'], [600, '#b02a3a'], [678, '#8fd05c'], [704, '#7b4a86'], [730, '#e3c35a']].forEach(([x, c]) => crate(g, x, 277, c));
  g.fillStyle = '#3f78b5'; rr(g, 784, 286, 34, 18, 4); g.fill(); g.fillStyle = '#2b2a26'; disc(g, 790, 306, 5); disc(g, 812, 306, 5); g.fillStyle = '#c99a5b'; g.fillRect(788, 278, 22, 10);
  house(g, { x: 870, y: 216, w: 210, d: 120, h: 64, roof: '#5c6f5a', wall: '#efe6cf', door: 85, wins: [14, 48, 136, 170] });
  g.fillStyle = '#7a5230'; g.fillRect(868, 412, 5, 34); g.fillRect(919, 412, 5, 34); rr(g, 864, 404, 64, 32, 3); g.fill(); g.fillStyle = '#fbf6e9'; [[869, 409], [884, 409], [899, 409], [869, 422], [890, 422]].forEach((p) => g.fillRect(p[0], p[1], 12, 9)); g.fillStyle = '#f0b429'; g.fillRect(908, 422, 14, 9);
  house(g, { x: 985, y: 430, w: 210, d: 110, h: 64, roof: '#d3a243', wall: '#f7ecd2', door: 85, wins: [14, 48, 136, 170] });
  g.fillStyle = '#7a5230'; g.fillRect(1012, 640, 4, 18); g.fillRect(1078, 640, 4, 18); rr(g, 1004, 612, 86, 36, 3); g.fill(); g.fillStyle = '#2f5a48'; g.fillRect(1008, 616, 78, 28); g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(1014, 624); g.lineTo(1050, 624); g.moveTo(1014, 631); g.lineTo(1040, 631); g.moveTo(1014, 638); g.lineTo(1058, 638); g.stroke(); g.fillStyle = 'rgba(255,255,255,.8)'; disc(g, 1072, 628, 5);
  g.fillStyle = 'rgba(30,40,20,.2)'; g.fillRect(1124, 618, 70, 14); g.fillStyle = '#b98a55'; rr(g, 1120, 614, 70, 14, 3); g.fill(); g.fillStyle = '#555c60'; disc(g, 1138, 620, 6.5); g.fillStyle = '#8fd05c'; disc(g, 1138, 620, 4.4); g.fillStyle = '#555c60'; disc(g, 1160, 620, 6.5); g.fillStyle = '#e9a13a'; disc(g, 1160, 620, 4.4); g.fillStyle = '#fbf6e9'; disc(g, 1180, 621, 5);
  g.fillStyle = '#6b4a2a'; [[982, 610], [1192, 610], [982, 840], [1192, 840]].forEach((p) => g.fillRect(p[0], p[1], 6, 6));
  for (let i = 0; i <= 10; i++) { const k = i / 10; LIGHTS.push([lerp(985, 1195, k), 852 - Math.sin(k * Math.PI) * 8]); }      // a string of bulbs along the terrace's edge, lit at dusk
  // gate posts
  const gp = pol(GATE, 612), gv = [-Math.sin(rad(GATE)), Math.cos(rad(GATE))];
  [-1, 1].forEach((k) => { g.fillStyle = 'rgba(30,40,20,.22)'; oval(g, gp[0] + gv[0] * 48 * k + 5, gp[1] + gv[1] * 48 * k + 7, 9, 4); g.fillStyle = '#7a5230'; g.fillRect(gp[0] + gv[0] * 48 * k - 5, gp[1] + gv[1] * 48 * k - 36, 10, 42); });
  // trees: mulberry and cinnamon just inside the hedge, fruit trees by the gate, one old tree in the middle of the park, woods outside
  for (let a = 0; a < 360; a += 5.6) { if (a > GATE - 7 && a < GATE + 7) continue; const p = pol(a + rnd() * 2, 594 + rnd() * 8); if (p[0] > 880 && p[0] < 1090 && p[1] > 905 && p[1] < 1075) continue; TREES.push([p[0], p[1], 15 + rnd() * 7, 0]); }
  [[80, 395], [87, 465], [81, 535], [93, 400], [94, 540], [88, 350], [77, 470]].forEach(([a, r]) => { const p = pol(a, r); TREES.push([p[0], p[1], 22, 1]); });
  [[315, 228], [225, 228], [135, 230]].forEach(([a, r]) => { const p = pol(a, r); TREES.push([p[0], p[1], 17, 0]); });
  const ux = Math.cos(rad(GATE)), uy = Math.sin(rad(GATE));
  for (let i = 0; i < 170; i++) { const x = 46 + rnd() * (WW - 92), y = 64 + rnd() * (WH - 104), onRoad = Math.abs((x - CX) * uy - (y - CY) * ux) < 50 && (x - CX) * ux + (y - CY) * uy > 0; if (Math.hypot(x - CX, y - CY) > RB + 26 && !onRoad) TREES.push([x, y, 16 + rnd() * 12, 3]); }
  TREES.push([CX, CY + 2, 60, 2]);
  TREES.sort((a, b) => a[1] - b[1]);
  TREES.forEach(([x, y, r, kind]) => {
    g.fillStyle = 'rgba(26,40,18,.24)'; oval(g, x + r * 0.4, y + r * 0.38, r * 1.0, r * 0.55);
    g.fillStyle = '#6b4a2a'; g.fillRect(x - r * 0.1, y - r * 0.35, r * 0.2, r * 0.5);
    const cy = y - r * 0.62, lobes = kind === 2 ? 9 : 5, dark = kind === 3;
    o.fillStyle = dark ? '#3a6f3a' : kind === 1 ? '#4a8a40' : '#447f3e'; disc(o, x, cy, r);
    for (let k = 0; k < lobes; k++) { const a = k / lobes * TAU + rnd(), rr2 = r * (0.5 + rnd() * 0.18); o.fillStyle = dark ? (k % 2 ? '#4a8546' : '#417a3f') : k % 2 ? '#5e9f4e' : '#52913f'; disc(o, x + Math.cos(a) * r * 0.55, cy + Math.sin(a) * r * 0.5, rr2); }
    o.fillStyle = dark ? 'rgba(160,200,120,.35)' : 'rgba(190,225,130,.5)'; disc(o, x - r * 0.3, cy - r * 0.34, r * 0.34);
    if (kind === 1) { o.fillStyle = '#f09a2a'; for (let k = 0; k < 6; k++) disc(o, x + (rnd() - 0.5) * r * 1.3, cy + (rnd() - 0.5) * r * 1.1, 2.6); }
  });
  // above people's heads: shed roof, greenhouse cover, the beam of the gate
  g.fillStyle = 'rgba(30,40,20,.18)'; g.fillRect(200, 724, 116, 8);
  g.fillStyle = '#b0854f'; rr(g, 194, 654, 124, 70, 4); g.fill(); g.strokeStyle = 'rgba(90,60,30,.35)'; g.lineWidth = 1.2; for (let x = 206; x < 316; x += 12) { g.beginPath(); g.moveTo(x, 655); g.lineTo(x, 723); g.stroke(); }
  o.fillStyle = 'rgba(255,255,255,.34)'; rr(o, 896, 921, 178, 138, 16); o.fill(); o.strokeStyle = 'rgba(255,255,255,.8)'; o.lineWidth = 2; for (let x = 915; x < 1069; x += 26) { o.beginPath(); o.moveTo(x, 923); o.lineTo(x, 1057); o.stroke(); } o.beginPath(); o.moveTo(898, 990); o.lineTo(1072, 990); o.stroke(); o.strokeStyle = 'rgba(110,135,125,.85)'; rr(o, 896, 921, 178, 138, 16); o.stroke();
  o.save(); o.translate(gp[0], gp[1] - 40); o.rotate(rad(GATE - 90)); o.fillStyle = '#7a5230'; rr(o, -60, -9, 120, 18, 6); o.fill(); o.fillStyle = '#93683e'; rr(o, -56, -6, 112, 5, 2); o.fill(); o.restore();
  const props = [690, 786].map((y) => ({ y: y + 1, draw(c) { c.fillStyle = 'rgba(30,40,20,.22)'; rr(c, 992, y - 8, 200, 24, 6); c.fill(); c.fillStyle = '#b98a55'; rr(c, 988, y - 12, 200, 24, 6); c.fill(); c.fillStyle = '#f1e2b6'; c.fillRect(998, y - 2, 180, 5); } }));
  return { base, over, windows: WIN, lights: LIGHTS, props };
}
