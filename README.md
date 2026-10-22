# Algo Lab · DSA Visualizer

Watch sorting and pathfinding algorithms run step by step. Draw walls and weights, generate mazes, drag the start and end points, and compare how each algorithm explores.

**Live:** https://cryoviper.github.io/dsa-visualizer/

## Sorting

Bubble, Selection, Insertion, Merge, Quick (median-of-three pivot) and Heap sort.

- Play, pause, single step, and speed control
- Data presets: random, nearly sorted, reversed, few unique (great for seeing best and worst cases)
- Live counters for comparisons and swaps/writes
- Best, average and worst time complexity, space and stability for each algorithm

## Pathfinding

A*, Dijkstra, Breadth-first, Greedy best-first and Depth-first search.

- Draw walls or weighted cells (cost ×5) with mouse or touch; erase mode
- Drag the start or end square; after a run, the path re-routes live as you drag
- Maze generator (randomized depth-first carving)
- Stats: cells visited, path length and total cost, so you can see A* explore less than Dijkstra and BFS ignore weights

## How it's built

- Vanilla JavaScript ES modules, no libraries, no build step
- Each sorting algorithm is a **generator function** that `yield`s steps (`compare`, `swap`, `set`, `done`). The UI just plays the steps back, so the algorithm code stays clean and testable
- Dijkstra, A* and Greedy share one best-first search with a small **binary heap** priority queue
- 42 tests with the built-in `node:test` runner check every sort on random, sorted, reversed, duplicate and empty input, plus shortest paths, weights and maze reachability
- GitHub Actions runs the tests before every deploy

## Run locally

```bash
git clone https://github.com/cryoviper/dsa-visualizer.git
cd dsa-visualizer
npm test          # run the algorithm tests (Node 20+)
npx serve .       # open the printed URL
```

## What I learned

- Using generators to pause and resume an algorithm
- Why A* explores fewer cells than Dijkstra, and when BFS is enough
- Writing tests that cover edge cases (empty arrays, duplicates, unreachable goals)

---

Built by [Praveen Sinwar](https://github.com/cryoviper).
