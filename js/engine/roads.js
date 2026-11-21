// Road network: nearest point on any road, and the shortest walk along the roads.
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function createRoads(map) {
  const N = map.nodes, E = map.edges, ADJ = {};
  Object.keys(N).forEach((k) => { ADJ[k] = []; });
  E.forEach(([a, b]) => {
    const d = Math.hypot(N[a][0] - N[b][0], N[a][1] - N[b][1]);
    ADJ[a].push([b, d]);
    ADJ[b].push([a, d]);
  });

  // The nearest point on any road.
  function project(p) {
    let best = null;
    for (let i = 0; i < E.length; i++) {
      const A = N[E[i][0]], B = N[E[i][1]], dx = B[0] - A[0], dy = B[1] - A[1];
      const t = clamp(((p[0] - A[0]) * dx + (p[1] - A[1]) * dy) / (dx * dx + dy * dy), 0, 1);
      const q = [A[0] + dx * t, A[1] + dy * t], d = Math.hypot(p[0] - q[0], p[1] - q[1]);
      if (!best || d < best.d) best = { d, i, q };
    }
    return best;
  }

  // The shortest walk along the roads between two points.
  function route(from, to) {
    const s = project(from), e = project(to);
    if (s.i === e.i) return [s.q, e.q];
    const len = (q, k) => Math.hypot(q[0] - N[k][0], q[1] - N[k][1]);
    const fromS = E[s.i].map((k) => [k, len(s.q, k)]), toT = {};
    E[e.i].forEach((k) => { toT[k] = len(e.q, k); });
    const nbrs = (k) => (k === 'S' ? fromS : k === 'T' ? [] : toT[k] !== undefined ? ADJ[k].concat([['T', toT[k]]]) : ADJ[k]);
    const dist = { S: 0 }, prev = {}, done = {};
    for (;;) {
      let u = null;
      for (const k in dist) if (!done[k] && (u === null || dist[k] < dist[u])) u = k;
      if (u === null || u === 'T') break;
      done[u] = 1;
      nbrs(u).forEach(([v, w]) => {
        const nd = dist[u] + w;
        if (dist[v] === undefined || nd < dist[v]) { dist[v] = nd; prev[v] = u; }
      });
    }
    const pts = [e.q];
    for (let k = prev.T; k && k !== 'S'; k = prev[k]) pts.push(N[k]);
    pts.push(s.q);
    return pts.reverse();
  }

  return { project, route };
}
