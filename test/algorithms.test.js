import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { SORTS } from "../js/sorting.js";
import { PATHS, bfs, maze } from "../js/pathfinding.js";

const random = (n, seed = 7) => {
  let s = seed;
  return Array.from({ length: n }, () => ((s = (s * 16807) % 2147483647) % 100) + 1);
};

describe("sorting", () => {
  const inputs = { random: random(60), sorted: [...Array(30).keys()], reversed: [...Array(30).keys()].reverse(), dupes: [3, 1, 3, 2, 1, 3, 2], empty: [], one: [5] };
  for (const [key, algo] of Object.entries(SORTS)) {
    for (const [name, input] of Object.entries(inputs)) {
      test(`${key} sorts ${name} input`, () => {
        const a = input.slice();
        const steps = [...algo.fn(a)];
        assert.deepEqual(a, input.slice().sort((x, y) => x - y));
        if (a.length) assert.ok(steps.some((s) => s.t === "done"));
      });
    }
  }
  test("bubble sort stops early on sorted input (best case)", () => {
    const a = [...Array(20).keys()];
    const cmps = [...SORTS.bubble.fn(a)].filter((s) => s.t === "cmp").length;
    assert.equal(cmps, 19);
  });
});

describe("pathfinding", () => {
  const open = (rows, cols) => ({ rows, cols, walls: new Set(), weights: new Set() });

  test("BFS finds the shortest path on an open grid", () => {
    const g = open(5, 5);
    const r = bfs(g, 0, 24);
    assert.equal(r.path.length, 9); // 8 moves
    assert.equal(r.path[0], 0);
    assert.equal(r.path.at(-1), 24);
  });

  test("returns no path when the goal is walled off", () => {
    const g = open(3, 3);
    [1, 3, 4].forEach((w) => g.walls.add(w));
    for (const { fn } of Object.values(PATHS)) assert.equal(fn(g, 0, 8).path.length, 0);
  });

  test("Dijkstra and A* avoid expensive weighted cells", () => {
    // 3x5 grid; the straight middle row is weighted, the top row is free.
    const g = open(3, 5);
    [6, 7, 8].forEach((w) => g.weights.add(w));
    const d = PATHS.dijkstra.fn(g, 5, 9);
    const a = PATHS.astar.fn(g, 5, 9);
    assert.equal(d.cost, 6);
    assert.equal(a.cost, 6);
    assert.ok(bfs(g, 5, 9).cost > 6); // BFS ignores weights and goes straight through
  });

  test("A* visits fewer cells than Dijkstra on an open grid", () => {
    const g = open(20, 20);
    assert.ok(PATHS.astar.fn(g, 0, 399).visited.length < PATHS.dijkstra.fn(g, 0, 399).visited.length);
  });

  test("maze keeps start and end reachable", () => {
    let s = 3;
    const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const rows = 21, cols = 31, start = 10 * cols + 2, end = 10 * cols + 28;
    const g = { rows, cols, walls: maze(rows, cols, [start, end], rand), weights: new Set() };
    assert.ok(bfs(g, start, end).path.length > 0);
  });
});
