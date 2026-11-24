import * as THREE from 'three';

/** One building from public/tracks/<id>/environment.json — footprint in the centre-line frame (x, y; scene z = −y). */
export interface BuildingRec {
  h: number;
  /** min_height (a podium the tower stands on), m */
  m?: number;
  /** footprint: x0, y0, x1, y1, … */
  p: number[];
}

export interface LandmarkRec {
  name: string;
  kind: 'sphere';
  x: number;
  y: number;
  radius: number;
}

export interface EnvironmentData {
  source: string;
  landmarks: LandmarkRec[];
  buildings: BuildingRec[];
}

export interface BuiltEnvironment {
  walls: THREE.BufferGeometry;
  roofs: THREE.BufferGeometry;
  /** aviation lights on the tallest towers */
  beacons: { x: number; y: number; z: number }[];
  triangles: number;
}

const WINDOW_W = 2.4; // metres per window column
const FLOOR_H = 3.4;
const TILE = 8; // the facade texture is 8 x 8 windows

/**
 * Extrudes every footprint into a box-like building: walls with a windows UV (a random offset per
 * building so no two facades repeat) and a flat roof. Everything is merged into two meshes.
 */
export function buildEnvironment(data: EnvironmentData, groundAt: (x: number, z: number) => number): BuiltEnvironment {
  const wp: number[] = [], wn: number[] = [], wu: number[] = [], wc: number[] = [], wi: number[] = [];
  const rp: number[] = [], rn: number[] = [], rc: number[] = [], ri: number[] = [];
  const beacons: BuiltEnvironment['beacons'] = [];
  let seed = 1234567;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

  for (const b of data.buildings) {
    const n = b.p.length / 2;
    if (n < 3) continue;
    const pts: [number, number][] = [];
    for (let i = 0; i < n; i++) pts.push([b.p[i * 2], -b.p[i * 2 + 1]]); // → scene x, z
    // orientation: shoelace; walls must face outward
    let area = 0, cx = 0, cz = 0;
    for (let i = 0; i < n; i++) {
      const [x1, z1] = pts[i], [x2, z2] = pts[(i + 1) % n];
      area += x1 * z2 - x2 * z1;
      cx += x1; cz += z1;
    }
    cx /= n; cz /= n;
    const ccw = area > 0;

    // the lowest ground under the footprint, so slopes never open a gap below the walls
    let g = Infinity;
    for (const [x, z] of pts) g = Math.min(g, groundAt(x, z));
    g = Math.min(g, groundAt(cx, cz));
    const y0 = g - 2.5 + (b.m ?? 0);
    const y1 = g + b.h;

    // facade: a darker or lighter tone per building, and a random offset into the windows texture
    const tone = 0.7 + rnd() * 0.5 + Math.min(0.35, b.h / 300);
    const uo = Math.floor(rnd() * TILE), vo = Math.floor(rnd() * TILE);
    let run = 0;
    for (let i = 0; i < n; i++) {
      const [x1, z1] = pts[i], [x2, z2] = pts[(i + 1) % n];
      const len = Math.hypot(x2 - x1, z2 - z1);
      if (len < 0.2) continue;
      // outward normal of the edge
      let nx = (z2 - z1) / len, nz = -(x2 - x1) / len;
      if (!ccw) { nx = -nx; nz = -nz; }
      const u0 = uo + run / WINDOW_W / 1, u1 = uo + (run + len) / WINDOW_W;
      const v0 = vo + (y0 - g + 2.5) / FLOOR_H, v1 = vo + (y1 - g + 2.5) / FLOOR_H;
      run += len;
      const base = wp.length / 3;
      for (const [x, y, z, u, v] of [[x1, y0, z1, u0, v0], [x1, y1, z1, u0, v1], [x2, y1, z2, u1, v1], [x2, y0, z2, u1, v0]] as [number, number, number, number, number][]) {
        wp.push(x, y, z); wn.push(nx, 0, nz); wu.push(u / TILE, v / TILE); wc.push(tone, tone, tone);
      }
      // triangle (p0, p1, p2): normal = (p1 − p0) × (p2 − p0); p0→p1 is straight up, p1→p2 along the edge
      const ex = x2 - x1, ez = z2 - z1;
      const nrm = new THREE.Vector3(0, y1 - y0, 0).cross(new THREE.Vector3(ex, y1 - y0, ez));
      if (nrm.x * nx + nrm.z * nz >= 0) wi.push(base, base + 1, base + 2, base, base + 2, base + 3);
      else wi.push(base, base + 2, base + 1, base, base + 3, base + 2);
    }

    // roof
    const contour = pts.map(([x, z]) => new THREE.Vector2(x, z));
    const tris = THREE.ShapeUtils.triangulateShape(contour, []);
    const rbase = rp.length / 3;
    for (const [x, z] of pts) { rp.push(x, y1, z); rn.push(0, 1, 0); const r = 0.1 + rnd() * 0.05; rc.push(r, r, r * 1.2); }
    for (const t of tris) {
      // up-facing winding
      const a = pts[t[0]], bb = pts[t[1]], c = pts[t[2]];
      const cr = (bb[0] - a[0]) * (c[1] - a[1]) - (bb[1] - a[1]) * (c[0] - a[0]);
      if (cr < 0) ri.push(rbase + t[0], rbase + t[1], rbase + t[2]);
      else ri.push(rbase + t[0], rbase + t[2], rbase + t[1]);
    }
    if (b.h > 70) beacons.push({ x: cx, y: y1 + 1.5, z: cz });
  }

  const walls = new THREE.BufferGeometry();
  walls.setAttribute('position', new THREE.Float32BufferAttribute(wp, 3));
  walls.setAttribute('normal', new THREE.Float32BufferAttribute(wn, 3));
  walls.setAttribute('uv', new THREE.Float32BufferAttribute(wu, 2));
  walls.setAttribute('color', new THREE.Float32BufferAttribute(wc, 3));
  walls.setIndex(wi);
  walls.computeBoundingSphere();
  const roofs = new THREE.BufferGeometry();
  roofs.setAttribute('position', new THREE.Float32BufferAttribute(rp, 3));
  roofs.setAttribute('normal', new THREE.Float32BufferAttribute(rn, 3));
  roofs.setAttribute('color', new THREE.Float32BufferAttribute(rc, 3));
  roofs.setIndex(ri);
  roofs.computeBoundingSphere();
  return { walls, roofs, beacons, triangles: (wi.length + ri.length) / 3 };
}
