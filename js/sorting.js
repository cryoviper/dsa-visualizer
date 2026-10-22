// Sorting algorithms as generators. Each yields steps the UI can animate:
//   { t: "cmp", i, j }        compare a[i] and a[j]
//   { t: "swap", i, j }       swap a[i] and a[j]
//   { t: "set", i, v }        write value v at a[i]
//   { t: "done", i }          index i is in its final position
// They sort the array in place, so the final array can be checked in tests.

export function* bubble(a) {
  const n = a.length;
  for (let end = n - 1; end > 0; end--) {
    let swapped = false;
    for (let i = 0; i < end; i++) {
      yield { t: "cmp", i, j: i + 1 };
      if (a[i] > a[i + 1]) {
        [a[i], a[i + 1]] = [a[i + 1], a[i]];
        swapped = true;
        yield { t: "swap", i, j: i + 1 };
      }
    }
    yield { t: "done", i: end };
    if (!swapped) break; // already sorted: best case O(n)
  }
  for (let i = 0; i < n; i++) yield { t: "done", i };
}

export function* selection(a) {
  const n = a.length;
  for (let i = 0; i < n - 1; i++) {
    let min = i;
    for (let j = i + 1; j < n; j++) {
      yield { t: "cmp", i: min, j };
      if (a[j] < a[min]) min = j;
    }
    if (min !== i) {
      [a[i], a[min]] = [a[min], a[i]];
      yield { t: "swap", i, j: min };
    }
    yield { t: "done", i };
  }
  yield { t: "done", i: n - 1 };
}

export function* insertion(a) {
  const n = a.length;
  for (let i = 1; i < n; i++) {
    let j = i;
    while (j > 0) {
      yield { t: "cmp", i: j - 1, j };
      if (a[j - 1] <= a[j]) break;
      [a[j - 1], a[j]] = [a[j], a[j - 1]];
      yield { t: "swap", i: j - 1, j };
      j--;
    }
  }
  for (let i = 0; i < n; i++) yield { t: "done", i };
}

export function* merge(a) {
  const tmp = a.slice();
  function* sort(lo, hi) {
    if (hi - lo < 1) return;
    const mid = (lo + hi) >> 1;
    yield* sort(lo, mid);
    yield* sort(mid + 1, hi);
    let i = lo, j = mid + 1, k = lo;
    while (i <= mid && j <= hi) {
      yield { t: "cmp", i, j };
      tmp[k++] = a[i] <= a[j] ? a[i++] : a[j++]; // <= keeps it stable
    }
    while (i <= mid) tmp[k++] = a[i++];
    while (j <= hi) tmp[k++] = a[j++];
    for (let x = lo; x <= hi; x++) {
      a[x] = tmp[x];
      yield { t: "set", i: x, v: a[x] };
    }
  }
  yield* sort(0, a.length - 1);
  for (let i = 0; i < a.length; i++) yield { t: "done", i };
}

export function* quick(a) {
  function* part(lo, hi) {
    // median-of-three pivot avoids the O(n²) case on sorted input
    const mid = (lo + hi) >> 1;
    if (a[mid] < a[lo]) { [a[mid], a[lo]] = [a[lo], a[mid]]; yield { t: "swap", i: lo, j: mid }; }
    if (a[hi] < a[lo]) { [a[hi], a[lo]] = [a[lo], a[hi]]; yield { t: "swap", i: lo, j: hi }; }
    if (a[mid] < a[hi]) { [a[mid], a[hi]] = [a[hi], a[mid]]; yield { t: "swap", i: mid, j: hi }; }
    const pivot = a[hi];
    let i = lo;
    for (let j = lo; j < hi; j++) {
      yield { t: "cmp", i: j, j: hi };
      if (a[j] < pivot) {
        if (i !== j) { [a[i], a[j]] = [a[j], a[i]]; yield { t: "swap", i, j }; }
        i++;
      }
    }
    if (i !== hi) { [a[i], a[hi]] = [a[hi], a[i]]; yield { t: "swap", i, j: hi }; }
    return i;
  }
  function* sort(lo, hi) {
    if (lo >= hi) { if (lo === hi) yield { t: "done", i: lo }; return; }
    const p = yield* part(lo, hi);
    yield { t: "done", i: p };
    yield* sort(lo, p - 1);
    yield* sort(p + 1, hi);
  }
  yield* sort(0, a.length - 1);
}

export function* heap(a) {
  const n = a.length;
  function* sift(start, end) {
    let root = start;
    for (;;) {
      let child = 2 * root + 1;
      if (child > end) return;
      if (child + 1 <= end) {
        yield { t: "cmp", i: child, j: child + 1 };
        if (a[child] < a[child + 1]) child++;
      }
      yield { t: "cmp", i: root, j: child };
      if (a[root] < a[child]) {
        [a[root], a[child]] = [a[child], a[root]];
        yield { t: "swap", i: root, j: child };
        root = child;
      } else return;
    }
  }
  for (let s = (n >> 1) - 1; s >= 0; s--) yield* sift(s, n - 1);
  for (let end = n - 1; end > 0; end--) {
    [a[0], a[end]] = [a[end], a[0]];
    yield { t: "swap", i: 0, j: end };
    yield { t: "done", i: end };
    yield* sift(0, end - 1);
  }
  if (n) yield { t: "done", i: 0 };
}

export const SORTS = {
  bubble: { fn: bubble, name: "Bubble sort", best: "O(n)", avg: "O(n²)", worst: "O(n²)", space: "O(1)", stable: true,
    about: "Repeatedly swaps neighbours that are in the wrong order. The biggest value 'bubbles' to the end each pass. Stops early if a pass makes no swaps." },
  selection: { fn: selection, name: "Selection sort", best: "O(n²)", avg: "O(n²)", worst: "O(n²)", space: "O(1)", stable: false,
    about: "Finds the smallest remaining value and puts it at the front. Few swaps, but always does n² comparisons." },
  insertion: { fn: insertion, name: "Insertion sort", best: "O(n)", avg: "O(n²)", worst: "O(n²)", space: "O(1)", stable: true,
    about: "Builds a sorted prefix one item at a time, sliding each new item left into place. Very fast on nearly sorted data." },
  merge: { fn: merge, name: "Merge sort", best: "O(n log n)", avg: "O(n log n)", worst: "O(n log n)", space: "O(n)", stable: true,
    about: "Splits the array in half, sorts each half, then merges them. Predictable speed, but needs extra memory." },
  quick: { fn: quick, name: "Quick sort", best: "O(n log n)", avg: "O(n log n)", worst: "O(n²)", space: "O(log n)", stable: false,
    about: "Picks a pivot (median of three here), moves smaller values left and larger right, then sorts each side. Usually the fastest in practice." },
  heap: { fn: heap, name: "Heap sort", best: "O(n log n)", avg: "O(n log n)", worst: "O(n log n)", space: "O(1)", stable: false,
    about: "Turns the array into a max-heap, then repeatedly moves the largest value to the end. In-place with guaranteed n log n." },
};
