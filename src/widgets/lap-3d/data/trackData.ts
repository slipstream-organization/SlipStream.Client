/**
 * Real-lap data layer (no React, no three) — pure functions over OpenF1 samples.
 *
 *  1. buildCentreline(pool)   — the circuit's centre line from many laps of different drivers
 *  2. traceLap(raw, centre)   — one lap re-sampled every DS metres of *distance*: time, position,
 *                               speed and the pedals at each station
 *  3. deltaAt(a, b, s)        — time difference of two laps at the same distance
 *
 * Why distance, not time: two laps of different length in time can only be compared at the same
 * place on the track. Playback then maps the clock to a distance per lap (inverse of t(s)).
 *
 * Units: OpenF1 x / y / z are in 1/10 m — everything here is metres.
 */

export interface RawLap {
  year: number;
  driver: string;
  lapTime: number;
  sectors?: number[];
  /** [t, x, y, z] — t in seconds from the lap start, x / y / z in 1/10 m */
  pos: number[][];
  /** [t, speed km/h, throttle %, brake, gear, rpm, drs] */
  car?: number[][];
}

export interface PoolLap {
  driver: string;
  lapTime: number;
  pos: number[][];
}

export interface Centreline {
  n: number;
  /** metres between stations */
  ds: number;
  length: number;
  x: Float32Array;
  y: Float32Array;
  z: Float32Array;
  /** unit tangent and left normal */
  tx: Float32Array;
  ty: Float32Array;
  nx: Float32Array;
  ny: Float32Array;
}

export interface LapTrace {
  year: number;
  driver: string;
  lapTime: number;
  ds: number;
  /** stations 0..n-1 at s = k * ds; the lap ends at s = length (time = lapTime) */
  n: number;
  length: number;
  /** time at each station, seconds */
  t: Float32Array;
  x: Float32Array;
  y: Float32Array;
  z: Float32Array;
  speed: Float32Array;
  throttle: Float32Array;
  brake: Float32Array;
  gear: Float32Array;
  sectors?: number[];
}

type P3 = [number, number, number];

/* ── helpers ─────────────────────────────────────────────────────────────── */

/** Uniform Catmull-Rom, one component. */
const cr = (p0: number, p1: number, p2: number, p3: number, u: number) =>
  0.5 * (2 * p1 + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u * u * u);

/** Samples of a lap in metres, with the exact start/finish instants (t = 0 and t = lapTime) added. */
function lapPolyline(raw: PoolLap | RawLap): { t: number; p: P3 }[] {
  const s = raw.pos.map((r) => ({ t: r[0], p: [r[1] / 10, r[2] / 10, r[3] / 10] as P3 }));
  const at = (t: number): P3 => {
    let i = s.findIndex((q) => q.t >= t);
    if (i <= 0) i = 1;
    if (i < 0) i = s.length - 1;
    const a = s[i - 1], b = s[i];
    const u = (t - a.t) / Math.max(1e-6, b.t - a.t);
    const p0 = s[Math.max(0, i - 2)].p, p3 = s[Math.min(s.length - 1, i + 1)].p;
    return [0, 1, 2].map((k) => cr(p0[k], a.p[k], b.p[k], p3[k], u)) as P3;
  };
  const inside = s.filter((q) => q.t > 0 && q.t < raw.lapTime);
  return [{ t: 0, p: at(0) }, ...inside, { t: raw.lapTime, p: at(raw.lapTime) }];
}

/** m points evenly spaced by arc length along a polyline (first point at the start; open or closed). */
function arcResample(poly: P3[], m: number, closed: boolean): P3[] {
  const pts = closed ? [...poly, poly[0]] : poly;
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const total = cum[cum.length - 1];
  const out: P3[] = [];
  let seg = 0;
  const count = closed ? m : m;
  for (let k = 0; k < count; k++) {
    const s = closed ? (k / m) * total : (k / (m - 1)) * total;
    while (seg < cum.length - 2 && cum[seg + 1] < s) seg++;
    const u = (s - cum[seg]) / Math.max(1e-9, cum[seg + 1] - cum[seg]);
    const idx = (i: number) => (closed ? ((i % poly.length) + poly.length) % poly.length : Math.max(0, Math.min(pts.length - 1, i)));
    const p0 = pts[idx(seg - 1)], p1 = pts[seg], p2 = pts[seg + 1], p3 = pts[idx(seg + 2)];
    out.push([0, 1, 2].map((c) => cr(p0[c], p1[c], p2[c], p3[c], u)) as P3);
  }
  return out;
}

/* ── 1. centre line ──────────────────────────────────────────────────────── */

/**
 * The centre line: the mean of many racing lines. Every lap is re-sampled to the same number of
 * stations; each lap is then matched to the first one by *nearest point within a window* (not by
 * index, since racing lines differ in length), averaged and smoothed.
 */
export function buildCentreline(pool: PoolLap[], ds = 4): Centreline {
  const polys = pool.map((l) => lapPolyline(l).map((q) => q.p));
  const avgLen = polys.reduce((a, p) => a + polyLen(p), 0) / polys.length;
  const m = Math.round(avgLen / ds);
  const laps = polys.map((p) => arcResample(p, m, true));
  const ref = laps[0];
  const W = 40;

  const sum = ref.map((p) => [...p] as P3);
  for (const lap of laps.slice(1)) {
    for (let i = 0; i < m; i++) {
      let best = Infinity, bj = i;
      for (let d = -W; d <= W; d++) {
        const j = (i + d + m) % m;
        const e = (lap[j][0] - ref[i][0]) ** 2 + (lap[j][1] - ref[i][1]) ** 2;
        if (e < best) { best = e; bj = j; }
      }
      // refine on the two neighbouring segments
      let q: P3 = lap[bj], qd = best;
      for (const nb of [(bj + 1) % m, (bj - 1 + m) % m]) {
        const a = lap[bj], b = lap[nb];
        const vx = b[0] - a[0], vy = b[1] - a[1];
        const u = Math.max(0, Math.min(1, ((ref[i][0] - a[0]) * vx + (ref[i][1] - a[1]) * vy) / (vx * vx + vy * vy || 1)));
        const c: P3 = [a[0] + vx * u, a[1] + vy * u, a[2] + (b[2] - a[2]) * u];
        const e = (c[0] - ref[i][0]) ** 2 + (c[1] - ref[i][1]) ** 2;
        if (e < qd) { qd = e; q = c; }
      }
      sum[i][0] += q[0]; sum[i][1] += q[1]; sum[i][2] += q[2];
    }
  }
  let avg: P3[] = sum.map((p) => [p[0] / laps.length, p[1] / laps.length, p[2] / laps.length] as P3);

  // circular smoothing, 2 passes (±3 stations ≈ ±12 m) — removes GPS jitter, keeps the corners
  for (let pass = 0; pass < 2; pass++) {
    const next: P3[] = [];
    for (let i = 0; i < m; i++) {
      const acc: P3 = [0, 0, 0];
      let w = 0;
      for (let d = -3; d <= 3; d++) {
        const k = 4 - Math.abs(d);
        const p = avg[(i + d + m) % m];
        acc[0] += p[0] * k; acc[1] += p[1] * k; acc[2] += p[2] * k; w += k;
      }
      next.push([acc[0] / w, acc[1] / w, acc[2] / w]);
    }
    avg = next;
  }

  // evenly spaced again, so station k is at distance k * ds
  const even = arcResample(avg, m, true);
  const n = even.length;
  const length = polyLen([...even, even[0]]);
  const step = length / n;
  const cl: Centreline = {
    n,
    ds: step,
    length,
    x: new Float32Array(n), y: new Float32Array(n), z: new Float32Array(n),
    tx: new Float32Array(n), ty: new Float32Array(n), nx: new Float32Array(n), ny: new Float32Array(n),
  };
  for (let i = 0; i < n; i++) {
    cl.x[i] = even[i][0]; cl.y[i] = even[i][1]; cl.z[i] = even[i][2];
  }
  for (let i = 0; i < n; i++) {
    const a = (i + 1) % n, b = (i - 1 + n) % n;
    const dx = cl.x[a] - cl.x[b], dy = cl.y[a] - cl.y[b];
    const l = Math.hypot(dx, dy) || 1;
    cl.tx[i] = dx / l; cl.ty[i] = dy / l;
    cl.nx[i] = -dy / l; cl.ny[i] = dx / l;
  }
  return cl;
}

function polyLen(p: P3[]) {
  let l = 0;
  for (let i = 1; i < p.length; i++) l += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
  return l;
}

/** Fractional station index of the closest point of the centre line, searched near `hint` (or everywhere). */
function project(cl: Centreline, x: number, y: number, hint: number | null, window = 60): number {
  const { n } = cl;
  let best = Infinity, bi = 0;
  const lo = hint === null ? 0 : -window, hi = hint === null ? n - 1 : window;
  for (let d = lo; d <= hi; d++) {
    const i = hint === null ? d : (Math.round(hint) + d + n * 4) % n;
    const e = (cl.x[i] - x) ** 2 + (cl.y[i] - y) ** 2;
    if (e < best) { best = e; bi = i; }
  }
  let frac = bi, bd = best;
  for (const nb of [(bi + 1) % n, (bi - 1 + n) % n]) {
    const vx = cl.x[nb] - cl.x[bi], vy = cl.y[nb] - cl.y[bi];
    const u = Math.max(0, Math.min(1, ((x - cl.x[bi]) * vx + (y - cl.y[bi]) * vy) / (vx * vx + vy * vy || 1)));
    const e = (cl.x[bi] + vx * u - x) ** 2 + (cl.y[bi] + vy * u - y) ** 2;
    if (e < bd) { bd = e; frac = nb === (bi + 1) % n ? bi + u : bi - u; }
  }
  return (frac + n) % n;
}

/* ── 2. one lap on the distance axis ─────────────────────────────────────── */

export function traceLap(raw: RawLap, cl: Centreline, ds = 5): LapTrace {
  const L = cl.length;
  // every sample, margins included (the API window starts before the line and ends after it)
  const smp = raw.pos.map((r) => ({ t: r[0], p: [r[1] / 10, r[2] / 10, r[3] / 10] as P3 }));
  // distance of each sample along the centre line, unwrapped so it only grows
  const S: number[] = [];
  let hint: number | null = null, wraps = 0, prev = 0;
  for (const q of smp) {
    const f = project(cl, q.p[0], q.p[1], hint);
    hint = f;
    let sv = f * cl.ds + wraps * L;
    if (S.length && sv - prev < -L / 2) { wraps++; sv += L; }
    S.push(sv);
    prev = sv;
  }
  // The lap starts where the centre line starts (a fixed place), not at the API's date_start —
  // that one is a tenth of a second (≈ 8 m) off. Anchor: the origin crossing nearest to t = 0.
  const iz = Math.max(0, smp.findIndex((q) => q.t >= 0));
  const anchor = Math.round(S[iz] / L) * L;
  const pairs: { s: number; t: number; p: P3 }[] = [];
  smp.forEach((q, i) => {
    const sv = S[i] - anchor;
    if (sv < -60 || sv > L + 60) return;
    if (!pairs.length || sv > pairs[pairs.length - 1].s + 0.5) pairs.push({ s: sv, t: q.t, p: q.p });
  });
  if (pairs.length < 8) throw new Error('lap does not cover the circuit');
  const at = (s: number) => {
    let seg = 0;
    while (seg < pairs.length - 2 && pairs[seg + 1].s < s) seg++;
    const a = pairs[seg], b = pairs[seg + 1];
    const u = (s - a.s) / Math.max(1e-6, b.s - a.s);
    const p0 = pairs[Math.max(0, seg - 1)].p, p3 = pairs[Math.min(pairs.length - 1, seg + 2)].p;
    return { t: a.t + (b.t - a.t) * u, x: cr(p0[0], a.p[0], b.p[0], p3[0], u), y: cr(p0[1], a.p[1], b.p[1], p3[1], u), z: cr(p0[2], a.p[2], b.p[2], p3[2], u) };
  };
  // time at the two crossings; the lap time between them is stretched to the official one
  const tStart = at(0).t;
  const tScale = raw.lapTime / (at(L).t - tStart);

  const n = Math.round(L / ds);
  const step = L / n;
  const out: LapTrace = {
    year: raw.year, driver: raw.driver, lapTime: raw.lapTime, ds: step, n, length: L,
    t: new Float32Array(n + 1), x: new Float32Array(n + 1), y: new Float32Array(n + 1), z: new Float32Array(n + 1),
    speed: new Float32Array(n + 1), throttle: new Float32Array(n + 1), brake: new Float32Array(n + 1), gear: new Float32Array(n + 1),
    sectors: raw.sectors,
  };
  for (let k = 0; k <= n; k++) {
    const q = at(Math.min(L, k * step));
    out.t[k] = (q.t - tStart) * tScale;
    out.x[k] = q.x;
    out.y[k] = q.y;
    out.z[k] = q.z;
  }
  out.t[n] = raw.lapTime;
  // The positions arrive ~2.3 times a second (≈ 35 m apart); linear time between them leaves a
  // ±0.1 s saw-tooth in the delta. Smooth the time axis a little — the ends stay exact.
  for (let pass = 0; pass < 14; pass++) {
    let prevT = out.t[0];
    for (let k = 1; k < n; k++) {
      const cur = out.t[k];
      out.t[k] = 0.25 * prevT + 0.5 * cur + 0.25 * out.t[k + 1];
      prevT = cur;
    }
  }

  // speed / pedals: the car stream is sampled at its own moments — read it at each station's time
  const car = raw.car;
  for (let k = 0; k <= n; k++) {
    if (car && car.length > 1) {
      const t = out.t[k] / tScale + tStart;
      let j = car.findIndex((c) => c[0] >= t);
      if (j <= 0) j = 1;
      if (j < 0) j = car.length - 1;
      const a = car[j - 1], b = car[j];
      const u = Math.max(0, Math.min(1, (t - a[0]) / Math.max(1e-6, b[0] - a[0])));
      out.speed[k] = a[1] + (b[1] - a[1]) * u;
      out.throttle[k] = a[2] + (b[2] - a[2]) * u;
      out.brake[k] = a[3] + (b[3] - a[3]) * u;
      out.gear[k] = u < 0.5 ? a[4] : b[4];
    } else {
      const dt = (out.t[Math.min(n, k + 1)] - out.t[Math.max(0, k - 1)]) / (Math.min(n, k + 1) - Math.max(0, k - 1));
      out.speed[k] = (step / Math.max(1e-3, dt)) * 3.6;
    }
  }
  return out;
}

/* ── 3. comparing laps ───────────────────────────────────────────────────── */

/** Time of a lap at distance s (linear between stations). */
export function timeAt(lap: LapTrace, s: number) {
  const f = Math.max(0, Math.min(lap.n, s / lap.ds));
  const i = Math.min(lap.n - 1, Math.floor(f));
  return lap.t[i] + (lap.t[i + 1] - lap.t[i]) * (f - i);
}

/** Distance reached at time t (inverse of timeAt — t grows with s, so a forward cursor is enough). */
export function distanceAt(lap: LapTrace, t: number, hint = 0): { s: number; i: number } {
  if (t <= 0) return { s: 0, i: 0 };
  if (t >= lap.lapTime) return { s: lap.length, i: lap.n - 1 };
  let i = Math.max(0, Math.min(lap.n - 1, hint));
  while (i < lap.n - 1 && lap.t[i + 1] < t) i++;
  while (i > 0 && lap.t[i] > t) i--;
  const u = (t - lap.t[i]) / Math.max(1e-6, lap.t[i + 1] - lap.t[i]);
  return { s: (i + u) * lap.ds, i };
}

/** + = `a` is slower than `b` at that distance (it is behind it), in seconds. */
export const deltaAt = (a: LapTrace, b: LapTrace, s: number) => timeAt(a, s) - timeAt(b, s);
