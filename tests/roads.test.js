import { describe, it, expect } from 'vitest';
import { readData } from './helpers/data.js';
import { createRoads } from '../js/engine/roads.js';

const d = readData();

describe('roads', () => {
  it('門市到餐廳走環狀步道，不抄中間的公園', () => {
    const r = createRoads(d.map), path = r.route(d.map.nodes.shop, d.map.nodes.dining);
    expect(path).toHaveLength(7);
    const len = path.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - path[i][0], p[1] - path[i][1]), 0);
    expect(len).toBeCloseTo(543.7, 0);
  });
  it('不在路上的點，先接到最近的路', () => {
    expect(createRoads(d.map).project([650, 300]).q).toEqual([650, 318]);
  });
  it('同一條路上的兩點，直接走過去', () => {
    expect(createRoads(d.map).route([650, 330], [650, 350])).toHaveLength(2);
  });
});
