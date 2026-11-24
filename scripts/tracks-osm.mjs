// Builds the surroundings of a circuit from OpenStreetMap.
//
//   npm run tracks:osm -- vegas            (needs public/tracks/vegas/laps/ from tracks:fetch)
//   npm run tracks:osm -- vegas --margin 1000 --overlay fit.svg
//
// 1. loads the circuit's centre line (same code as the browser: src/widgets/lap-3d/data/trackData.ts)
// 2. downloads the roads around the circuit from Overpass (cached in scripts/.cache/)
// 3. REGISTRATION — OpenF1 coordinates are a local frame with unknown rotation / mirroring / origin.
//    The circuit follows roads, so the centre line is fitted to the road network: a coarse search over
//    rotation x mirror x shift, then a local refinement. The fit quality is printed and drawn.
// 4. downloads the buildings in the circuit's bounding box (+ margin), brings them into the centre-line
//    frame, derives heights from the tags and writes public/tracks/<id>/environment.json
//
// Needs Node >= 23.6 (it imports the TypeScript data layer directly).
import fs from 'node:fs';
import path from 'node:path';
import { buildCentreline } from '../src/widgets/lap-3d/data/trackData.ts';

const args = process.argv.slice(2);
const id = args[0];
if (!id || id.startsWith('--')) {
  console.error('usage: node scripts/tracks-osm.mjs <trackId> [--margin 900] [--radius 2600] [--overlay file.svg]');
  process.exit(1);
}
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};
const MARGIN = Number(opt('margin', '900'));
const RADIUS = Number(opt('radius', '2600'));
const OVERLAY = opt('overlay');

const config = (await import(`../src/widgets/lap-3d/tracks/${id}.ts`))[id];
const { lat: LAT0, lon: LON0 } = config.geo;
const outDir = path.join('public', 'tracks', id);
const cacheDir = path.join('scripts', '.cache');
fs.mkdirSync(cacheDir, { recursive: true });

/* ── projection: WGS-84 → local metres (x east, y north) around the config point ─────────────── */
const KX = 111320 * Math.cos((LAT0 * Math.PI) / 180), KY = 110540;
const toXY = (lat, lon) => [(lon - LON0) * KX, (lat - LAT0) * KY];
const toLL = (x, y) => [LAT0 + y / KY, LON0 + x / KX];

/* ── Overpass with back-off and mirrors ──────────────────────────────────────────────────────── */
const MIRRORS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter', 'https://overpass.private.coffee/api/interpreter'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function overpass(query, cacheFile) {
  const cached = path.join(cacheDir, cacheFile);
  if (fs.existsSync(cached)) return JSON.parse(fs.readFileSync(cached, 'utf8'));
  for (let attempt = 0; attempt < 9; attempt++) {
    const url = MIRRORS[attempt % MIRRORS.length];
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'SlipStream-tracks-osm/0.1' },
        body: 'data=' + encodeURIComponent(query),
        signal: AbortSignal.timeout(150_000),
      });
      if (res.ok) {
        const text = await res.text();
        fs.writeFileSync(cached, text);
        return JSON.parse(text);
      }
      console.log(`  ${new URL(url).host}: ${res.status} — retrying`);
    } catch (e) {
      console.log(`  ${new URL(url).host}: ${e.name} — retrying`);
    }
    await sleep(Math.min(60_000, 6000 * 2 ** Math.floor(attempt / 2)));
  }
  throw new Error('Overpass is not answering — try again later');
}

/* ── 1. centre line ──────────────────────────────────────────────────────────────────────────── */
const lapsDir = path.join(outDir, 'laps');
const pool = config.pool.flatMap((f) => JSON.parse(fs.readFileSync(path.join(lapsDir, f), 'utf8')).laps);
const stretch = (lap, f) => ({ ...lap, pos: lap.pos.map((p) => [p[0], p[1] * f, p[2] * f, p[3]]) });
const first = buildCentreline(pool);
const f = config.realLength / first.length;
const cl = buildCentreline(pool.map((l) => stretch(l, f)));
console.log(`centre line: ${cl.n} stations, ${cl.length.toFixed(0)} m`);
const clPts = Array.from({ length: cl.n }, (_, i) => [cl.x[i], cl.y[i]]);

/* ── 2. roads ────────────────────────────────────────────────────────────────────────────────── */
console.log('roads …');
const roadsJson = await overpass(
  `[out:json][timeout:90];way["highway"~"^(motorway|trunk|primary|secondary|tertiary|residential|service|unclassified|motorway_link|trunk_link|primary_link|secondary_link)$"](around:${RADIUS},${LAT0},${LON0});out geom;`,
  `${id}-roads.json`,
);
const CELL = 20;
const grid = new Map();
const mainGrid = new Map();
const MAIN = /^(motorway|trunk|primary|secondary|tertiary)(_link)?$/;
const put = (g, x, y) => {
  const k = Math.floor(x / CELL) + ',' + Math.floor(y / CELL);
  let a = g.get(k);
  if (!a) g.set(k, (a = []));
  a.push(x, y);
};
let roadWays = 0;
for (const w of roadsJson.elements) {
  if (!w.geometry) continue;
  roadWays++;
  const main = MAIN.test(w.tags?.highway ?? '');
  const addPt = (x, y) => {
    put(grid, x, y);
    if (main) put(mainGrid, x, y);
  };
  for (let i = 0; i < w.geometry.length; i++) {
    const [x1, y1] = toXY(w.geometry[i].lat, w.geometry[i].lon);
    addPt(x1, y1);
    if (i + 1 < w.geometry.length) {
      const [x2, y2] = toXY(w.geometry[i + 1].lat, w.geometry[i + 1].lon);
      const len = Math.hypot(x2 - x1, y2 - y1), steps = Math.floor(len / 4);
      for (let s = 1; s <= steps; s++) addPt(x1 + ((x2 - x1) * s) / (steps + 1), y1 + ((y2 - y1) * s) / (steps + 1));
    }
  }
}
console.log(`  ${roadWays} road ways, ${[...grid.values()].reduce((a, b) => a + b.length / 2, 0)} points`);
console.log(`  main roads: ${[...mainGrid.values()].reduce((a, b) => a + b.length / 2, 0)} points`);
const CAP = 40;
let G = mainGrid; // the grid the search scores against
function nearest(x, y, cap = CAP, g = G) {
  const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL);
  let best = cap * cap;
  const R = Math.ceil(cap / CELL);
  for (let dx = -R; dx <= R; dx++) for (let dy = -R; dy <= R; dy++) {
    const a = g.get(cx + dx + ',' + (cy + dy));
    if (!a) continue;
    for (let i = 0; i < a.length; i += 2) {
      const d = (a[i] - x) ** 2 + (a[i + 1] - y) ** 2;
      if (d < best) best = d;
    }
  }
  return Math.sqrt(best);
}

/* ── 3. registration ─────────────────────────────────────────────────────────────────────────── */
let cx = 0, cy = 0;
for (const [x, y] of clPts) { cx += x; cy += y; }
cx /= cl.n; cy /= cl.n;
/** OpenF1 frame → OSM local metres: mirror about the x axis (optional), rotate about the centroid, shift */
const apply = (T, x, y) => {
  const px = x - cx, py = (T.mirror ? -y : y) - (T.mirror ? -cy : cy);
  const c = Math.cos(T.theta), s = Math.sin(T.theta);
  return [px * c - py * s + T.dx, px * s + py * c + T.dy];
};
const invert = (T, X, Y) => {
  const c = Math.cos(T.theta), s = Math.sin(T.theta);
  const qx = X - T.dx, qy = Y - T.dy;
  const px = qx * c + qy * s, py = -qx * s + qy * c;
  return [px + cx, T.mirror ? -(py - cy) : py + cy];
};
const sub = (step) => clPts.filter((_, i) => i % step === 0);
const score = (T, pts) => {
  let sum = 0;
  for (const [x, y] of pts) {
    const [X, Y] = apply(T, x, y);
    sum += nearest(X, Y, 30);
  }
  return sum / pts.length;
};

console.log('registration: coarse search …');
const coarse = sub(20); // ~80 points
const cands = [];
for (const mirror of [false, true]) {
  for (let deg = 0; deg < 360; deg += 2) {
    for (let dx = -700; dx <= 700; dx += 70) for (let dy = -700; dy <= 700; dy += 70) {
      const T = { mirror, theta: (deg * Math.PI) / 180, dx, dy };
      cands.push({ T, s: score(T, coarse) });
    }
  }
}
cands.sort((a, b) => a.s - b.s);
console.log(`  best coarse: ${cands[0].s.toFixed(1)} m mean distance (mirror=${cands[0].T.mirror}, ${((cands[0].T.theta * 180) / Math.PI).toFixed(0)}°)`);

console.log('registration: refining the best candidates …');
const fine = sub(5);
let best = null;
const tried = [];
for (const c of cands) {
  if (tried.length >= 12) break;
  if (tried.some((t) => t.mirror === c.T.mirror && Math.abs(t.theta - c.T.theta) < 0.12 && Math.hypot(t.dx - c.T.dx, t.dy - c.T.dy) < 150)) continue;
  tried.push(c.T);
  let T = { ...c.T }, s = score(T, fine);
  for (const [dθ, dd] of [[0.03, 40], [0.012, 15], [0.005, 6], [0.002, 2.5]]) {
    for (let it = 0; it < 6; it++) {
      let improved = false;
      for (const [a, b, c2] of [[dθ, 0, 0], [-dθ, 0, 0], [0, dd, 0], [0, -dd, 0], [0, 0, dd], [0, 0, -dd]]) {
        const N = { ...T, theta: T.theta + a, dx: T.dx + b, dy: T.dy + c2 };
        const v = score(N, fine);
        if (v < s) { s = v; T = N; improved = true; }
      }
      if (!improved) break;
    }
  }
  if (!best || s < best.s) best = { T, s };
}
const T = best.T;
const resid = clPts.map(([x, y]) => nearest(...apply(T, x, y), CAP, grid)).sort((a, b) => a - b);
const residMain = clPts.map(([x, y]) => nearest(...apply(T, x, y), CAP, mainGrid)).sort((a, b) => a - b);
const stats = { mean: resid.reduce((a, b) => a + b, 0) / resid.length, p95: resid[Math.floor(resid.length * 0.95)], max: resid[resid.length - 1], within5: resid.filter((d) => d < 5).length / resid.length, within15: resid.filter((d) => d < 15).length / resid.length, median: resid[Math.floor(resid.length / 2)] };
console.log(`FIT: mirror=${T.mirror} rotation=${((T.theta * 180) / Math.PI).toFixed(2)}° shift=(${T.dx.toFixed(1)}, ${T.dy.toFixed(1)}) m`);
console.log(`     to the nearest MAIN road: mean ${(residMain.reduce((a, b) => a + b, 0) / residMain.length).toFixed(1)} m, p95 ${residMain[Math.floor(residMain.length * 0.95)].toFixed(1)} m`);
console.log(`     distance of the centre line to the nearest road (any): mean ${stats.mean.toFixed(1)} m, p95 ${stats.p95.toFixed(1)} m, ${(stats.within5 * 100).toFixed(0)} % within 5 m, ${(stats.within15 * 100).toFixed(0)} % within 15 m, median ${stats.median.toFixed(1)} m`);

/* overlay: roads (grey) + the fitted centre line (red) */
if (OVERLAY) {
  const W = 900, H = 900;
  const P = clPts.map(([x, y]) => apply(T, x, y));
  const minX = Math.min(...P.map((p) => p[0])) - 250, maxX = Math.max(...P.map((p) => p[0])) + 250;
  const minY = Math.min(...P.map((p) => p[1])) - 250, maxY = Math.max(...P.map((p) => p[1])) + 250;
  const sc = Math.min(W / (maxX - minX), H / (maxY - minY));
  const X = (x) => ((x - minX) * sc).toFixed(1), Y = (y) => (H - (y - minY) * sc).toFixed(1);
  let roadsSvg = '';
  for (const w of roadsJson.elements) {
    if (!w.geometry) continue;
    roadsSvg += 'M' + w.geometry.map((g) => { const [x, y] = toXY(g.lat, g.lon); return `${X(x)},${Y(y)}`; }).join('L');
  }
  // the circuit coloured by its distance to the nearest road: green < 5 m, amber < 15 m, red beyond
  let lineSvg = '';
  for (let i = 0; i < P.length; i++) {
    const j = (i + 1) % P.length;
    const d = nearest(P[i][0], P[i][1], CAP, grid);
    const col = d < 5 ? '#3ddc84' : d < 15 ? '#ffb020' : '#ff2d5a';
    lineSvg += `<line x1="${X(P[i][0])}" y1="${Y(P[i][1])}" x2="${X(P[j][0])}" y2="${Y(P[j][1])}" stroke="${col}" stroke-width="4" stroke-linecap="round"/>`;
  }
  let mainSvg = '';
  for (const w of roadsJson.elements) {
    if (!w.geometry || !MAIN.test(w.tags?.highway ?? '')) continue;
    mainSvg += 'M' + w.geometry.map((g) => { const [x, y] = toXY(g.lat, g.lon); return `${X(x)},${Y(y)}`; }).join('L');
  }
  fs.writeFileSync(OVERLAY, `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="100%" height="100%" fill="#0e1013"/><path d="${roadsSvg}" fill="none" stroke="#3b414c" stroke-width="1"/><path d="${mainSvg}" fill="none" stroke="#8a93a3" stroke-width="2"/>${lineSvg}</svg>`);
  console.log('overlay →', OVERLAY);
}
// a few hundred metres of temporary connectors have no road under them — so judge by the bulk, not the tail
if (stats.median > 8 || stats.within15 < 0.8) console.log('WARNING: the fit looks poor — buildings would not line up. Check the overlay and the config point.');

/* ── 4. buildings ────────────────────────────────────────────────────────────────────────────── */
const P = clPts.map(([x, y]) => apply(T, x, y));
const bx0 = Math.min(...P.map((p) => p[0])) - MARGIN, bx1 = Math.max(...P.map((p) => p[0])) + MARGIN;
const by0 = Math.min(...P.map((p) => p[1])) - MARGIN, by1 = Math.max(...P.map((p) => p[1])) + MARGIN;
const [s, w] = toLL(bx0, by0), [n, e] = toLL(bx1, by1);
console.log(`buildings in ${((bx1 - bx0) / 1000).toFixed(1)} x ${((by1 - by0) / 1000).toFixed(1)} km …`);
const bJson = await overpass(`[out:json][timeout:180];way["building"](${s},${w},${n},${e});out geom tags;`, `${id}-buildings.json`);

const LEVEL_H = 3.4;
const parseH = (v) => {
  if (v == null) return undefined;
  const m = /^([\d.]+)\s*(m|ft)?/.exec(String(v).replace(',', '.'));
  return m ? Number(m[1]) * (m[2] === 'ft' ? 0.3048 : 1) : undefined;
};
/** distance from a point to the centre line (in the fitted OSM frame) */
const clGrid = new Map();
P.forEach(([x, y]) => {
  const k = Math.floor(x / 40) + ',' + Math.floor(y / 40);
  (clGrid.get(k) ?? clGrid.set(k, []).get(k)).push([x, y]);
});
const dCentre = (x, y) => {
  let best = Infinity;
  const cx0 = Math.floor(x / 40), cy0 = Math.floor(y / 40);
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (const [px, py] of clGrid.get(cx0 + dx + ',' + (cy0 + dy)) ?? []) best = Math.min(best, Math.hypot(px - x, py - y));
  return best;
};
const half = config.width / 2;
let estimatedCount = 0;
const buildings = [];
const landmarks = [];
let dropped = { tiny: 0, onTrack: 0, open: 0 };
for (const b of bJson.elements) {
  if (!b.geometry || b.geometry.length < 4) { dropped.open++; continue; }
  const pts = b.geometry.map((g) => toXY(g.lat, g.lon));
  if (pts.length > 1 && pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1]) pts.pop();
  // area (shoelace) and centroid
  let area = 0, mx = 0, my = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length];
    area += x1 * y2 - x2 * y1;
    mx += x1; my += y1;
  }
  area = Math.abs(area) / 2;
  mx /= pts.length; my /= pts.length;
  if (area < 18) { dropped.tiny++; continue; }
  if (dCentre(mx, my) < half + 8 || pts.some(([x, y]) => dCentre(x, y) < half + 4)) { dropped.onTrack++; continue; }
  const tags = b.tags ?? {};
  const levels = parseH(tags['building:levels']);
  let h = parseH(tags.height) ?? (levels ? levels * LEVEL_H : undefined);
  let estimated = false;
  if (h === undefined) {
    estimated = true;
    const type = tags.building;
    const resort = type === 'hotel' || tags.tourism === 'hotel' || tags.amenity === 'casino' || tags.tourism === 'resort';
    if (resort) h = Math.min(170, 45 + area / 90); // towers: the bigger the footprint, the taller
    else if (type === 'apartments' || type === 'residential') h = area > 1500 ? 24 : 12;
    else if (type === 'office') h = 28;
    else if (type === 'parking' || tags.amenity === 'parking') h = 14;
    else if (type === 'commercial' || type === 'retail') h = area > 8000 ? 16 : 9;
    else if (type === 'industrial' || type === 'warehouse') h = 11;
    else if (type === 'house' || type === 'detached' || type === 'garage' || type === 'roof') h = type === 'garage' || type === 'roof' ? 3.5 : 6;
    else h = area > 5000 ? 18 : 10;
  }
  const minH = parseH(tags.min_height) ?? 0;
  // back into the centre-line frame, 0.1 m precision, flat array
  const flat = [];
  for (const [x, y] of pts) {
    const [ox, oy] = invert(T, x, y);
    flat.push(Math.round(ox * 10) / 10, Math.round(oy * 10) / 10);
  }
  const rec = { h: Math.round(h * 10) / 10, p: flat };
  if (estimated) estimatedCount++;
  if (minH > 0) rec.m = Math.round(minH * 10) / 10;
  if (tags.name && /sphere/i.test(tags.name)) {
    const [ox, oy] = invert(T, mx, my);
    landmarks.push({ name: tags.name, kind: 'sphere', x: Math.round(ox * 10) / 10, y: Math.round(oy * 10) / 10, radius: Math.round(Math.sqrt(area / Math.PI) * 10) / 10 });
    continue;
  }
  buildings.push(rec);
}
console.log(`  ${bJson.elements.length} ways → ${buildings.length} buildings (dropped: ${dropped.tiny} tiny, ${dropped.onTrack} on the track, ${dropped.open} open); landmarks: ${landmarks.map((l) => l.name).join(', ') || 'none'}`);
console.log(`  heights: ${buildings.length - estimatedCount} from OSM tags, ${estimatedCount} estimated from building type and footprint`);
const hs = buildings.map((b) => b.h).sort((a, b) => a - b);
if (hs.length) console.log(`  heights: median ${hs[Math.floor(hs.length / 2)]} m, p95 ${hs[Math.floor(hs.length * 0.95)]} m, max ${hs[hs.length - 1]} m`);

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  path.join(outDir, 'environment.json'),
  JSON.stringify({ source: '© OpenStreetMap contributors (ODbL)', fit: { ...T, residual: stats }, landmarks, buildings }),
);
console.log(`environment.json: ${(fs.statSync(path.join(outDir, 'environment.json')).size / 1024).toFixed(0)} KB`);
