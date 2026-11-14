import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { findCorners, indexAtTime, sampleAt, type LapModel } from './lapModel';
import type { SimClock } from './simClock';

export type CameraMode = 'chase' | 'heli' | 'top';

export interface SceneRun {
  lap: LapModel;
  /** livery + trail colour */
  color: string;
  ghost?: boolean;
}

/**
 * Night broadcast look: a dark asphalt ribbon with white edge lines and red/white kerbs on a
 * black ground, cars in dark liveries with their run colour, and a glowing trail behind each
 * car. Every surface is a separate solid with real height, so nothing is coplanar and nothing flickers.
 */
const C = {
  sky: '#050507',
  groundInner: '#17181d',
  groundMid: '#0c0c10',
  groundOuter: '#050507',
  asphalt: '#2c2d33',
  asphaltSide: '#101014',
  line: '#ececee',
  kerbRed: '#c8102e',
  kerbWhite: '#ececee',
  car: '#17181c',
  carLight: '#34363c',
  tyre: '#0a0a0b',
};

const SLAB_H = 0.35;
const LINE_W = 0.35; // white edge line, metres
const KERB_W = 1.1;

type V3 = [number, number, number];

// world coordinates: x → X, north (y) → −Z

/** Point at lateral offset `d` (+ = left) from the centreline, at height `y`. */
const at = (lap: LapModel, i: number, d: number, y: number): V3 => [lap.cx[i] + lap.nx[i] * d, y, -(lap.cy[i] + lap.ny[i] * d)];

/** Raised track: asphalt + white edge lines on top, both side faces, with flat (non-smoothed) normals. */
function slabGeometry(lap: LapModel, half: number, h: number, lw: number) {
  const { n, nx, ny } = lap;
  const pos: number[] = [];
  const nor: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  const asphalt = new THREE.Color(C.asphalt), line = new THREE.Color(C.line), side = new THREE.Color(C.asphaltSide);

  const strip = (a: (i: number) => V3, b: (i: number) => V3, normal: (i: number) => V3, c: THREE.Color) => {
    const base = pos.length / 3;
    for (let k = 0; k <= n; k++) {
      const i = k % n;
      pos.push(...a(i), ...b(i));
      const nn = normal(i);
      nor.push(...nn, ...nn);
      col.push(c.r, c.g, c.b, c.r, c.g, c.b);
      if (k > 0) {
        const v = base + k * 2;
        idx.push(v - 2, v - 1, v, v - 1, v + 1, v);
      }
    }
  };
  const up = (): V3 => [0, 1, 0];
  const inner = half - lw;
  strip((i) => at(lap, i, half, h), (i) => at(lap, i, inner, h), up, line);
  strip((i) => at(lap, i, inner, h), (i) => at(lap, i, -inner, h), up, asphalt);
  strip((i) => at(lap, i, -inner, h), (i) => at(lap, i, -half, h), up, line);
  strip((i) => at(lap, i, half, 0), (i) => at(lap, i, half, h), (i) => [nx[i], 0, -ny[i]], side);
  strip((i) => at(lap, i, -half, h), (i) => at(lap, i, -half, 0), (i) => [-nx[i], 0, ny[i]], side);

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  return g;
}

/** Red/white kerbs on both sides of every corner, a touch higher than the asphalt. */
function kerbGeometry(lap: LapModel, half: number, h: number, kw: number, block: number) {
  const { n, nx, ny } = lap;
  const pos: number[] = [];
  const nor: number[] = [];
  const col: number[] = [];
  const red = new THREE.Color(C.kerbRed), white = new THREE.Color(C.kerbWhite);
  // a, b at station i; c, d at station i+1 — same winding as the slab strips
  const quad = (a: V3, b: V3, c: V3, d: V3, nn: V3, cc: THREE.Color) => {
    pos.push(...a, ...b, ...c, ...b, ...d, ...c);
    for (let k = 0; k < 6; k++) {
      nor.push(...nn);
      col.push(cc.r, cc.g, cc.b);
    }
  };
  const pad = 4;
  for (const c of findCorners(lap)) {
    for (let k = c.start - pad; k <= c.end + pad; k++) {
      const i = ((k % n) + n) % n, j = (i + 1) % n;
      const cc = Math.floor((k + n) / block) % 2 ? red : white;
      // left kerb: top + outer face
      quad(at(lap, i, half + kw, h), at(lap, i, half, h), at(lap, j, half + kw, h), at(lap, j, half, h), [0, 1, 0], cc);
      quad(at(lap, i, half + kw, 0), at(lap, i, half + kw, h), at(lap, j, half + kw, 0), at(lap, j, half + kw, h), [nx[i], 0, -ny[i]], cc);
      // right kerb
      quad(at(lap, i, -half, h), at(lap, i, -half - kw, h), at(lap, j, -half, h), at(lap, j, -half - kw, h), [0, 1, 0], cc);
      quad(at(lap, i, -half - kw, h), at(lap, i, -half - kw, 0), at(lap, j, -half - kw, h), at(lap, j, -half - kw, 0), [-nx[i], 0, ny[i]], cc);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return g;
}

/** Glowing trail behind a car: the last ~600 m of its line, fading in towards the car (RGBA, additive). */
const TRAIL = 300; // samples (2 m each)
function makeTrail() {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array((TRAIL + 1) * 2 * 3), 3));
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array((TRAIL + 1) * 2 * 4), 4));
  const idx: number[] = [];
  for (let k = 1; k <= TRAIL; k++) {
    const v = k * 2;
    idx.push(v - 2, v - 1, v, v - 1, v + 1, v);
  }
  g.setIndex(idx);
  return g;
}

/** `side` shifts the trail sideways so trails of cars on the same line run next to each other. */
function updateTrail(g: THREE.BufferGeometry, lap: LapModel, fi: number, scale: number, h: number, w: number, side: number, alpha: number, color: THREE.Color) {
  const pos = g.getAttribute('position') as THREE.BufferAttribute;
  const col = g.getAttribute('color') as THREE.BufferAttribute;
  for (let k = 0; k <= TRAIL; k++) {
    const raw = fi - (TRAIL - k); // oldest → newest
    const f = Math.max(0, raw);
    const s = sampleAt(lap, f, scale);
    const i0 = Math.floor(f) % lap.n;
    const nx = lap.nx[i0], ny = lap.ny[i0];
    const l = side + w, r = side - w;
    pos.setXYZ(k * 2, s.x + nx * l, h, -(s.y + ny * l));
    pos.setXYZ(k * 2 + 1, s.x + nx * r, h, -(s.y + ny * r));
    // nothing is drawn before the start of the lap
    const a = raw < 0 ? 0 : alpha * (k / TRAIL) ** 0.6;
    col.setXYZW(k * 2, color.r, color.g, color.b, a);
    col.setXYZW(k * 2 + 1, color.r, color.g, color.b, a);
  }
  pos.needsUpdate = true;
  col.needsUpdate = true;
}

function checkerTexture(cols: number, rows: number) {
  const c = document.createElement('canvas');
  c.width = cols * 16;
  c.height = rows * 16;
  const ctx = c.getContext('2d')!;
  for (let x = 0; x < cols; x++)
    for (let y = 0; y < rows; y++) {
      ctx.fillStyle = (x + y) % 2 ? '#111' : '#fafafa';
      ctx.fillRect(x * 16, y * 16, 16, 16);
    }
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Soft pool of light under the circuit, fading to black towards the horizon. */
function groundTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
  g.addColorStop(0, C.groundInner);
  g.addColorStop(0.3, C.groundMid);
  g.addColorStop(1, C.groundOuter);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 512);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function discTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d')!;
  ctx.beginPath();
  ctx.arc(32, 32, 26, 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = 'rgba(0,0,0,0.85)';
  ctx.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function badgeTexture(label: string) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.beginPath();
  ctx.arc(64, 64, 52, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(14,14,18,0.88)';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.stroke();
  ctx.fillStyle = '#f4f4f5';
  ctx.font = 'bold 54px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 64, 68);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function Track({ lap, scale, badge }: { lap: LapModel; scale: number; badge: number }) {
  const half = lap.halfWidth * scale;
  const h = SLAB_H * scale;
  const slab = useMemo(() => slabGeometry(lap, half, h, LINE_W * scale), [lap, half, h, scale]);
  const kerbs = useMemo(() => kerbGeometry(lap, half, h + 0.06 * scale, KERB_W * scale, Math.max(2, Math.round(2 * scale))), [lap, half, h, scale]);
  useEffect(() => () => slab.dispose(), [slab]);
  useEffect(() => () => kerbs.dispose(), [kerbs]);

  const start = useMemo(() => {
    const p = sampleAt(lap, 0);
    const cx = lap.cx[0], cy = lap.cy[0];
    return { x: cx, z: -cy, rot: Math.atan2(p.ty, p.tx), nx: lap.nx[0], ny: lap.ny[0] };
  }, [lap]);
  const stripTex = useMemo(() => checkerTexture(14, 2), []);
  const flagTex = useMemo(() => checkerTexture(6, 4), []);

  const corners = useMemo(
    () =>
      findCorners(lap).map((c) => {
        const i = c.apex;
        const out = lap.curvature[i] > 0 ? -1 : 1; // outside of the turn
        const d = half + badge * 0.9;
        return { label: `T${c.number}`, x: lap.cx[i] + lap.nx[i] * d * out, y: lap.cy[i] + lap.ny[i] * d * out, tex: badgeTexture(String(c.number)) };
      }),
    [lap, half, badge],
  );
  useEffect(() => () => corners.forEach((c) => c.tex.dispose()), [corners]);

  const flagSide = half + 4 * scale;
  return (
    <group>
      <mesh geometry={slab} castShadow receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.85} metalness={0.05} />
      </mesh>
      <mesh geometry={kerbs} receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.6} />
      </mesh>
      {/* chequered start line */}
      <mesh position={[start.x, h + 0.04 * scale, start.z]} rotation={[-Math.PI / 2, 0, start.rot]}>
        <planeGeometry args={[2 * scale, half * 2]} />
        <meshBasicMaterial map={stripTex} />
      </mesh>
      {/* flag on a pole next to the line */}
      <group position={[start.x - start.nx * flagSide, 0, start.z + start.ny * flagSide]} rotation={[0, start.rot, 0]} scale={scale}>
        <mesh position={[0, 4, 0]} castShadow>
          <cylinderGeometry args={[0.12, 0.12, 8, 8]} />
          <meshStandardMaterial color="#8a8d94" />
        </mesh>
        <mesh position={[0, 6.8, 1.6]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[3.2, 2.2]} />
          <meshBasicMaterial map={flagTex} side={THREE.DoubleSide} />
        </mesh>
      </group>
      {corners.map((c) => (
        <sprite key={c.label} position={[c.x, badge * 0.7, -c.y]} scale={[badge, badge, 1]}>
          <spriteMaterial map={c.tex} depthWrite={false} />
        </sprite>
      ))}
    </group>
  );
}

/** Low-poly F1 car: carbon body with the run colour on the nose, engine cover and wings. */
function Car({ ghost, tint }: { ghost?: boolean; tint: string }) {
  const mats = useMemo(() => {
    const common = ghost ? { transparent: true, opacity: 0.75, depthWrite: false } : {};
    return {
      body: new THREE.MeshStandardMaterial({ color: C.car, metalness: 0.4, roughness: 0.35, ...common }),
      trim: new THREE.MeshStandardMaterial({ color: C.carLight, metalness: 0.3, roughness: 0.5, ...common }),
      livery: new THREE.MeshStandardMaterial({ color: tint, emissive: tint, emissiveIntensity: 0.35, metalness: 0.2, roughness: 0.4, ...common }),
      tyre: new THREE.MeshStandardMaterial({ color: C.tyre, roughness: 0.8, ...common }),
    };
  }, [ghost, tint]);
  useEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats]);

  const part = (pos: V3, size: V3, mat: THREE.Material, rot?: V3) => (
    <mesh position={pos} rotation={rot} material={mat} castShadow={!ghost}>
      <boxGeometry args={size} />
    </mesh>
  );
  const wheel = (x: number, z: number, r: number, w: number) => (
    <mesh position={[x, r, z]} rotation={[Math.PI / 2, 0, 0]} material={mats.tyre} castShadow={!ghost}>
      <cylinderGeometry args={[r, r, w, 16]} />
    </mesh>
  );
  return (
    <group>
      {part([0, 0.12, 0], [4.6, 0.06, 1.7], mats.body)}
      {part([0.4, 0.42, 0], [2.8, 0.42, 0.75], mats.body)}
      {part([2.35, 0.33, 0], [1.5, 0.22, 0.34], mats.livery, [0, 0, -0.08])}
      {part([2.95, 0.12, 0], [0.55, 0.05, 1.95], mats.livery)}
      {part([-0.35, 0.36, 0], [1.7, 0.42, 1.55], mats.body)}
      {part([-1.1, 0.62, 0], [1.8, 0.42, 0.5], mats.livery)}
      {part([-0.15, 0.9, 0], [0.45, 0.38, 0.32], mats.trim)}
      {part([0.55, 0.82, 0], [0.9, 0.06, 0.55], mats.trim)}
      {part([-2.3, 0.98, 0], [0.45, 0.06, 1.0], mats.livery)}
      {part([-2.3, 0.75, -0.5], [0.55, 0.55, 0.04], mats.body)}
      {part([-2.3, 0.75, 0.5], [0.55, 0.55, 0.04], mats.body)}
      {wheel(1.75, 0.85, 0.34, 0.36)}
      {wheel(1.75, -0.85, 0.34, 0.36)}
      {wheel(-1.6, 0.82, 0.37, 0.44)}
      {wheel(-1.6, -0.82, 0.37, 0.44)}
    </group>
  );
}

interface SceneProps {
  runs: SceneRun[];
  period: number; // loop length (s) — the slowest lap plus a short pause
  clock: React.RefObject<SimClock>;
  cameraMode: CameraMode;
  onTick: (t: number, indices: number[]) => void;
}

export function TrackScene({ runs, period, clock, cameraMode, onTick }: SceneProps) {
  const main = runs[0].lap;
  const cars = useRef<(THREE.Group | null)[]>([]);
  const markers = useRef<(THREE.Sprite | null)[]>([]);
  const disc = useMemo(() => discTexture(), []);
  const groundTex = useMemo(() => groundTexture(), []);
  useEffect(
    () => () => {
      disc.dispose();
      groundTex.dispose();
    },
    [disc, groundTex],
  );
  // each car gets a thin bright core and a wide soft glow underneath
  const trails = useMemo(() => runs.map(() => ({ core: makeTrail(), glow: makeTrail() })), [runs]);
  const trailColors = useMemo(() => runs.map((r) => new THREE.Color(r.color)), [runs]);
  useEffect(
    () => () =>
      trails.forEach((t) => {
        t.core.dispose();
        t.glow.dispose();
      }),
    [trails],
  );
  const camTarget = useRef(new THREE.Vector3());
  const headings = useRef<(number | null)[]>([]);
  const { camera } = useThree();

  const overview = useMemo(() => {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let i = 0; i < main.n; i++) {
      minX = Math.min(minX, main.cx[i]); maxX = Math.max(maxX, main.cx[i]);
      minY = Math.min(minY, main.cy[i]); maxY = Math.max(maxY, main.cy[i]);
    }
    const size = Math.max(maxX - minX, maxY - minY);
    const mx = (minX + maxX) / 2, my = (minY + maxY) / 2;
    let sxx = 0, syy = 0, sxy = 0;
    for (let i = 0; i < main.n; i += 4) {
      const dx = main.cx[i] - mx, dy = main.cy[i] - my;
      sxx += dx * dx; syy += dy * dy; sxy += dx * dy;
    }
    // look perpendicular to the long axis so the layout fills a wide frame
    const axis = 0.5 * Math.atan2(2 * sxy, sxx - syy);
    const view = { x: -Math.sin(axis), y: Math.cos(axis) }; // in data coords (north-up)
    return { x: mx, z: -my, size, view };
  }, [main]);

  // map view widens the track (like a model) so the whole layout reads clearly
  const mapView = cameraMode === 'top';
  const scale = mapView ? Math.max(1, overview.size / 650) : 1;
  const badge = mapView ? overview.size * 0.022 : 7;
  const h = SLAB_H * scale;

  // static shadow: rendered once per layout/scale instead of every frame
  // (autoUpdate is switched off in the Canvas onCreated callback)
  const light = useRef<THREE.DirectionalLight>(null);
  const shadowDirty = useRef(true);
  useEffect(() => {
    const l = light.current;
    if (l) {
      l.target.position.set(overview.x, 0, overview.z);
      l.target.updateMatrixWorld();
    }
    shadowDirty.current = true;
  }, [overview, scale]);

  useFrame((state, rawDt) => {
    if (shadowDirty.current) {
      state.gl.shadowMap.needsUpdate = true;
      shadowDirty.current = false;
    }
    const dt = Math.min(rawDt, 0.1);
    const t = clock.current.advance(dt, period);
    const indices: number[] = [];
    let mainPose = { x: 0, y: 0, h: 0 };

    runs.forEach((run, k) => {
      const lap = run.lap;
      // a finished car waits on the line until the loop restarts
      const fi = t >= lap.lapTime ? lap.n - 0.001 : indexAtTime(lap, t);
      indices.push(fi);
      const s = sampleAt(lap, fi, scale);
      const ahead = sampleAt(lap, (fi + 3) % lap.n, scale);
      const target = Math.atan2(ahead.y - s.y, ahead.x - s.x);
      const prev = headings.current[k];
      let hd = target;
      if (prev !== null && prev !== undefined) {
        let dh = target - prev;
        while (dh > Math.PI) dh -= Math.PI * 2;
        while (dh < -Math.PI) dh += Math.PI * 2;
        hd = prev + dh * Math.min(1, dt * 12);
      }
      headings.current[k] = hd;
      const g = cars.current[k];
      if (g) {
        g.position.set(s.x, h + 0.01 + k * 0.01, -s.y);
        g.rotation.set(0, hd, 0);
        const cs = mapView ? scale * 2.2 : 1;
        g.scale.set(cs, cs, cs);
      }
      const fiTrail = Math.min(fi, lap.n - 1);
      const tw = mapView ? 2 : 1;
      const th = h + (0.08 + k * 0.03) * scale;
      const side = (k - (runs.length - 1) / 2) * 0.7 * tw * scale;
      updateTrail(trails[k].glow, lap, fiTrail, scale, th - 0.01 * scale, 1.2 * tw * scale, side, 0.16, trailColors[k]);
      updateTrail(trails[k].core, lap, fiTrail, scale, th, 0.3 * tw * scale, side, 1, trailColors[k]);
      const m = markers.current[k];
      if (m) {
        m.visible = cameraMode === 'top';
        m.position.set(s.x, h + overview.size * 0.012, -s.y);
      }
      if (k === 0) mainPose = { x: s.x, y: s.y, h: hd };
    });

    const { x, y, h: hd } = mainPose;
    const fx = Math.cos(hd), fz = -Math.sin(hd);
    const desired = new THREE.Vector3();
    const look = new THREE.Vector3();
    if (cameraMode === 'chase') {
      desired.set(x - fx * 13, h + 4, -y - fz * 13);
      look.set(x + fx * 12, h + 1, -y + fz * 12);
    } else if (cameraMode === 'heli') {
      desired.set(x - fx * 30 + fz * 8, 36, -y - fz * 30 - fx * 8);
      look.set(x + fx * 22, 0, -y + fz * 22);
    } else {
      // oblique overview, perpendicular to the long axis
      const v = overview.view, d = overview.size * 0.78;
      desired.set(overview.x - v.x * d, overview.size * 0.62, overview.z + v.y * d);
      look.set(overview.x, 0, overview.z);
    }
    const k = 1 - Math.exp(-dt * (mapView ? 3 : 6));
    camera.position.lerp(desired, k);
    camTarget.current.lerp(look, k);
    camera.lookAt(camTarget.current);

    onTick(t, indices);
  });

  const far = overview.size * 3 + 2000;
  return (
    <>
      <color attach="background" args={[C.sky]} />
      <fog attach="fog" args={[C.sky, mapView ? overview.size * 1.6 : 300, mapView ? overview.size * 3.5 : 1400]} />
      <hemisphereLight args={['#c4cad8', '#000000', 0.7]} />
      <directionalLight
        ref={light}
        position={[overview.x - overview.size * 0.35, overview.size * 0.9, overview.z - overview.size * 0.25]}
        intensity={2.4}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-camera-left={-overview.size * 0.75}
        shadow-camera-right={overview.size * 0.75}
        shadow-camera-top={overview.size * 0.75}
        shadow-camera-bottom={-overview.size * 0.75}
        shadow-camera-far={overview.size * 3}
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[overview.x, 0, overview.z]} receiveShadow>
        <planeGeometry args={[far, far]} />
        <meshStandardMaterial map={groundTex} roughness={1} />
      </mesh>
      <Track lap={main} scale={scale} badge={badge} />
      {runs.map((run, k) => (
        <group key={k} ref={(g) => void (cars.current[k] = g)}>
          <Car ghost={run.ghost} tint={run.color} />
        </group>
      ))}
      {trails.map((t, k) => (
        <group key={`t${k}`}>
          <mesh geometry={t.glow} frustumCulled={false} renderOrder={10}>
            <meshBasicMaterial vertexColors transparent depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
          </mesh>
          <mesh geometry={t.core} frustumCulled={false} renderOrder={11}>
            <meshBasicMaterial vertexColors transparent depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
      {/* map markers are sprites, so they stay round whatever the camera angle */}
      {runs.map((run, k) => {
        const d = overview.size * (k ? 0.014 : 0.017);
        return (
          <sprite key={`m${k}`} ref={(m) => void (markers.current[k] = m)} visible={false} scale={[d, d, 1]} renderOrder={50 - k}>
            <spriteMaterial map={disc} color={run.color} transparent depthTest={false} depthWrite={false} />
          </sprite>
        );
      })}
    </>
  );
}
