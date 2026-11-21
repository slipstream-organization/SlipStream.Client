/**
 * Static world around a lap: elevated track ribbon, terrain, kerbs, run-off, barriers,
 * pit lane, grandstands, a bridge and the start gantry.
 *
 * Everything is built once per layout (and per map-view width scale) from the same centreline
 * the cars drive on — `LapModel.cx/cy/nx/ny` plus a per-station elevation `z` — so the cars,
 * the asphalt and every object line up exactly. Repeated pieces are InstancedMeshes (one draw
 * call each); nothing here runs per frame.
 *
 * Coordinates: data x → world X, data y (north) → world −Z, elevation → world Y.
 */
import * as THREE from 'three';
import { findCorners, type Corner, type LapModel } from './lapModel';
import { mulberry32 } from '../../shared/lib/utils';

export const SLAB_H = 0.35; // asphalt slab thickness, m
export const KERB_W = 1.2;
const LINE_W = 0.35; // white edge line
const RUNOFF_W = 26; // max run-off width outside a corner
const BARRIER_GAP = 9; // default barrier distance from the track edge

export type V3 = [number, number, number];

/** Everything the builders need to know about one layout. */
export interface WorldBase {
  lap: LapModel;
  z: Float32Array; // elevation per centreline station, m
  scale: number; // lateral exaggeration in map view (1 = real)
  half: number; // half track width × scale
  h: number; // slab height × scale
  corners: Corner[];
  /** +1 = pits on the +normal (left) side of the start straight, −1 = right */
  pitSide: 1 | -1;
  /** run-off width outside the corner at each station (0 elsewhere), and on which side */
  runoff: Float32Array;
  runoffSide: Int8Array;
  /** 1 = gravel trap (slow corners), 2 = asphalt run-off (fast corners) */
  runoffKind: Uint8Array;
  pit: { from: number; to: number }; // station range (may wrap, `from` < 0 allowed)
  grid: StationGrid;
}

const wrap = (i: number, n: number) => ((i % n) + n) % n;
const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** World point of station i at lateral offset d (+ = left) and height y above the track surface. */
export function stationPoint(w: Pick<WorldBase, 'lap' | 'z'>, i: number, d: number, y: number): V3 {
  const { lap, z } = w;
  return [lap.cx[i] + lap.nx[i] * d, z[i] + y, -(lap.cy[i] + lap.ny[i] * d)];
}

/** Elevation at a fractional station index (cars, trails, camera). */
export function elevationAt(z: Float32Array, fi: number) {
  const n = z.length;
  const i0 = Math.floor(fi);
  const f = fi - i0;
  const a = z[wrap(i0, n)], b = z[wrap(i0 + 1, n)];
  return a + (b - a) * f;
}

/** Yaw (around world Y) of the direction station i → i+1. */
function yawAt(lap: LapModel, i: number) {
  const j = (i + 1) % lap.n;
  return Math.atan2(lap.cy[j] - lap.cy[i], lap.cx[j] - lap.cx[i]);
}

// ── spatial index over centreline stations ──────────────────────────────────

export class StationGrid {
  private cells = new Map<number, number[]>();
  private lap: LapModel;
  private readonly cell = 40;
  constructor(lap: LapModel) {
    this.lap = lap;
    for (let i = 0; i < lap.n; i++) {
      const k = this.key(Math.floor(lap.cx[i] / this.cell), Math.floor(lap.cy[i] / this.cell));
      const list = this.cells.get(k);
      if (list) list.push(i);
      else this.cells.set(k, [i]);
    }
  }
  private key(gx: number, gy: number) {
    return (gx + 32768) * 65536 + (gy + 32768);
  }
  /**
   * Distance from (x, y) to the nearest station within `radius`, ignoring stations within
   * `skip` samples of `self` (so a point is not "blocked" by its own piece of track).
   * Also returns the lowest elevation among stations closer than `inner`.
   */
  query(x: number, y: number, radius: number, self = -1, skip = 0, z?: Float32Array, inner = 0) {
    const { lap } = this;
    const r = Math.ceil(radius / this.cell);
    const gx = Math.floor(x / this.cell), gy = Math.floor(y / this.cell);
    let best = Infinity, bestI = -1, zInner = Infinity;
    for (let a = -r; a <= r; a++)
      for (let b = -r; b <= r; b++) {
        const list = this.cells.get(this.key(gx + a, gy + b));
        if (!list) continue;
        for (const j of list) {
          if (self >= 0) {
            const dj = Math.abs(j - self);
            if (Math.min(dj, lap.n - dj) <= skip) continue;
          }
          const d = Math.hypot(lap.cx[j] - x, lap.cy[j] - y);
          if (d < best) {
            best = d;
            bestI = j;
          }
          if (z && d < inner && z[j] < zInner) zInner = z[j];
        }
      }
    return { d: best, i: bestI, zInner };
  }
}

// ── layout analysis ─────────────────────────────────────────────────────────

export function worldBase(lap: LapModel, z: Float32Array, scale: number): WorldBase {
  const half = lap.halfWidth * scale;
  const corners = findCorners(lap);
  const n = lap.n;

  // which side is the infield: a loop that turns left overall (CCW) has the infield on the left
  let turn = 0;
  for (let i = 0; i < n; i++) turn += lap.curvature[i];
  const infield: 1 | -1 = turn >= 0 ? 1 : -1;

  // run-off outside every corner, tapering in before the apex and out after the exit
  const runoff = new Float32Array(n);
  const runoffSide = new Int8Array(n);
  const runoffKind = new Uint8Array(n);
  for (const c of corners) {
    const side = lap.curvature[c.apex] > 0 ? -1 : 1; // outside of the turn
    const from = c.start - 6, to = c.end + 18; // exit side is longer
    const sharp = Math.min(1, Math.abs(lap.curvature[c.apex]) * 60); // tight corners get wider run-off
    const kind = sharp > 0.55 ? 1 : 2; // slow corners: gravel trap, fast ones: tarmac
    for (let k = from; k <= to; k++) {
      const i = wrap(k, n);
      const u = (k - from) / (to - from);
      const wdt = RUNOFF_W * (0.45 + 0.55 * sharp) * Math.sin(Math.PI * u) ** 0.6;
      if (wdt > runoff[i]) {
        runoff[i] = wdt;
        runoffSide[i] = side;
        runoffKind[i] = kind;
      }
    }
  }

  const ds = lap.length / n;
  return {
    lap,
    z,
    scale,
    half,
    h: 0.35 * scale,
    corners,
    pitSide: infield,
    runoff,
    runoffSide,
    runoffKind,
    pit: { from: -Math.round(330 / ds), to: Math.round(150 / ds) },
    grid: new StationGrid(lap),
  };
}

// ── track slab ──────────────────────────────────────────────────────────────

/** Raised asphalt ribbon: white edge lines + asphalt on top, skirts down into the terrain. UV u runs along the lap. */
export function slabGeometry(w: WorldBase, asphalt: THREE.Color, line: THREE.Color, side: THREE.Color) {
  const { lap, half, h, scale } = w;
  const n = lap.n;
  const lw = LINE_W * scale;
  const ds = lap.length / n;
  const pos: number[] = [], uv: number[] = [], col: number[] = [], idx: number[] = [];

  const strip = (dA: number, yA: number, dB: number, yB: number, c: THREE.Color, vA: number, vB: number) => {
    const base = pos.length / 3;
    for (let k = 0; k <= n; k++) {
      const i = k % n;
      pos.push(...stationPoint(w, i, dA, yA), ...stationPoint(w, i, dB, yB));
      const u = (k * ds) / 6;
      uv.push(u, vA, u, vB);
      col.push(c.r, c.g, c.b, c.r, c.g, c.b);
      if (k > 0) {
        const v = base + k * 2;
        idx.push(v - 2, v - 1, v, v - 1, v + 1, v);
      }
    }
  };
  const inner = half - lw;
  strip(half, h, inner, h, line, 0, 0.02);
  strip(inner, h, -inner, h, asphalt, 0.02, 0.98);
  strip(-inner, h, -half, h, line, 0.98, 1);
  // skirts go below the terrain, so no gap shows on slopes
  strip(half, -1.2, half, h, side, 0, 0.05);
  strip(-half, h, -half, -1.2, side, 0, 0.05);

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Fine asphalt grain (near-white, so it only darkens the vertex colour a little). */
export function asphaltTexture() {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  const rand = mulberry32(1337);
  for (let p = 0; p < size * size; p++) {
    const v = 205 + rand() * 50 - (rand() < 0.04 ? 60 : 0);
    img.data[p * 4] = img.data[p * 4 + 1] = img.data[p * 4 + 2] = v;
    img.data[p * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// ── terrain ─────────────────────────────────────────────────────────────────

/**
 * Heightfield under the circuit: follows the track elevation next to the asphalt (embankments),
 * relaxes to a smooth average further out and fades to the base level at the edges.
 * It is always kept below every piece of track it passes under, so crossovers stay clear.
 */
export function terrainGeometry(w: WorldBase, grassA: THREE.Color, grassB: THREE.Color) {
  const { lap, z, half, grid } = w;
  const n = lap.n;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < n; i++) {
    minX = Math.min(minX, lap.cx[i]); maxX = Math.max(maxX, lap.cx[i]);
    minY = Math.min(minY, lap.cy[i]); maxY = Math.max(maxY, lap.cy[i]);
  }
  const M = 420; // margin around the layout
  const spanX = maxX - minX + 2 * M, spanY = maxY - minY + 2 * M;
  const cell = Math.max(12, Math.max(spanX, spanY) / 150); // ~40% fewer vertices than before, still smooth under the fog
  const cols = Math.ceil(spanX / cell) + 1, rows = Math.ceil(spanY / cell) + 1;
  const stride = Math.max(1, Math.floor(n / 280));
  const near = 70 + half;

  const pos = new Float32Array(cols * rows * 3);
  const col = new Float32Array(cols * rows * 3);
  const uv = new Float32Array(cols * rows * 2); // world-aligned, one grass tile per 14 m
  const rand = mulberry32(42);
  const c = new THREE.Color();
  for (let gy = 0; gy < rows; gy++)
    for (let gx = 0; gx < cols; gx++) {
      const x = minX - M + gx * cell, y = minY - M + gy * cell;
      // broad shape: inverse-distance average of coarse stations, plus the coarse nearest distance
      let sw = 0, sz = 0, dCoarse = Infinity;
      for (let k = 0; k < n; k += stride) {
        const dx = lap.cx[k] - x, dy = lap.cy[k] - y;
        const d2 = dx * dx + dy * dy;
        const wt = 1 / (d2 + 2500);
        sw += wt;
        sz += wt * z[k];
        if (d2 < dCoarse) dCoarse = d2;
      }
      dCoarse = Math.sqrt(dCoarse);
      let height = sz / sw;
      let dist = dCoarse;
      if (dCoarse < near + stride * 4) {
        const q = grid.query(x, y, near, -1, 0, z, half + 4);
        dist = q.d;
        if (q.i >= 0) height += (z[q.i] - 0.7 - height) * (1 - smoothstep(half + 4, near, q.d));
        if (q.zInner < Infinity) height = Math.min(height, q.zInner - 0.7);
      }
      height *= 1 - smoothstep(240, M, dist);
      const p = (gy * cols + gx) * 3;
      pos[p] = x;
      pos[p + 1] = height - 0.05;
      pos[p + 2] = -y;
      c.copy(grassA).lerp(grassB, rand() * 0.7);
      col[p] = c.r; col[p + 1] = c.g; col[p + 2] = c.b;
      const q2 = (gy * cols + gx) * 2;
      uv[q2] = x / 14;
      uv[q2 + 1] = y / 14;
    }
  const idx: number[] = [];
  for (let gy = 0; gy < rows - 1; gy++)
    for (let gx = 0; gx < cols - 1; gx++) {
      const a = gy * cols + gx, b = a + 1, d = a + cols, e = d + 1;
      // world Z = −y flips handedness, so wind the other way round to face up
      idx.push(a, b, d, b, e, d);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  // make sure normals point up whatever the winding
  const nor = g.getAttribute('normal') as THREE.BufferAttribute;
  if (nor.getY(Math.floor(nor.count / 2)) < 0) {
    g.setIndex(idx.map((_, k) => idx[k - (k % 3) + [0, 2, 1][k % 3]]));
    g.computeVertexNormals();
  }
  return g;
}

// ── run-off and pit lane surfaces ──────────────────────────────────────────

/** Gravel traps (slow corners) and tarmac run-off (fast corners) outside the corners, one geometry for the whole lap. */
export function runoffGeometry(w: WorldBase, gravel: THREE.Color, tarmac: THREE.Color) {
  const { lap, runoff, runoffSide, runoffKind, half, scale } = w;
  const n = lap.n;
  const pos: number[] = [], col: number[] = [], idx: number[] = [];
  const edge = half + KERB_W * scale;
  let run = -1;
  for (let k = 0; k <= n; k++) {
    const i = k % n;
    const on = k < n && runoff[i] > 0.5;
    if (on) {
      const s = runoffSide[i];
      const c = runoffKind[i] === 1 ? gravel : tarmac;
      const v = pos.length / 3;
      pos.push(...stationPoint(w, i, s * edge, 0.02), ...stationPoint(w, i, s * (edge + runoff[i] * scale), 0.02));
      col.push(c.r, c.g, c.b, c.r, c.g, c.b);
      if (run >= 0 && runoffSide[wrap(i - 1, n)] === s) idx.push(v - 2, v - 1, v, v - 1, v + 1, v);
      run = i;
    } else run = -1;
  }
  const g = orientedGeometry(pos, idx);
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return g;
}

/** Pit lane next to the start straight, with tapered entry and exit. */
export function pitLaneGeometry(w: WorldBase) {
  const { lap, half, pitSide, pit } = w;
  const pos: number[] = [], idx: number[] = [];
  const len = pit.to - pit.from;
  for (let k = pit.from; k <= pit.to; k++) {
    const i = wrap(k, lap.n);
    const u = (k - pit.from) / len;
    const taper = Math.min(1, u / 0.12, (1 - u) / 0.08); // join the track at both ends
    const inner = half + 0.2 + 4.5 * taper;
    const outer = inner + 10 * Math.max(0.15, taper);
    const v = pos.length / 3;
    pos.push(...stationPoint(w, i, pitSide * inner, 0.03), ...stationPoint(w, i, pitSide * outer, 0.03));
    if (k > pit.from) idx.push(v - 2, v - 1, v, v - 1, v + 1, v);
  }
  return orientedGeometry(pos, idx);
}

/** Flat ribbon geometry whose normals always face up. */
function orientedGeometry(pos: number[], idx: number[]) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const nor = g.getAttribute('normal') as THREE.BufferAttribute;
  for (let k = 0; k < nor.count; k++) if (nor.getY(k) < 0) nor.setXYZ(k, -nor.getX(k), -nor.getY(k), -nor.getZ(k));
  return g;
}

// ── instanced pieces ────────────────────────────────────────────────────────

export interface Piece {
  p: V3;
  yaw: number; // around Y, radians (data heading)
  pitch?: number; // around the local lateral axis
  s: V3; // size: along, height, across
  color: THREE.Color;
}

/** One InstancedMesh of unit boxes for a list of pieces. */
export function instancedBoxes(pieces: Piece[], material: THREE.Material, cast = true) {
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const mesh = new THREE.InstancedMesh(geo, material, Math.max(1, pieces.length));
  mesh.count = pieces.length;
  const o = new THREE.Object3D();
  o.rotation.order = 'YZX';
  pieces.forEach((pc, k) => {
    o.position.set(pc.p[0], pc.p[1], pc.p[2]);
    o.rotation.set(0, pc.yaw, pc.pitch ?? 0);
    o.scale.set(pc.s[0], pc.s[1], pc.s[2]);
    o.updateMatrix();
    mesh.setMatrixAt(k, o.matrix);
    mesh.setColorAt(k, pc.color);
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingSphere(); // lets the whole set be frustum-culled (it is static)
  mesh.castShadow = cast;
  mesh.receiveShadow = true;
  return mesh;
}

/** Red/white kerbs: inside of every corner, plus the outside on the exit (where cars use it). */
export function kerbPieces(w: WorldBase, red: THREE.Color, white: THREE.Color): Piece[] {
  const { lap, z, half, h, scale, corners } = w;
  const n = lap.n;
  const kw = KERB_W * scale;
  const ds = lap.length / n;
  const out: Piece[] = [];
  const add = (k: number, side: number) => {
    const i = wrap(k, n), j = (i + 1) % n;
    const [x0, y0, z0] = stationPoint(w, i, side * (half + kw / 2), h + 0.04 * scale);
    const [x1, y1, z1] = stationPoint(w, j, side * (half + kw / 2), h + 0.04 * scale);
    out.push({
      p: [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2],
      yaw: yawAt(lap, i),
      pitch: Math.atan2(z[j] - z[i], ds),
      s: [Math.hypot(x1 - x0, z1 - z0) + 0.02, 0.1 * scale, kw],
      color: Math.floor(wrap(k, n) / 2) % 2 ? red : white,
    });
  };
  for (const c of corners) {
    const inside = lap.curvature[c.apex] > 0 ? 1 : -1;
    for (let k = c.start - 3; k <= c.end + 3; k++) add(k, inside);
    for (let k = c.start - 1; k <= c.end + 8; k++) add(k, -inside); // outside: the whole corner, longer on the exit
  }
  return out;
}

/** Barrier offset from the centreline at each station, for one side. */
function barrierOffset(w: WorldBase, i: number, side: number) {
  const { half, runoff, runoffSide, pit, pitSide, lap } = w;
  const k = i > lap.n / 2 ? i - lap.n : i;
  if (side === pitSide && k >= pit.from && k <= pit.to) return half + 3.2; // pit wall
  let off = half + BARRIER_GAP;
  if (runoffSide[i] === side) off = Math.max(off, half + KERB_W + runoff[i] + 3);
  return off;
}

/**
 * Concrete walls on both sides (every few metres a run of plain coloured hoarding panels — no
 * brands), tecpro blocks on the outside of corners. Skips pieces that would cut into another
 * part of the track.
 */
export function barrierPieces(w: WorldBase, wall: THREE.Color, tecpro: THREE.Color, white: THREE.Color, boards: THREE.Color[]): Piece[] {
  const { lap, z, half, grid, runoffSide } = w;
  const n = lap.n;
  const ds = lap.length / n;
  const step = 2; // stations per piece (~4 m)
  const out: Piece[] = [];
  for (const side of [1, -1]) {
    for (let i = 0; i < n; i += step) {
      const j = (i + step) % n;
      const oi = barrierOffset(w, i, side), oj = barrierOffset(w, j, side);
      const a = stationPoint(w, i, side * oi, 0), b = stationPoint(w, j, side * oj, 0);
      const mx = (a[0] + b[0]) / 2, mz = (a[2] + b[2]) / 2;
      // clearance from other parts of the layout (hairpins, parallel straights)
      const q = grid.query(mx, -mz, half + 3, i, Math.round(80 / ds));
      if (q.d < half + 3) continue;
      const tec = runoffSide[i] === side;
      const block = Math.floor(i / step);
      // hoardings: 3 panels out of every 9, colour changes per run
      const run = Math.floor(block / 9);
      const board = boards.length && block % 9 < 3 ? boards[run % boards.length] : null;
      const height = tec ? 1.3 : 1.25;
      out.push({
        p: [mx, (a[1] + b[1]) / 2 + height / 2, mz],
        yaw: yawAt(lap, i),
        pitch: Math.atan2(z[j] - z[i], ds * step),
        s: [Math.hypot(b[0] - a[0], b[2] - a[2]) + 0.05, height, tec ? 1.1 : 0.45],
        color: tec ? (block % 2 ? tecpro : white) : board ?? wall,
      });
    }
  }
  return out;
}

/**
 * Catch fence on top of every barrier piece: one vertical ribbon geometry, textured with a
 * see-through wire mesh (see `fenceTexture`). u runs along the fence in 2 m tiles.
 */
export function fenceGeometry(pieces: Piece[], height = 2.6) {
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (const pc of pieces) {
    const dx = Math.cos(pc.yaw) * (pc.s[0] / 2), dz = -Math.sin(pc.yaw) * (pc.s[0] / 2);
    const y0 = pc.p[1] + pc.s[1] / 2, y1 = y0 + height;
    const v = pos.length / 3;
    pos.push(pc.p[0] - dx, y0, pc.p[2] - dz, pc.p[0] + dx, y0, pc.p[2] + dz, pc.p[0] + dx, y1, pc.p[2] + dz, pc.p[0] - dx, y1, pc.p[2] - dz);
    const u = pc.s[0] / 2;
    uv.push(0, 0, u, 0, u, 1, 0, 1);
    idx.push(v, v + 1, v + 2, v, v + 2, v + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Wire mesh with posts and rails; alpha keeps the gaps mostly see-through. */
export function fenceTexture() {
  const size = 128;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, size, size);
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 1.5;
  for (let k = -size; k < size * 2; k += 12) {
    ctx.beginPath();
    ctx.moveTo(k, 0);
    ctx.lineTo(k + size, size);
    ctx.moveTo(k, size);
    ctx.lineTo(k + size, 0);
    ctx.stroke();
  }
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 6, size); // post
  ctx.fillRect(0, 0, size, 5); // top rail
  ctx.fillRect(0, size - 4, size, 4); // bottom rail
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Grass: near-white luminance noise plus mowing stripes (the hue comes from vertex colours). */
export function grassTexture() {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  const rand = mulberry32(99);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const stripe = Math.floor(x / (size / 4)) % 2 ? 14 : 0; // two lighter / darker bands per tile
      const v = Math.min(255, 214 + stripe + rand() * 34 - (rand() < 0.05 ? 40 : 0));
      const p = (y * size + x) * 4;
      img.data[p] = img.data[p + 1] = img.data[p + 2] = v;
      img.data[p + 3] = 255;
    }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Pit garages: a continuous low building behind the pit lane. */
export function garagePieces(w: WorldBase, building: THREE.Color, roof: THREE.Color): Piece[] {
  const { lap, half, pitSide, pit } = w;
  const out: Piece[] = [];
  const step = 6;
  const from = pit.from + Math.round((pit.to - pit.from) * 0.14), to = pit.to - Math.round((pit.to - pit.from) * 0.1);
  for (let k = from; k < to; k += step) {
    const i = wrap(k, lap.n), j = wrap(k + step, lap.n);
    const off = half + 26;
    const a = stationPoint(w, i, pitSide * off, 0), b = stationPoint(w, j, pitSide * off, 0);
    const len = Math.hypot(b[0] - a[0], b[2] - a[2]) + 0.3;
    const p: V3 = [(a[0] + b[0]) / 2, Math.min(a[1], b[1]), (a[2] + b[2]) / 2];
    out.push({ p: [p[0], p[1] + 3.5, p[2]], yaw: yawAt(lap, i), s: [len, 7, 16], color: building });
    out.push({ p: [p[0], p[1] + 7.2, p[2]], yaw: yawAt(lap, i), s: [len, 0.5, 18], color: roof });
  }
  return out;
}

/**
 * Grandstands: stepped rows with a roof. One main stand opposite the pits, plus stands on the
 * outside of the slowest corners. Segments that would clash with the track are skipped.
 */
export function standPieces(w: WorldBase, seatA: THREE.Color, seatB: THREE.Color, roof: THREE.Color): Piece[] {
  const { lap, z, half, grid, pitSide, corners, runoff } = w;
  const n = lap.n;
  const ds = lap.length / n;
  const out: Piece[] = [];
  const ROWS = 6;
  const stand = (from: number, to: number, side: number, base: number) => {
    const step = 4;
    for (let k = from; k < to; k += step) {
      const i = wrap(k, n), j = wrap(k + step, n);
      const yaw = yawAt(lap, i);
      // the whole depth of the stand must stay clear of other track sections
      const back = stationPoint(w, i, side * (base + ROWS * 2.3 + 2), 0);
      if (grid.query(back[0], -back[2], half + 6, i, Math.round(60 / ds)).d < half + 6) continue;
      const ground = Math.min(z[i], z[j]) - 0.3;
      for (let r = 0; r < ROWS; r++) {
        const off = base + r * 2.3;
        const a = stationPoint(w, i, side * off, 0), b = stationPoint(w, j, side * off, 0);
        const top = 1.4 * (r + 1);
        out.push({
          p: [(a[0] + b[0]) / 2, ground + top / 2, (a[2] + b[2]) / 2],
          yaw,
          s: [Math.hypot(b[0] - a[0], b[2] - a[2]) + 0.2, top, 2.4],
          color: r % 2 ? seatA : seatB,
        });
      }
      const a = stationPoint(w, i, side * (base + ROWS * 1.15), 0), b = stationPoint(w, j, side * (base + ROWS * 1.15), 0);
      out.push({ p: [(a[0] + b[0]) / 2, ground + ROWS * 1.4 + 4.5, (a[2] + b[2]) / 2], yaw, pitch: 0, s: [Math.hypot(b[0] - a[0], b[2] - a[2]) + 0.2, 0.4, ROWS * 2.3 + 3], color: roof });
    }
  };
  // main stand: opposite the pits along the start straight
  stand(-Math.round(60 / ds), Math.round(170 / ds), -pitSide, half + BARRIER_GAP + 4);
  // the two tightest corners get a stand on the outside, beyond the run-off
  const tight = [...corners].sort((a, b) => Math.abs(lap.curvature[b.apex]) - Math.abs(lap.curvature[a.apex])).slice(0, 2);
  for (const c of tight) {
    const side = lap.curvature[c.apex] > 0 ? -1 : 1;
    stand(c.apex - Math.round(40 / ds), c.apex + Math.round(80 / ds), side, half + KERB_W + runoff[c.apex] + 8);
  }
  return out;
}

/** A footbridge across a straight-ish section near mid-lap, and the start gantry. */
export function landmarkPieces(w: WorldBase, structure: THREE.Color, deck: THREE.Color, lamp: THREE.Color): Piece[] {
  const { lap, z, half, grid } = w;
  const n = lap.n;
  const ds = lap.length / n;
  const out: Piece[] = [];
  const span = (i: number, height: number, depth: number, color: THREE.Color, postOff: number) => {
    const yaw = yawAt(lap, i);
    const c = stationPoint(w, i, 0, 0);
    // deck across the track: "along" axis of the box is the track direction, so swap sizes
    out.push({ p: [c[0], c[1] + height, c[2]], yaw, s: [depth, 1.2, postOff * 2 + 2], color });
    for (const s of [1, -1]) {
      const p = stationPoint(w, i, s * postOff, 0);
      out.push({ p: [p[0], z[i] + height / 2, p[2]], yaw, s: [1.2, height, 1.2], color: structure });
    }
  };

  // bridge: lowest-curvature station around mid-lap with nothing else nearby
  let best = -1, bestScore = Infinity;
  for (let i = Math.floor(n * 0.3); i < n * 0.7; i += 3) {
    if (Math.abs(lap.curvature[i]) > 1 / 900) continue;
    const q = grid.query(lap.cx[i], lap.cy[i], half + 40, i, Math.round(120 / ds));
    if (q.d < half + 40) continue;
    const score = Math.abs(i - n * 0.45);
    if (score < bestScore) {
      bestScore = score;
      best = i;
    }
  }
  if (best >= 0) span(best, 8, 5, deck, half + 10);

  // start gantry with five lights
  span(0, 6.5, 1, structure, half + 2);
  const yaw0 = yawAt(lap, 0);
  for (let k = -2; k <= 2; k++) {
    const p = stationPoint(w, 0, k * 1.6, 0);
    out.push({ p: [p[0], z[0] + 5.6, p[2]], yaw: yaw0, s: [0.6, 0.9, 0.9], color: lamp });
  }
  return out;
}
