import { SORTS } from "./sorting.js";
import { PATHS, maze } from "./pathfinding.js";

const $ = (id) => document.getElementById(id);
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---------- tabs ----------
const tabs = { sort: $("tab-sort"), path: $("tab-path") };
function showTab(name) {
  for (const [k, btn] of Object.entries(tabs)) {
    const on = k === name;
    btn.setAttribute("aria-selected", String(on));
    $(`panel-${k}`).hidden = !on;
  }
  if (name === "path") buildGrid();
  try { history.replaceState(null, "", name === "path" ? "#path" : "#sort"); } catch { /* ignore */ }
}
tabs.sort.addEventListener("click", () => { stopSort(); showTab("sort"); });
tabs.path.addEventListener("click", () => { stopSort(); showTab("path"); });

// =====================================================================
// SORTING
// =====================================================================
const S = { data: [], gen: null, timer: null, playing: false, cmp: 0, swap: 0, done: new Set(), finished: false };
const barsEl = $("bars");

for (const [k, v] of Object.entries(SORTS)) $("sAlgo").append(new Option(v.name, k));
$("sAlgo").value = "quick";

function makeData() {
  const n = Number($("sSize").value);
  const preset = $("sPreset").value;
  let a = Array.from({ length: n }, (_, i) => Math.round(((i + 1) / n) * 100));
  if (preset === "few") a = Array.from({ length: n }, () => [20, 45, 70, 95][Math.floor(Math.random() * 4)]);
  if (preset === "random" || preset === "few") {
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  }
  if (preset === "reversed") a.reverse();
  if (preset === "nearly") for (let k = 0; k < Math.max(1, n / 12); k++) { const i = Math.floor(Math.random() * (n - 1)); [a[i], a[i + 1]] = [a[i + 1], a[i]]; }
  return a;
}

function resetSort(newData = true) {
  stopSort();
  if (newData) S.data = makeData();
  S.gen = null; S.cmp = 0; S.swap = 0; S.done = new Set(); S.finished = false;
  barsEl.replaceChildren(...S.data.map((v) => { const b = document.createElement("i"); b.style.height = v + "%"; return b; }));
  updateSortInfo();
  setStatus("Ready");
  $("sPlay").textContent = "Play";
}

function updateSortInfo() {
  const a = SORTS[$("sAlgo").value];
  $("sName").textContent = a.name;
  $("sAbout").textContent = a.about;
  $("cxBest").textContent = a.best; $("cxAvg").textContent = a.avg; $("cxWorst").textContent = a.worst;
  $("cxSpace").textContent = a.space; $("cxStable").textContent = a.stable ? "Yes" : "No";
  $("stCmp").textContent = S.cmp.toLocaleString();
  $("stSwap").textContent = S.swap.toLocaleString();
}
const setStatus = (t) => ($("stStatus").textContent = t);

let lastMarks = [];
function applyStep(step) {
  const bars = barsEl.children;
  lastMarks.forEach((i) => bars[i]?.classList.remove("cmp", "swap"));
  lastMarks = [];
  if (step.t === "cmp") {
    S.cmp++;
    bars[step.i].classList.add("cmp"); bars[step.j].classList.add("cmp");
    lastMarks = [step.i, step.j];
  } else if (step.t === "swap") {
    S.swap++;
    const hi = bars[step.i].style.height;
    bars[step.i].style.height = bars[step.j].style.height;
    bars[step.j].style.height = hi;
    bars[step.i].classList.add("swap"); bars[step.j].classList.add("swap");
    lastMarks = [step.i, step.j];
  } else if (step.t === "set") {
    S.swap++;
    bars[step.i].style.height = step.v + "%";
    bars[step.i].classList.add("swap");
    lastMarks = [step.i];
  } else if (step.t === "done") {
    S.done.add(step.i);
    bars[step.i].classList.add("done");
  }
}

function stepOnce() {
  if (S.finished) return false;
  if (!S.gen) S.gen = SORTS[$("sAlgo").value].fn(S.data); // sorts S.data in place; bars mirror it
  const { value, done } = S.gen.next();
  if (done) { finishSort(); return false; }
  applyStep(value);
  return true;
}

function finishSort() {
  S.finished = true;
  lastMarks.forEach((i) => barsEl.children[i]?.classList.remove("cmp", "swap"));
  [...barsEl.children].forEach((b) => b.classList.add("done"));
  stopSort();
  setStatus("Sorted");
  $("sPlay").textContent = "Replay";
  updateSortInfo();
}

function tick() {
  // speed 1..100 → steps per frame and frame delay
  const sp = Number($("sSpeed").value);
  const perFrame = sp > 80 ? Math.ceil((sp - 80) / 2) : 1;
  for (let k = 0; k < perFrame; k++) if (!stepOnce()) return;
  updateSortInfo();
  S.timer = setTimeout(tick, sp > 80 ? 0 : Math.round(220 - sp * 2.7));
}

function playSort() {
  if (S.finished) resetSort(true);
  S.playing = true;
  $("sPlay").textContent = "Pause";
  setStatus("Running");
  disableSortInputs(true);
  if (reduceMotion) { while (stepOnce()); updateSortInfo(); return; }
  tick();
}
function stopSort() {
  clearTimeout(S.timer);
  S.playing = false;
  if (!S.finished && S.gen) { setStatus("Paused"); $("sPlay").textContent = "Resume"; }
  disableSortInputs(false);
}
function disableSortInputs(on) {
  ["sAlgo", "sPreset", "sSize"].forEach((id) => ($(id).disabled = on));
}

$("sPlay").addEventListener("click", () => (S.playing ? stopSort() : playSort()));
$("sStep").addEventListener("click", () => { if (S.playing) stopSort(); stepOnce(); updateSortInfo(); if (!S.finished) setStatus("Stepping"); });
$("sShuffle").addEventListener("click", () => resetSort(true));
$("sAlgo").addEventListener("change", () => { resetSort(false); S.data = [...barsEl.children].map((b) => parseFloat(b.style.height)); });
$("sPreset").addEventListener("change", () => resetSort(true));
$("sSize").addEventListener("input", () => { $("sSizeVal").textContent = $("sSize").value; resetSort(true); });

// =====================================================================
// PATHFINDING
// =====================================================================
const G = { rows: 0, cols: 0, walls: new Set(), weights: new Set(), start: 0, end: 0, running: false, timers: [], hasResult: false };
const gridEl = $("grid");
for (const [k, v] of Object.entries(PATHS)) $("pAlgo").append(new Option(v.name, k));

function dims() {
  const w = gridEl.parentElement.clientWidth - 34;
  const cols = Math.max(15, Math.min(51, Math.floor(w / 24)));
  const odd = (n) => (n % 2 ? n : n - 1);
  return { cols: odd(cols), rows: odd(Math.max(13, Math.min(25, Math.round(cols * 0.5)))) };
}

function buildGrid(force = false) {
  const { rows, cols } = dims();
  if (!force && rows === G.rows && cols === G.cols && gridEl.children.length) return;
  clearRun();
  G.rows = rows; G.cols = cols;
  G.walls = new Set(); G.weights = new Set();
  const mid = Math.floor(rows / 2);
  G.start = mid * cols + Math.floor(cols / 5);
  G.end = mid * cols + cols - 1 - Math.floor(cols / 5);
  gridEl.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  const frag = document.createDocumentFragment();
  for (let i = 0; i < rows * cols; i++) frag.append(document.createElement("i"));
  gridEl.replaceChildren(frag);
  paintAll();
  updatePathInfo();
}

function paintAll() {
  const cells = gridEl.children;
  for (let i = 0; i < cells.length; i++) paint(i, cells[i]);
}
function paint(i, el = gridEl.children[i]) {
  el.className = i === G.start ? "start" : i === G.end ? "end" : G.walls.has(i) ? "wall" : G.weights.has(i) ? "weight" : "";
}

function clearRun() {
  G.timers.forEach(clearTimeout);
  G.timers = [];
  G.running = false;
  G.hasResult = false;
  $("pRun").textContent = "Find path";
  for (const el of gridEl.children) el.classList.remove("visit", "path");
  $("pVisited").textContent = "0"; $("pLen").textContent = "—"; $("pCost").textContent = "—";
}

function updatePathInfo() {
  const a = PATHS[$("pAlgo").value];
  $("pName").textContent = a.name;
  $("pAbout").textContent = a.about;
  $("pW").textContent = a.weighted ? "Respected" : "Ignored";
  $("pS").textContent = a.shortest ? "Guaranteed" : "Not guaranteed";
}

function runPath(animate = true) {
  clearRun();
  const a = PATHS[$("pAlgo").value];
  const res = a.fn({ rows: G.rows, cols: G.cols, walls: G.walls, weights: G.weights }, G.start, G.end);
  const cells = gridEl.children;
  const visits = res.visited.filter((i) => i !== G.start && i !== G.end);
  const path = res.path.filter((i) => i !== G.start && i !== G.end);
  const finish = () => {
    G.running = false;
    G.hasResult = true;
    $("pRun").textContent = "Rerun";
    $("pVisited").textContent = res.visited.length.toLocaleString();
    $("pLen").textContent = res.path.length ? `${res.path.length - 1} steps` : "No path";
    $("pCost").textContent = res.path.length ? String(res.cost) : "—";
  };
  if (!animate || reduceMotion) {
    visits.forEach((i) => cells[i].classList.add("visit"));
    path.forEach((i) => cells[i].classList.add("path"));
    return finish();
  }
  G.running = true;
  $("pRun").textContent = "Stop";
  const sp = Number($("pSpeed").value);
  const delay = Math.max(1, 40 - sp * 0.38);
  const batch = sp > 85 ? 6 : sp > 60 ? 3 : 1;
  let t = 0;
  for (let k = 0; k < visits.length; k += batch) {
    const chunk = visits.slice(k, k + batch);
    G.timers.push(setTimeout(() => { chunk.forEach((i) => cells[i].classList.add("visit")); $("pVisited").textContent = String(k + chunk.length); }, (t += delay)));
  }
  path.forEach((i) => G.timers.push(setTimeout(() => { cells[i].classList.remove("visit"); cells[i].classList.add("path"); }, (t += 28))));
  G.timers.push(setTimeout(finish, t + 30));
}

// drawing with pointer events (mouse + touch)
let drag = null;
gridEl.addEventListener("pointerdown", (e) => {
  const cell = e.target.closest(".grid > i");
  if (!cell || G.running) return;
  e.preventDefault();
  const i = [...gridEl.children].indexOf(cell);
  const brush = document.querySelector('input[name="brush"]:checked').value;
  if (i === G.start) drag = { mode: "start" };
  else if (i === G.end) drag = { mode: "end" };
  else {
    const erasing = brush === "erase" || (brush === "wall" && G.walls.has(i)) || (brush === "weight" && G.weights.has(i));
    drag = { mode: erasing ? "erase" : brush };
    apply(i);
  }
  gridEl.setPointerCapture(e.pointerId);
});
gridEl.addEventListener("pointermove", (e) => {
  if (!drag) return;
  const el = document.elementFromPoint(e.clientX, e.clientY)?.closest(".grid > i");
  if (!el) return;
  const i = [...gridEl.children].indexOf(el);
  if (drag.last === i) return;
  drag.last = i;
  if (drag.mode === "start" || drag.mode === "end") {
    if (i === G.start || i === G.end || G.walls.has(i)) return;
    const prev = G[drag.mode];
    G[drag.mode] = i;
    paint(prev); paint(i);
    if (G.hasResult) runPath(false); // live re-route while dragging
  } else apply(i);
});
const endDrag = () => { drag = null; };
gridEl.addEventListener("pointerup", endDrag);
gridEl.addEventListener("pointercancel", endDrag);

function apply(i) {
  if (i === G.start || i === G.end) return;
  if (G.hasResult) clearRun();
  if (drag.mode === "wall") { G.walls.add(i); G.weights.delete(i); }
  else if (drag.mode === "weight") { G.weights.add(i); G.walls.delete(i); }
  else { G.walls.delete(i); G.weights.delete(i); }
  paint(i);
}

$("pRun").addEventListener("click", () => (G.running ? clearRun() : runPath(true)));
$("pClear").addEventListener("click", () => { clearRun(); G.walls.clear(); G.weights.clear(); paintAll(); });
$("pMaze").addEventListener("click", () => {
  clearRun();
  G.walls = maze(G.rows, G.cols, [G.start, G.end]);
  G.weights.clear();
  paintAll();
});
$("pAlgo").addEventListener("change", () => { updatePathInfo(); if (G.hasResult) runPath(false); });

let rt;
addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { if (!$("panel-path").hidden) buildGrid(); }, 200); });

// keyboard: space toggles play on the active tab
addEventListener("keydown", (e) => {
  if (e.code !== "Space" || /INPUT|SELECT|BUTTON|TEXTAREA/.test(document.activeElement.tagName)) return;
  e.preventDefault();
  if (!$("panel-sort").hidden) $("sPlay").click(); else $("pRun").click();
});

// ---------- start ----------
resetSort(true);
showTab(location.hash === "#path" ? "path" : "sort");
