import * as THREE from 'three';
import type { TrackBundle } from '../data/loadTrack';
import type { QualitySpec } from '../quality';

/**
 * Track geometry, generated from the centre line. Everything static is merged into a handful of
 * meshes (one draw call each); only lamps are instanced.
 *
 * Scene axes: x = east, y = up (elevation), z = −north. A station's left normal in the scene is
 * (nx, 0, −ny); "offset" below is metres to the left of the centre line (negative = right).
 */

type RGBA = [number, number, number, number];

class Mesh {
  pos: number[] = [];
  nor: number[] = [];
  uv: number[] = [];
  col: number[] = [];
  idx: number[] = [];
  private alpha: boolean;
  constructor(alpha = false) {
    this.alpha = alpha;
  }

  private vert(p: THREE.Vector3, n: THREE.Vector3, u: number, v: number, c: RGBA) {
    this.pos.push(p.x, p.y, p.z);
    this.nor.push(n.x, n.y, n.z);
    this.uv.push(u, v);
    this.col.push(c[0], c[1], c[2]);
    if (this.alpha) this.col.push(c[3]);
  }

  /** a quad a-b-c-d (in order around it); winding is fixed so its front faces `n` */
  quad(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3, n: THREE.Vector3, uv: [number, number][], col: [RGBA, RGBA, RGBA, RGBA]) {
    const base = this.pos.length / 3;
    [a, b, c, d].forEach((p, k) => this.vert(p, n, uv[k][0], uv[k][1], col[k]));
    const e1 = new THREE.Vector3().subVectors(b, a), e2 = new THREE.Vector3().subVectors(c, a);
    if (e1.cross(e2).dot(n) >= 0) this.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    else this.idx.push(base, base + 2, base + 1, base, base + 3, base + 2);
  }

  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, this.alpha ? 4 : 3));
    g.setIndex(this.idx);
    g.computeBoundingSphere();
    return g;
  }
}

export interface WorldGeometry {
  asphalt: THREE.BufferGeometry;
  lines: THREE.BufferGeometry;
  kerbs: THREE.BufferGeometry;
  concrete: THREE.BufferGeometry;
  led: THREE.BufferGeometry;
  glow: THREE.BufferGeometry | null;
  fence: THREE.BufferGeometry | null;
  pit: THREE.BufferGeometry;
  ground: THREE.BufferGeometry;
  /** lamp posts: x, y, z of the foot, rotation around Y so the head points at the track */
  lamps: { x: number; y: number; z: number; rot: number; side: number; sx: number; sz: number }[];
  /** start / finish: position, heading (angle of the tangent in the scene's XZ plane) */
  start: { x: number; y: number; z: number; heading: number };
  /** terrain height under a scene point (the same field the ground mesh is built from) */
  groundAt: (x: number, z: number) => number;
  /** bounds in the scene XZ plane */
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
}

const WHITE: RGBA = [1, 1, 1, 1];
const hex = (h: string): [number, number, number] => {
  const c = new THREE.Color(h);
  return [c.r, c.g, c.b];
};

export function buildWorld(bundle: TrackBundle, q: QualitySpec): WorldGeometry {
  const { centre: cl, elevation: zs, curvature, config } = bundle;
  const n = cl.n;
  const half = config.width / 2;
  const ds = cl.ds;

  const P = (i: number, off: number, dy = 0) => {
    const k = ((i % n) + n) % n;
    return new THREE.Vector3(cl.x[k] + cl.nx[k] * off, zs[k] + dy, -cl.y[k] - cl.ny[k] * off);
  };
  const UP = new THREE.Vector3(0, 1, 0);
  /** inward-pointing normal of a vertical wall on the side of `off` */
  const inward = (i: number, side: number) => {
    const k = ((i % n) + n) % n;
    return new THREE.Vector3(-cl.nx[k] * side, 0, cl.ny[k] * side);
  };

  const asphalt = new Mesh();
  const lines = new Mesh();
  const kerbs = new Mesh();
  const concrete = new Mesh();
  const led = new Mesh();
  const glowM = new Mesh(true);
  const fenceM = new Mesh();
  const pit = new Mesh();

  /** horizontal strip between lateral offsets a and b over stations [i0, i1) — u across, v along */
  const strip = (m: Mesh, i0: number, i1: number, a: number, b: number, dy: number, vScale: number, color: (i: number) => RGBA = () => WHITE) => {
    for (let i = i0; i < i1; i++) {
      const v0 = (i * ds) / vScale, v1 = ((i + 1) * ds) / vScale;
      m.quad(P(i, a, dy), P(i, b, dy), P(i + 1, b, dy), P(i + 1, a, dy), UP, [[0, v0], [1, v0], [1, v1], [0, v1]], [color(i), color(i), color(i + 1), color(i + 1)]);
    }
  };

  /** vertical strip at lateral offset `off` from height y0 to y1; faces the track */
  const wall = (m: Mesh, i0: number, i1: number, off: number, y0: number, y1: number, vScale: number, color: (i: number) => RGBA = () => WHITE, uvUp = false) => {
    const side = Math.sign(off) || 1;
    for (let i = i0; i < i1; i++) {
      const s0 = (i * ds) / vScale, s1 = ((i + 1) * ds) / vScale;
      const uv: [number, number][] = uvUp ? [[s0, 0], [s0, 1], [s1, 1], [s1, 0]] : [[0, s0], [1, s0], [1, s1], [0, s1]];
      m.quad(P(i, off, y0), P(i, off, y1), P(i + 1, off, y1), P(i + 1, off, y0), inward(i, side), uv, [color(i), color(i), color(i + 1), color(i + 1)]);
    }
  };

  const neon = config.neon.map(hex);
  const neonAt = (i: number): RGBA => {
    const c = neon[Math.floor((i * ds) / config.neonRun) % neon.length];
    return [c[0], c[1], c[2], 1];
  };
  const GREY: RGBA = [0.34, 0.35, 0.38, 1];
  const TOP: RGBA = [0.5, 0.5, 0.54, 1];

  // ── the road
  strip(asphalt, 0, n, -half, half, 0, 40);
  // white edge lines
  strip(lines, 0, n, half - 0.55, half - 0.15, 0.03, 10, () => [0.95, 0.95, 0.95, 1]);
  strip(lines, 0, n, -half + 0.15, -half + 0.55, 0.03, 10, () => [0.95, 0.95, 0.95, 1]);

  // ── kerbs on the inside of the corners (radius < ~140 m)
  const K = 1 / 140;
  let run = -1;
  for (let i = 0; i <= n; i++) {
    const on = i < n && Math.abs(curvature[i]) > K;
    if (on && run < 0) run = i;
    if (!on && run >= 0) {
      if (i - run >= 3) {
        const left = curvature[run + Math.floor((i - run) / 2)] > 0;
        const [a, b] = left ? [half - 0.6, half + 1.1] : [-half - 1.1, -half + 0.6];
        strip(kerbs, run, i, a, b, 0.05, 2.4);
      }
      run = -1;
    }
  }

  // ── barriers: concrete wall with a neon band, both sides, ~2.6 m beyond the edge
  const wallOff = half + 2.6;
  for (const side of [1, -1]) {
    const off = side * wallOff;
    wall(concrete, 0, n, off, -1.0, 1.05, 4, () => GREY);
    // the neon band on the track-facing side
    wall(led, 0, n, off - side * 0.02, 0.52, 0.8, 4, (i) => {
      const c = neonAt(i);
      return [c[0] * 2.2, c[1] * 2.2, c[2] * 2.2, 1];
    });
    // top of the wall
    strip(concrete, 0, n, side > 0 ? off : off - 0.6, side > 0 ? off + 0.6 : off, 1.05, 4, () => TOP);
    // neon light spilling onto the asphalt (additive, fades towards the middle)
    if (q.glow) {
      const spill = 4.5;
      for (let i = 0; i < n; i++) {
        const c = neonAt(i), c1 = neonAt(i + 1);
        const aOut: RGBA = [c[0], c[1], c[2], 0.2], aIn: RGBA = [c[0], c[1], c[2], 0];
        const bOut: RGBA = [c1[0], c1[1], c1[2], 0.2], bIn: RGBA = [c1[0], c1[1], c1[2], 0];
        const inner = side * (half - spill), outer = side * (half + 2.3);
        glowM.quad(P(i, inner, 0.06), P(i, outer, 0.06), P(i + 1, outer, 0.06), P(i + 1, inner, 0.06), UP, [[0, 0], [1, 0], [1, 1], [0, 1]], [aIn, aOut, bOut, bIn]);
      }
    }
    // catch fence above the wall
    if (q.fence) wall(fenceM, 0, n, off + side * 0.3, 1.05, 4.6, 1.3, () => [0.2, 0.21, 0.24, 1], true);
  }

  // ── pit lane: a simplified lane + pit wall on the right of the start straight
  {
    const from = n - Math.round(380 / ds), to = Math.round(140 / ds);
    const a = -(half + 9), b = -(half + 19);
    strip(pit, from, n + to, b, a, 0.0, 40, () => [0.78, 0.78, 0.8, 1]);
    wall(concrete, from, n + to, b - 0.4, -1.0, 1.0, 4, () => GREY);
    strip(lines, from, n + to, a - 0.5, a - 0.2, 0.03, 10, () => [0.95, 0.8, 0.1, 1]);
  }

  // ── start / finish
  strip(lines, 0, 1, -half, half, 0.04, 1, () => [0.95, 0.95, 0.95, 1]);

  // ── lamp posts, alternating sides
  const lamps: WorldGeometry['lamps'] = [];
  const stepI = Math.max(1, Math.round(q.lampSpacing / ds));
  for (let i = 0, k = 0; i < n; i += stepI, k++) {
    const side = k % 2 ? -1 : 1;
    const p = P(i, side * (wallOff + 3.2));
    // the head hangs over the road: direction from the post to the centre line, in the XZ plane
    const to = P(i, 0);
    lamps.push({ x: p.x, y: p.y, z: p.z, rot: Math.atan2(to.x - p.x, to.z - p.z), side, sx: to.x, sz: to.z });
  }

  // ── ground: a height field that follows the track's elevation
  const pts = Array.from({ length: n }, (_, i) => P(i, 0));
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const p of pts) {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z);
  }
  const M = q.groundMargin, CELL = 24;
  const gx0 = minX - M, gz0 = minZ - M;
  const gw = Math.ceil((maxX - minX + 2 * M) / CELL), gh = Math.ceil((maxZ - minZ + 2 * M) / CELL);
  // spatial hash for the nearest station
  const HASH = 60;
  const bins = new Map<string, number[]>();
  const key = (x: number, z: number) => `${Math.floor(x / HASH)},${Math.floor(z / HASH)}`;
  pts.forEach((p, i) => {
    const k = key(p.x, p.z);
    if (!bins.has(k)) bins.set(k, []);
    bins.get(k)!.push(i);
  });
  const nearest = (x: number, z: number) => {
    let best = Infinity, bi = 0;
    const cx = Math.floor(x / HASH), cz = Math.floor(z / HASH);
    for (let r = 1; r < 30; r++) {
      for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
        for (const i of bins.get(`${cx + dx},${cz + dz}`) ?? []) {
          const d = (pts[i].x - x) ** 2 + (pts[i].z - z) ** 2;
          if (d < best) { best = d; bi = i; }
        }
      }
      if (best < (r * HASH) ** 2) break;
    }
    return { i: bi, d: Math.sqrt(best) };
  };
  const base = Math.min(...Array.from(zs)) - 1.2;
  const groundAt = (x: number, z: number) => {
    const { i: st, d } = nearest(x, z);
    const w = Math.min(1, Math.max(0, (d - 30) / 220));
    return (zs[st] - 1.4) * (1 - w) + base * w;
  };
  const gpos = new Float32Array((gw + 1) * (gh + 1) * 3);
  const gcol = new Float32Array((gw + 1) * (gh + 1) * 3);
  for (let j = 0; j <= gh; j++) for (let i = 0; i <= gw; i++) {
    const x = gx0 + i * CELL, z = gz0 + j * CELL;
    const y = groundAt(x, z);
    const o = (j * (gw + 1) + i) * 3;
    gpos[o] = x; gpos[o + 1] = y; gpos[o + 2] = z;
    const shade = 0.05 + 0.025 * Math.sin(x * 0.013) * Math.cos(z * 0.011) + 0.012 * Math.sin(x * 0.07 + z * 0.05);
    gcol[o] = shade * 0.9; gcol[o + 1] = shade * 0.92; gcol[o + 2] = shade * 1.15;
  }
  const gidx: number[] = [];
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
    const a = j * (gw + 1) + i, b = a + 1, c = a + gw + 1, d = c + 1;
    gidx.push(a, c, b, b, c, d);
  }
  const ground = new THREE.BufferGeometry();
  ground.setAttribute('position', new THREE.BufferAttribute(gpos, 3));
  ground.setAttribute('color', new THREE.BufferAttribute(gcol, 3));
  ground.setIndex(gidx);
  ground.computeVertexNormals();

  const t0 = P(0, 0), t1 = P(1, 0);
  return {
    asphalt: asphalt.geometry(),
    lines: lines.geometry(),
    kerbs: kerbs.geometry(),
    concrete: concrete.geometry(),
    led: led.geometry(),
    glow: q.glow ? glowM.geometry() : null,
    fence: q.fence ? fenceM.geometry() : null,
    pit: pit.geometry(),
    ground,
    lamps,
    start: { x: t0.x, y: t0.y, z: t0.z, heading: Math.atan2(t1.x - t0.x, t1.z - t0.z) },
    groundAt,
    bounds: { minX, maxX, minZ, maxZ },
  };
}
