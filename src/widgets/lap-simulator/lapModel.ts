/**
 * Turns a circuit outline into a full lap:
 *  1. evenly spaced centreline samples (the track itself),
 *  2. an optimal racing line inside the track width (minimum-curvature: outside → apex → outside),
 *  3. a physically plausible speed trace along that line (grip-limited corners, accel/brake limits),
 *  4. timestamps scaled so the lap matches the requested lap time.
 *
 * Input format (what you pass in for any lap):
 *   points: [x, y][] in metres (north-up), closed loop, any origin
 *   lapTime: seconds
 *   officialLength?: metres — rescales the outline to the real length
 * Later, real car positions from the API can replace the synthetic racing line.
 */

export interface LapModel {
  n: number;
  // centreline (track geometry) + its left normal
  cx: Float32Array;
  cy: Float32Array;
  nx: Float32Array;
  ny: Float32Array;
  /** lateral offset of the racing line from the centreline, metres (+ = left) */
  off: Float32Array;
  halfWidth: number;
  // racing line
  x: Float32Array;
  y: Float32Array;
  tx: Float32Array; // unit tangent
  ty: Float32Array;
  curvature: Float32Array; // signed, 1/m (positive = left turn)
  dist: Float32Array; // metres from start along the racing line
  speed: Float32Array; // km/h
  time: Float32Array; // seconds from start
  length: number;
  lapTime: number;
  maxSpeed: number;
  minSpeed: number;
}

const STEP = 2; // metres between samples
export const TRACK_WIDTH = 14;

/** Small deterministic PRNG (kept local so the model has no dependencies). */
function prng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function catmull(p0: number, p1: number, p2: number, p3: number, t: number) {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

/**
 * The source GeoJSON has occasional spikes (the line steps forward, back a few metres, then on)
 * and near-duplicate points. They flip the track normal and make cars jump sideways — drop them.
 */
function cleanOutline(input: [number, number][]) {
  let pts = input.slice();
  // repeat until clean — an out-and-back stub needs one pass per vertex
  for (let pass = 0; pass < 200; pass++) {
    const out: [number, number][] = [];
    const m = pts.length;
    let removed = false;
    for (let i = 0; i < m; i++) {
      const prev = out.length ? out[out.length - 1] : pts[(i - 1 + m) % m];
      const cur = pts[i], next = pts[(i + 1) % m];
      const ax = cur[0] - prev[0], ay = cur[1] - prev[1];
      const bx = next[0] - cur[0], by = next[1] - cur[1];
      const la = Math.hypot(ax, ay), lb = Math.hypot(bx, by);
      const cos = (ax * bx + ay * by) / ((la * lb) || 1);
      // near-duplicate or a reversal sharper than 120°
      if (la < 1.5 || cos < -0.5) {
        removed = true;
        continue;
      }
      out.push(cur);
    }
    pts = out;
    if (!removed) break;
  }
  return pts;
}

/** A few passes of neighbour averaging on the resampled centreline — irons out tiny kinks. */
function smoothLoop(x: Float32Array, y: Float32Array, n: number, passes = 4, K = 3) {
  const tx = new Float32Array(n), ty = new Float32Array(n);
  for (let p = 0; p < passes; p++) {
    for (let i = 0; i < n; i++) {
      let sx = 0, sy = 0;
      for (let k = -K; k <= K; k++) {
        const j = (i + k + n) % n;
        sx += x[j];
        sy += y[j];
      }
      tx[i] = sx / (2 * K + 1);
      ty[i] = sy / (2 * K + 1);
    }
    x.set(tx);
    y.set(ty);
  }
}

/** Re-distributes samples evenly by arc length (in place, same count). */
function uniformize(x: Float32Array, y: Float32Array, n: number) {
  const cum = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    cum[i + 1] = cum[i] + Math.hypot(x[j] - x[i], y[j] - y[i]);
  }
  const total = cum[n];
  const ox = x.slice(), oy = y.slice();
  let j = 0;
  for (let i = 0; i < n; i++) {
    const s = (i * total) / n;
    while (cum[j + 1] < s) j++;
    const t = (s - cum[j]) / (cum[j + 1] - cum[j] || 1);
    const k = (j + 1) % n;
    x[i] = ox[j] + (ox[k] - ox[j]) * t;
    y[i] = oy[j] + (oy[k] - oy[j]) * t;
  }
}

function resample(rawPoints: [number, number][], officialLength?: number) {
  // uniform Catmull-Rom overshoots (and loops) when neighbouring segments differ a lot in
  // length — e.g. a 760 m straight next to a 28 m kink — so split long segments first
  const clean = cleanOutline(rawPoints);
  const points: [number, number][] = [];
  for (let i = 0; i < clean.length; i++) {
    const a = clean[i], b = clean[(i + 1) % clean.length];
    const pieces = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 8));
    for (let k = 0; k < pieces; k++) points.push([a[0] + ((b[0] - a[0]) * k) / pieces, a[1] + ((b[1] - a[1]) * k) / pieces]);
  }
  const dense: [number, number][] = [];
  const m = points.length;
  for (let i = 0; i < m; i++) {
    const p0 = points[(i - 1 + m) % m], p1 = points[i], p2 = points[(i + 1) % m], p3 = points[(i + 2) % m];
    const segLen = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const k = Math.max(2, Math.ceil(segLen / 1));
    for (let j = 0; j < k; j++) {
      const t = j / k;
      dense.push([catmull(p0[0], p1[0], p2[0], p3[0], t), catmull(p0[1], p1[1], p2[1], p3[1], t)]);
    }
  }
  const cum = [0];
  for (let i = 1; i <= dense.length; i++) {
    const a = dense[i - 1], b = dense[i % dense.length];
    cum.push(cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  const raw = cum[cum.length - 1];
  const scale = officialLength ? officialLength / raw : 1;
  const length = raw * scale;
  const n = Math.floor(length / STEP);
  const x = new Float32Array(n), y = new Float32Array(n);
  let j = 0;
  for (let i = 0; i < n; i++) {
    const s = (i * length) / n / scale;
    while (cum[j + 1] < s) j++;
    const a = dense[j], b = dense[(j + 1) % dense.length];
    const t = (s - cum[j]) / (cum[j + 1] - cum[j] || 1);
    x[i] = (a[0] + (b[0] - a[0]) * t) * scale;
    y[i] = (a[1] + (b[1] - a[1]) * t) * scale;
  }
  return { x, y, n };
}

function normals(x: Float32Array, y: Float32Array, n: number) {
  const nx = new Float32Array(n), ny = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const a = (i - 2 + n) % n, b = (i + 2) % n;
    const dx = x[b] - x[a], dy = y[b] - y[a];
    const l = Math.hypot(dx, dy) || 1;
    nx[i] = -dy / l;
    ny[i] = dx / l;
  }
  return { nx, ny };
}

/**
 * Minimum-curvature racing line: repeatedly pull every point towards the average of the
 * path around it (a moving-average window — this straightens the path without leaving any
 * wobble, unlike pulling towards just two neighbours) and clamp it back inside the corridor.
 * The result naturally goes outside → apex → outside through corners.
 */
function racingLine(cx: Float32Array, cy: Float32Array, nx: Float32Array, ny: Float32Array, n: number, limit: number) {
  const off = new Float32Array(n);
  const px = new Float64Array(n), py = new Float64Array(n);
  const sx = new Float64Array(n + 1), sy = new Float64Array(n + 1); // prefix sums
  const K = 12; // half window in samples (~24 m)
  const win = 2 * K + 1;
  // per-station limits: never move further towards the inside of a corner than ~70 % of its
  // radius, otherwise the line would pass through the corner centre and fold back on itself
  const limInside = new Float32Array(n), sideIn = new Int8Array(n);
  for (let i = 0; i < n; i++) {
    const a = (i - 2 + n) % n, b = (i + 2) % n;
    const h1 = Math.atan2(cy[i] - cy[a], cx[i] - cx[a]), h2 = Math.atan2(cy[b] - cy[i], cx[b] - cx[i]);
    let dh = h2 - h1;
    while (dh > Math.PI) dh -= 2 * Math.PI;
    while (dh < -Math.PI) dh += 2 * Math.PI;
    const k = dh / (Math.hypot(cx[b] - cx[a], cy[b] - cy[a]) || 1);
    sideIn[i] = k > 0 ? 1 : -1; // positive curvature = left turn = inside is +normal
    limInside[i] = Math.min(limit, Math.abs(k) > 1e-6 ? 0.5 / Math.abs(k) : limit);
  }
  const sum = (s: Float64Array, a: number, b: number) => {
    // inclusive range a..b on a closed loop
    if (a >= 0 && b < n) return s[b + 1] - s[a];
    if (a < 0) return s[b + 1] + (s[n] - s[n + a]);
    return s[n] - s[a] + s[b - n + 1];
  };
  for (let it = 0; it < 220; it++) {
    for (let i = 0; i < n; i++) {
      px[i] = cx[i] + nx[i] * off[i];
      py[i] = cy[i] + ny[i] * off[i];
      sx[i + 1] = sx[i] + px[i];
      sy[i + 1] = sy[i] + py[i];
    }
    for (let i = 0; i < n; i++) {
      const mx = sum(sx, i - K, i + K) / win;
      const my = sum(sy, i - K, i + K) / win;
      // project the local average onto this station's normal
      const target = (mx - cx[i]) * nx[i] + (my - cy[i]) * ny[i];
      let v = off[i] + (target - off[i]) * 0.8;
      const hi = sideIn[i] > 0 ? limInside[i] : limit;
      const lo = sideIn[i] < 0 ? -limInside[i] : -limit;
      v = v > hi ? hi : v < lo ? lo : v;
      off[i] = v;
    }
  }
  return off;
}

interface TrackBase {
  n: number;
  cx: Float32Array;
  cy: Float32Array;
  nx: Float32Array;
  ny: Float32Array;
  ideal: Float32Array; // optimal racing-line offsets
}

/** Centreline + normals + optimal line depend only on the circuit — computed once per layout. */
const baseCache = new WeakMap<object, Map<string, TrackBase>>();
function trackBase(points: [number, number][], officialLength?: number): TrackBase {
  let byPoints = baseCache.get(points);
  if (!byPoints) baseCache.set(points, (byPoints = new Map()));
  const key = String(officialLength ?? '');
  const hit = byPoints.get(key);
  if (hit) return hit;
  const { x: cx, y: cy, n } = resample(points, officialLength);
  smoothLoop(cx, cy, n);
  uniformize(cx, cy, n);
  const { nx, ny } = normals(cx, cy, n);
  const ideal = racingLine(cx, cy, nx, ny, n, TRACK_WIDTH / 2 - 1.3);
  const base = { n, cx, cy, nx, ny, ideal };
  byPoints.set(key, base);
  return base;
}

/**
 * @param style optional seed for a driver "style": grip, braking and line choice vary smoothly
 *   along the lap, so different laps gain and lose time in different places (not a uniform scale).
 * @param spread how strong the style is: 1 = amateur (big differences), ~0.25 = pro (subtle).
 */
export function buildLap(points: [number, number][], lapTime: number, officialLength?: number, style?: number, spread = 1): LapModel {
  const { n, cx, cy, nx, ny, ideal } = trackBase(points, officialLength);
  const halfWidth = TRACK_WIDTH / 2;
  const off = ideal.slice();

  // per-lap style: smooth random fields along the lap
  const grip = new Float32Array(n).fill(1);
  const brake = new Float32Array(n).fill(1);
  if (style !== undefined) {
    const rand = prng(style);
    const K = Math.max(3, Math.round((n * STEP) / 260));
    const g = Array.from({ length: K }, () => 1 + (rand() - 0.5) * 0.44 * spread);
    const b = Array.from({ length: K }, () => 1 + (rand() - 0.5) * 0.6 * spread);
    const l = Array.from({ length: K }, () => 1 - (0.05 + rand() * 0.4) * spread); // how much of the ideal line is used
    for (let i = 0; i < n; i++) {
      const p = (i / n) * K;
      const k0 = Math.floor(p) % K, k1 = (k0 + 1) % K;
      const t = p - Math.floor(p);
      const e = t * t * (3 - 2 * t);
      grip[i] = g[k0] + (g[k1] - g[k0]) * e;
      brake[i] = b[k0] + (b[k1] - b[k0]) * e;
      off[i] *= l[k0] + (l[k1] - l[k0]) * e;
    }
  }

  // racing line geometry
  const x = new Float32Array(n), y = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    x[i] = cx[i] + nx[i] * off[i];
    y[i] = cy[i] + ny[i] * off[i];
  }
  const seg = new Float64Array(n); // length i → i+1
  const dist = new Float32Array(n);
  let length = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    seg[i] = Math.hypot(x[j] - x[i], y[j] - y[i]);
    if (i > 0) dist[i] = dist[i - 1] + seg[i - 1];
    length += seg[i];
  }

  const tx = new Float32Array(n), ty = new Float32Array(n);
  const heading = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const a = (i - 1 + n) % n, b = (i + 1) % n;
    const dx = x[b] - x[a], dy = y[b] - y[a];
    const l = Math.hypot(dx, dy) || 1;
    tx[i] = dx / l;
    ty[i] = dy / l;
    heading[i] = Math.atan2(dy, dx);
  }

  // curvature from heading change over a ±W window, then smoothed
  const W = 4;
  const raw = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let dh = heading[(i + W) % n] - heading[(i - W + n) % n];
    while (dh > Math.PI) dh -= 2 * Math.PI;
    while (dh < -Math.PI) dh += 2 * Math.PI;
    let s = 0;
    for (let k = -W; k < W; k++) s += seg[(i + k + n) % n];
    raw[i] = dh / (s || 1);
  }
  const curvature = new Float32Array(n);
  const S = 3;
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let k = -S; k <= S; k++) sum += raw[(i + k + n) % n];
    curvature[i] = sum / (2 * S + 1);
  }

  // speed profile (m/s): lateral grip grows with downforce: a_lat = A0 + D·v²  →  v² = A0 / (k − D)
  const VMAX = 94; // ~340 km/h
  const D = 0.0055;
  const accel = (s: number) => 4 + 16 * Math.max(0, 1 - s / VMAX);
  const BRAKE = 50;
  const v = new Float64Array(n);
  const time = new Float32Array(n);

  const simulate = (A0: number) => {
    for (let i = 0; i < n; i++) {
      const k = Math.abs(curvature[i]);
      v[i] = Math.max(15, k > D ? Math.min(VMAX, Math.sqrt((A0 * grip[i]) / (k - D))) : VMAX);
    }
    for (let pass = 0; pass < 2; pass++) {
      for (let k = 1; k <= n; k++) {
        const i = k % n, p = (k - 1) % n;
        v[i] = Math.min(v[i], Math.sqrt(v[p] * v[p] + 2 * accel(v[p]) * seg[p]));
      }
      for (let k = n - 1; k >= -1; k--) {
        const i = (k + n) % n, nx2 = (k + 1 + n) % n;
        v[i] = Math.min(v[i], Math.sqrt(v[nx2] * v[nx2] + 2 * BRAKE * brake[i] * seg[i]));
      }
    }
    let t = 0;
    for (let i = 1; i < n; i++) {
      t += (2 * seg[i - 1]) / (v[i - 1] + v[i]);
      time[i] = t;
    }
    return t + (2 * seg[n - 1]) / (v[n - 1] + v[0]);
  };

  // find the grip level that produces the requested lap time with a fixed top speed
  let lo = 4, hi = 400;
  for (let it = 0; it < 22; it++) {
    const mid = Math.sqrt(lo * hi);
    if (simulate(mid) > lapTime) lo = mid;
    else hi = mid;
  }
  const total = simulate(hi);
  const f = total / lapTime; // tiny residual correction
  const speed = new Float32Array(n);
  let maxSpeed = 0, minSpeed = Infinity;
  for (let i = 0; i < n; i++) {
    time[i] /= f;
    speed[i] = v[i] * f * 3.6;
    maxSpeed = Math.max(maxSpeed, speed[i]);
    minSpeed = Math.min(minSpeed, speed[i]);
  }

  return { n, cx, cy, nx, ny, off, halfWidth, x, y, tx, ty, curvature, dist, speed, time, length, lapTime, maxSpeed, minSpeed };
}

/** Memoised `buildLap` — the 3D view and the analysis share the same laps. */
const lapCache = new WeakMap<object, Map<string, LapModel>>();
export function getLap(points: [number, number][], lapTime: number, officialLength?: number, style?: number, spread = 1) {
  let byPoints = lapCache.get(points);
  if (!byPoints) lapCache.set(points, (byPoints = new Map()));
  const key = `${lapTime}|${officialLength ?? ''}|${style ?? ''}|${spread}`;
  let lap = byPoints.get(key);
  if (!lap) {
    lap = buildLap(points, lapTime, officialLength, style, spread);
    byPoints.set(key, lap);
  }
  return lap;
}

/** Sample the lap at time t (seconds) — returns fractional index. */
export function indexAtTime(lap: LapModel, t: number) {
  const { time, n } = lap;
  let lo = 0, hi = n - 1;
  if (t <= 0) return 0;
  if (t >= time[n - 1]) {
    const tail = (t - time[n - 1]) / (lap.lapTime - time[n - 1]);
    return n - 1 + Math.min(1, tail);
  }
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (time[mid] <= t) lo = mid;
    else hi = mid;
  }
  return lo + (t - time[lo]) / (time[hi] - time[lo]);
}

/** Interpolated pose. `widthScale` widens the track (map view) — the car stays on the scaled racing line. */
export function sampleAt(lap: LapModel, fi: number, widthScale = 1) {
  const { n } = lap;
  const i0 = Math.floor(fi) % n;
  const i1 = (i0 + 1) % n;
  const f = fi - Math.floor(fi);
  const lerp = (a: Float32Array) => a[i0] + (a[i1] - a[i0]) * f;
  const o = lerp(lap.off) * widthScale;
  return {
    x: lerp(lap.cx) + lerp(lap.nx) * o,
    y: lerp(lap.cy) + lerp(lap.ny) * o,
    tx: lerp(lap.tx),
    ty: lerp(lap.ty),
    speed: lerp(lap.speed),
    dist: lap.dist[i0] + (lap.dist[i1] - lap.dist[i0]) * f,
  };
}

export interface Corner {
  number: number;
  start: number; // sample index
  end: number;
  apex: number; // sample of max curvature
  dir: 'L' | 'R';
}

/** Corners = stretches with radius < ~220 m; close ones (chicanes) are merged. */
export function findCorners(lap: LapModel): Corner[] {
  const TH = 1 / 220;
  const ds = lap.length / lap.n;
  const gapMerge = Math.round(35 / ds);
  const minLen = Math.round(12 / ds);
  const raw: { start: number; end: number }[] = [];
  let open = -1;
  for (let i = 0; i < lap.n; i++) {
    const on = Math.abs(lap.curvature[i]) > TH;
    if (on && open < 0) open = i;
    if (!on && open >= 0) {
      raw.push({ start: open, end: i - 1 });
      open = -1;
    }
  }
  if (open >= 0) raw.push({ start: open, end: lap.n - 1 });
  const merged: { start: number; end: number }[] = [];
  for (const r of raw) {
    const last = merged[merged.length - 1];
    if (last && r.start - last.end < gapMerge) last.end = r.end;
    else merged.push({ ...r });
  }
  return merged
    .filter((r) => r.end - r.start >= minLen)
    .map((r, i) => {
      let apex = r.start;
      for (let k = r.start; k <= r.end; k++) if (Math.abs(lap.curvature[k]) > Math.abs(lap.curvature[apex])) apex = k;
      return { number: i + 1, start: r.start, end: r.end, apex, dir: lap.curvature[apex] > 0 ? 'L' : 'R' };
    });
}

/** Reference (pro) laps get a subtle, stable style derived from the lap time. */
export const PRO_SPREAD = 0.25;
export const proStyle = (lapTime: number) => Math.round(lapTime * 1000) % 100000;
export function getProLap(points: [number, number][], lapTime: number, officialLength?: number) {
  return getLap(points, lapTime, officialLength, proStyle(lapTime), PRO_SPREAD);
}
