// Grid pathfinding. A grid is { rows, cols, walls: Set<number>, weights: Set<number> }.
// Cells are indexed as r * cols + c. Weighted cells cost 5 instead of 1.
// Each algorithm returns { visited: number[] (in order), path: number[] (start→end), cost }.

export const WEIGHT = 5;
const DIRS = [[-1, 0], [0, 1], [1, 0], [0, -1]];

export function neighbors(g, id) {
  const r = Math.floor(id / g.cols), c = id % g.cols;
  const out = [];
  for (const [dr, dc] of DIRS) {
    const nr = r + dr, nc = c + dc;
    if (nr < 0 || nc < 0 || nr >= g.rows || nc >= g.cols) continue;
    const n = nr * g.cols + nc;
    if (!g.walls.has(n)) out.push(n);
  }
  return out;
}
const cost = (g, id) => (g.weights.has(id) ? WEIGHT : 1);
const manhattan = (g, a, b) => Math.abs(Math.floor(a / g.cols) - Math.floor(b / g.cols)) + Math.abs((a % g.cols) - (b % g.cols));

function build(prev, end, g) {
  if (prev.get(end) === undefined) return { path: [], cost: Infinity };
  const path = [];
  for (let cur = end; cur !== null; cur = prev.get(cur)) path.push(cur);
  path.reverse();
  return { path, cost: path.slice(1).reduce((a, id) => a + cost(g, id), 0) };
}

export function bfs(g, start, end) {
  const prev = new Map([[start, null]]);
  const visited = [];
  const queue = [start];
  for (let h = 0; h < queue.length; h++) {
    const cur = queue[h];
    visited.push(cur);
    if (cur === end) break;
    for (const n of neighbors(g, cur)) if (!prev.has(n)) { prev.set(n, cur); queue.push(n); }
  }
  return { visited, ...build(prev, end, g) };
}

export function dfs(g, start, end) {
  const prev = new Map([[start, null]]);
  const seen = new Set();
  const visited = [];
  const stack = [start];
  while (stack.length) {
    const cur = stack.pop();
    if (seen.has(cur)) continue;
    seen.add(cur);
    visited.push(cur);
    if (cur === end) break;
    for (const n of neighbors(g, cur).reverse()) if (!seen.has(n)) { prev.set(n, cur); stack.push(n); }
  }
  return { visited, ...build(prev, end, g) };
}

// Minimal binary heap keyed by priority.
class MinHeap {
  constructor() { this.a = []; }
  get size() { return this.a.length; }
  push(item, p) {
    const a = this.a; a.push([p, item]);
    let i = a.length - 1;
    while (i > 0) { const pa = (i - 1) >> 1; if (a[pa][0] <= a[i][0]) break; [a[pa], a[i]] = [a[i], a[pa]]; i = pa; }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < a.length && a[l][0] < a[m][0]) m = l;
        if (r < a.length && a[r][0] < a[m][0]) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]]; i = m;
      }
    }
    return top[1];
  }
}

function bestFirst(g, start, end, h, useCost) {
  const prev = new Map([[start, null]]);
  const dist = new Map([[start, 0]]);
  const done = new Set();
  const visited = [];
  const open = new MinHeap();
  open.push(start, h(start));
  while (open.size) {
    const cur = open.pop();
    if (done.has(cur)) continue;
    done.add(cur);
    visited.push(cur);
    if (cur === end) break;
    for (const n of neighbors(g, cur)) {
      if (done.has(n)) continue;
      const d = dist.get(cur) + cost(g, n);
      if (!dist.has(n) || d < dist.get(n)) {
        dist.set(n, d);
        prev.set(n, cur);
        open.push(n, (useCost ? d : 0) + h(n));
      }
    }
  }
  return { visited, ...build(prev, end, g) };
}

export const dijkstra = (g, s, e) => bestFirst(g, s, e, () => 0, true);
export const astar = (g, s, e) => bestFirst(g, s, e, (n) => manhattan(g, n, e), true);
export const greedy = (g, s, e) => bestFirst(g, s, e, (n) => manhattan(g, n, e), false);

export const PATHS = {
  astar: { fn: astar, name: "A* search", weighted: true, shortest: true, about: "Dijkstra plus a hint: it prefers cells closer to the goal (Manhattan distance). Finds the cheapest path while exploring far less." },
  dijkstra: { fn: dijkstra, name: "Dijkstra", weighted: true, shortest: true, about: "Explores in order of total cost from the start. Always finds the cheapest path, and respects weights." },
  bfs: { fn: bfs, name: "Breadth-first search", weighted: false, shortest: true, about: "Explores in rings, one step further each time. Shortest path in steps, but ignores weights." },
  greedy: { fn: greedy, name: "Greedy best-first", weighted: true, shortest: false, about: "Always heads for the cell that looks closest to the goal. Very fast, but the path isn't guaranteed to be shortest." },
  dfs: { fn: dfs, name: "Depth-first search", weighted: false, shortest: false, about: "Goes as deep as possible before backtracking. Finds a path, often a long, winding one." },
};

// Maze: randomized depth-first carving on odd cells. Returns a Set of wall ids.
export function maze(rows, cols, keep = [], rand = Math.random) {
  const walls = new Set();
  for (let i = 0; i < rows * cols; i++) walls.add(i);
  const id = (r, c) => r * cols + c;
  const startR = 1, startC = 1;
  const stack = [[startR, startC]];
  walls.delete(id(startR, startC));
  while (stack.length) {
    const [r, c] = stack[stack.length - 1];
    const opts = DIRS.map(([dr, dc]) => [r + dr * 2, c + dc * 2, r + dr, c + dc])
      .filter(([nr, nc]) => nr > 0 && nc > 0 && nr < rows - 1 && nc < cols - 1 && walls.has(id(nr, nc)));
    if (!opts.length) { stack.pop(); continue; }
    const [nr, nc, wr, wc] = opts[Math.floor(rand() * opts.length)];
    walls.delete(id(wr, wc));
    walls.delete(id(nr, nc));
    stack.push([nr, nc]);
  }
  // open start/end and their neighbours so they're always reachable
  for (const k of keep) {
    walls.delete(k);
    const r = Math.floor(k / cols), c = k % cols;
    for (const [dr, dc] of DIRS) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nc >= 0 && nr < rows && nc < cols && !walls.has(id(nr, nc))) break;
      if (nr > 0 && nc > 0 && nr < rows - 1 && nc < cols - 1) { walls.delete(id(nr, nc)); break; }
    }
  }
  return walls;
}
