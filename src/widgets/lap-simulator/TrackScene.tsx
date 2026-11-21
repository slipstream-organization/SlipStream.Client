import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { findCorners, indexAtTime, makePose, sampleAt, sampleInto, type LapModel } from './lapModel';
import type { SimClock } from './simClock';
import { useThemeVars } from '../../shared/lib/themeVars';
import { elevationProfile } from '../../shared/data/elevation';
import { SLAB_H, elevationAt, stationPoint, worldBase, type WorldBase } from './worldGeometry';
import { TrackWorld } from './TrackWorld';
import { loadCar, type CarInstance } from './carLoader';
import { carModelFor, type CarModelSpec } from '../../shared/config/carModels';
import type { TeamId } from '../../shared/model/types';

export type CameraMode = 'chase' | 'heli' | 'top';

export interface SceneRun {
  lap: LapModel;
  /** livery + trail colour */
  color: string;
  ghost?: boolean;
  /** livery + 3D model; unknown team → base model painted in `color` */
  teamId?: TeamId;
}

/**
 * Broadcast look: an elevated asphalt ribbon with white edge lines and red/white kerbs over
 * rolling terrain, run-off, barriers, pits and stands; cars in dark liveries with their run colour
 * and a glowing trail behind each car.
 * Colours come from the theme (--scene-* in index.css): night in dark mode, daylight in light mode.
 */
const SCENE_VARS = {
  sky: '--scene-sky',
  horizon: '--scene-horizon',
  runoffTarmac: '--scene-runoff-tarmac',
  boardA: '--scene-board-a',
  boardB: '--scene-board-b',
  fence: '--scene-fence',
  grass: '--scene-grass',
  grass2: '--scene-grass-2',
  asphalt: '--scene-asphalt',
  asphaltSide: '--scene-asphalt-side',
  line: '--scene-line',
  kerbRed: '--scene-kerb-red',
  kerbWhite: '--scene-kerb-white',
  runoff: '--scene-runoff',
  pitlane: '--scene-pitlane',
  barrier: '--scene-barrier',
  tecpro: '--scene-tecpro',
  building: '--scene-building',
  roof: '--scene-roof',
  seatA: '--scene-seat-a',
  seatB: '--scene-seat-b',
  lamp: '--scene-lamp',
  car: '--scene-car',
  carLight: '--scene-car-light',
  tyre: '--scene-tyre',
  pole: '--scene-pole',
  hemiSky: '--scene-hemi-sky',
  hemiGround: '--scene-hemi-ground',
  hemiIntensity: '--scene-hemi-intensity',
  sun: '--scene-sun-intensity',
  badge: '--scene-badge',
  badgeRing: '--scene-badge-ring',
  badgeText: '--scene-badge-text',
} as const;
type Palette = { [K in keyof typeof SCENE_VARS]: string };

/** Direction towards the sun (afternoon, from behind-left of a typical broadcast angle). */
const SUN = new THREE.Vector3(-0.45, 1, -0.32).normalize();
/** Half-size of the shadow box that follows the camera, metres — sharp shadows where you look. */
const SHADOW_R = 70;
const SHADOW_MAP = 2048;
/** Heli camera: distance behind, height above and sideways offset from the leader, metres. */
const HELI = { back: 26, up: 23, side: 5, ahead: 10 };

/** Sky dome: vertical gradient from the horizon haze to the zenith. Follows the camera; drawn first, never fogged. */
function skyGeometry(zenith: string, horizon: string) {
  const g = new THREE.SphereGeometry(1000, 32, 16);
  const pos = g.getAttribute('position');
  const top = new THREE.Color(zenith), low = new THREE.Color(horizon), c = new THREE.Color();
  const col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const t = Math.max(0, pos.getY(i) / 1000);
    c.copy(low).lerp(top, Math.pow(t, 0.55));
    col[i * 3] = c.r;
    col[i * 3 + 1] = c.g;
    col[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
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

/** Scratch poses for the render loop (one frame at a time, so module scope is safe). */
const S = makePose(), AHEAD = makePose(), TP = makePose();
/** Trail fade along its length, precomputed once: (k / TRAIL)^0.6. */
const FADE = Float32Array.from({ length: TRAIL + 1 }, (_, k) => (k / TRAIL) ** 0.6);

interface TrailStyle {
  h: number; // height above the asphalt
  side: number; // lateral shift so trails of cars on the same line run side by side
  wCore: number;
  wGlow: number;
  aCore: number;
  aGlow: number;
}

/**
 * Writes both trail ribbons (thin core + soft glow) of one car in a single pass straight into
 * their existing typed arrays — no allocations, one sample per vertex pair.
 */
function updateTrails(core: THREE.BufferGeometry, glow: THREE.BufferGeometry, lap: LapModel, z: Float32Array, fi: number, scale: number, st: TrailStyle, color: THREE.Color) {
  const cp = (core.getAttribute('position') as THREE.BufferAttribute).array as Float32Array;
  const cc = (core.getAttribute('color') as THREE.BufferAttribute).array as Float32Array;
  const gp = (glow.getAttribute('position') as THREE.BufferAttribute).array as Float32Array;
  const gc = (glow.getAttribute('color') as THREE.BufferAttribute).array as Float32Array;
  const { r, g, b } = color;
  for (let k = 0; k <= TRAIL; k++) {
    const raw = fi - (TRAIL - k); // oldest → newest
    const f = raw < 0 ? 0 : raw;
    sampleInto(lap, f, scale, TP);
    const y = elevationAt(z, f) + st.h;
    const i0 = Math.floor(f) % lap.n;
    const nx = lap.nx[i0], ny = lap.ny[i0];
    const p = k * 6, c = k * 8;
    // core
    let l = st.side + st.wCore, rr = st.side - st.wCore;
    cp[p] = TP.x + nx * l; cp[p + 1] = y; cp[p + 2] = -(TP.y + ny * l);
    cp[p + 3] = TP.x + nx * rr; cp[p + 4] = y; cp[p + 5] = -(TP.y + ny * rr);
    // glow, a hair lower so the core always draws on top
    l = st.side + st.wGlow;
    rr = st.side - st.wGlow;
    const yg = y - 0.01 * scale;
    gp[p] = TP.x + nx * l; gp[p + 1] = yg; gp[p + 2] = -(TP.y + ny * l);
    gp[p + 3] = TP.x + nx * rr; gp[p + 4] = yg; gp[p + 5] = -(TP.y + ny * rr);
    // nothing is drawn before the start of the lap
    const fade = raw < 0 ? 0 : FADE[k];
    const ac = st.aCore * fade, ag = st.aGlow * fade;
    cc[c] = r; cc[c + 1] = g; cc[c + 2] = b; cc[c + 3] = ac;
    cc[c + 4] = r; cc[c + 5] = g; cc[c + 6] = b; cc[c + 7] = ac;
    gc[c] = r; gc[c + 1] = g; gc[c + 2] = b; gc[c + 3] = ag;
    gc[c + 4] = r; gc[c + 5] = g; gc[c + 6] = b; gc[c + 7] = ag;
  }
  core.getAttribute('position').needsUpdate = true;
  core.getAttribute('color').needsUpdate = true;
  glow.getAttribute('position').needsUpdate = true;
  glow.getAttribute('color').needsUpdate = true;
}

/**
 * Keeps the frame rate steady: measures the average frame time over ~1 s and steps the pixel
 * ratio between 1 and min(devicePixelRatio, 2). Changes are rare (hysteresis), so resizes don't stutter.
 */
function AdaptiveDpr() {
  const setDpr = useThree((s) => s.setDpr);
  const st = useRef({ acc: 0, frames: 0, dpr: Math.min(window.devicePixelRatio || 1, 2), ceiling: Math.min(window.devicePixelRatio || 1, 2), cooldown: 2 });
  useFrame((_, dt) => {
    const s = st.current;
    s.acc += dt;
    s.frames++;
    s.cooldown -= dt;
    if (s.acc < 1) return;
    const avg = s.acc / s.frames;
    s.acc = 0;
    s.frames = 0;
    if (s.cooldown > 0) return;
    let next = s.dpr;
    if (avg > 1 / 50) {
      // below ~50 fps → fewer pixels, and never climb back to the level that was too slow
      next = Math.max(1, s.dpr - 0.25);
      s.ceiling = next;
    } else if (avg < 1 / 58 && s.dpr < s.ceiling) next = Math.min(s.ceiling, s.dpr + 0.25);
    if (next !== s.dpr) {
      s.dpr = next;
      s.cooldown = 3;
      setDpr(next);
    }
  });
  return null;
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

function badgeTexture(label: string, C: Palette) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.beginPath();
  ctx.arc(64, 64, 52, 0, Math.PI * 2);
  ctx.fillStyle = C.badge;
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = C.badgeRing;
  ctx.stroke();
  ctx.fillStyle = C.badgeText;
  ctx.font = 'bold 54px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 64, 68);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Track world + start line, flag and corner numbers. */
function Track({ base, badge, detail, C }: { base: WorldBase; badge: number; detail: boolean; C: Palette }) {
  const { lap, z, half, h, scale } = base;
  const start = useMemo(() => {
    const p = sampleAt(lap, 0);
    return { x: lap.cx[0], y: z[0], z: -lap.cy[0], rot: Math.atan2(p.ty, p.tx), nx: lap.nx[0], ny: lap.ny[0] };
  }, [lap, z]);
  const stripTex = useMemo(() => checkerTexture(14, 2), []);
  const flagTex = useMemo(() => checkerTexture(6, 4), []);
  useEffect(
    () => () => {
      stripTex.dispose();
      flagTex.dispose();
    },
    [stripTex, flagTex],
  );

  const corners = useMemo(
    () =>
      findCorners(lap).map((c) => {
        const i = c.apex;
        const out = lap.curvature[i] > 0 ? -1 : 1; // outside of the turn
        const p = stationPoint(base, i, out * (half + badge * 0.9), 0);
        return { label: `T${c.number}`, p, tex: badgeTexture(String(c.number), C) };
      }),
    [lap, base, half, badge, C],
  );
  useEffect(() => () => corners.forEach((c) => c.tex.dispose()), [corners]);

  const flagSide = half + 4 * scale;
  return (
    <group>
      <TrackWorld base={base} detail={detail} C={C} />
      {/* chequered start line */}
      <mesh position={[start.x, start.y + h + 0.04 * scale, start.z]} rotation={[-Math.PI / 2, 0, start.rot]}>
        <planeGeometry args={[2 * scale, half * 2]} />
        <meshBasicMaterial map={stripTex} />
      </mesh>
      {/* flag on a pole next to the line */}
      <group position={[start.x - start.nx * flagSide, start.y, start.z + start.ny * flagSide]} rotation={[0, start.rot, 0]} scale={scale}>
        <mesh position={[0, 4, 0]} castShadow>
          <cylinderGeometry args={[0.12, 0.12, 8, 8]} />
          <meshStandardMaterial color={C.pole} />
        </mesh>
        <mesh position={[0, 6.8, 1.6]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[3.2, 2.2]} />
          <meshBasicMaterial map={flagTex} side={THREE.DoubleSide} />
        </mesh>
      </group>
      {corners.map((c) => (
        <sprite key={c.label} position={[c.p[0], c.p[1] + badge * 0.7, c.p[2]]} scale={[badge, badge, 1]}>
          <spriteMaterial map={c.tex} depthWrite={false} />
        </sprite>
      ))}
    </group>
  );
}

/** Low-poly F1 car: carbon body with the run colour on the nose, engine cover and wings. */
function Car({ ghost, tint, C }: { ghost?: boolean; tint: string; C: Palette }) {
  const mats = useMemo(() => {
    const common = ghost ? { transparent: true, opacity: 0.75, depthWrite: false } : {};
    return {
      body: new THREE.MeshStandardMaterial({ color: C.car, metalness: 0.4, roughness: 0.35, ...common }),
      trim: new THREE.MeshStandardMaterial({ color: C.carLight, metalness: 0.3, roughness: 0.5, ...common }),
      livery: new THREE.MeshStandardMaterial({ color: tint, emissive: tint, emissiveIntensity: 0.35, metalness: 0.2, roughness: 0.4, ...common }),
      tyre: new THREE.MeshStandardMaterial({ color: C.tyre, roughness: 0.8, ...common }),
    };
  }, [ghost, tint, C]);
  useEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats]);

  const part = (pos: [number, number, number], size: [number, number, number], mat: THREE.Material, rot?: [number, number, number]) => (
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

/** GLB car in its team livery; shows `fallback` (the primitive car) until the model is ready or if it fails to load. */
function RaceCar({ spec, ghost, fallback, onWheels }: { spec: CarModelSpec; ghost?: boolean; fallback: React.ReactNode; onWheels: (w: THREE.Object3D[]) => void }) {
  const [car, setCar] = useState<CarInstance | null>(null);
  const report = useRef(onWheels);
  useEffect(() => {
    report.current = onWheels;
  });
  useEffect(() => {
    let alive = true;
    let mine: CarInstance | null = null;
    loadCar(spec, ghost)
      .then((c) => {
        if (!alive) return c.dispose();
        mine = c;
        setCar(c);
        report.current(c.wheels);
      })
      .catch(() => {
        /* keep the primitive car */
      });
    return () => {
      alive = false;
      mine?.dispose();
      report.current([]);
    };
  }, [spec, ghost]);
  return car ? <primitive object={car.object} /> : <>{fallback}</>;
}

interface SceneProps {
  circuitId: string;
  runs: SceneRun[];
  period: number; // loop length (s) — the slowest lap plus a short pause
  clock: React.RefObject<SimClock>;
  cameraMode: CameraMode;
  onTick: (t: number, indices: number[]) => void;
}

export function TrackScene({ circuitId, runs, period, clock, cameraMode, onTick }: SceneProps) {
  const C = useThemeVars(SCENE_VARS);
  const main = runs[0].lap;
  const cars = useRef<(THREE.Group | null)[]>([]);
  const carSpecs = useMemo(() => runs.map((r) => carModelFor(r.teamId, r.color)), [runs]);
  // wheel meshes per car (filled when a model finishes loading) and their accumulated roll angle
  const wheels = useRef<THREE.Object3D[][]>([]);
  const wheelAngle = useRef<number[]>([]);
  const markers = useRef<(THREE.Sprite | null)[]>([]);
  const disc = useMemo(() => discTexture(), []);
  useEffect(() => () => disc.dispose(), [disc]);
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
  // reused every frame — no allocations in the render loop
  const desired = useRef(new THREE.Vector3());
  const look = useRef(new THREE.Vector3());
  const indicesRef = useRef<number[]>([]);
  const headings = useRef<(number | null)[]>([]);
  // per-car pose of the current frame (preallocated), and the camera's own smoothed heading
  const poses = useRef({ x: new Float64Array(16), y: new Float64Array(16), g: new Float64Array(16), h: new Float64Array(16) });
  const camYaw = useRef<number | null>(null);
  const leader = useRef(0);
  const trailStyle = useRef<TrailStyle>({ h: 0, side: 0, wCore: 0, wGlow: 0, aCore: 0.7, aGlow: 0.09 });
  const sky = useRef<THREE.Mesh>(null);
  const { camera } = useThree();
  const getState = useThree((s) => s.get);

  /** Elevation per centreline station (real range per circuit, see shared/data/elevation). All laps share the centreline. */
  const z = useMemo(() => elevationProfile(circuitId, main.n), [circuitId, main.n]);

  const overview = useMemo(() => {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, sumZ = 0;
    for (let i = 0; i < main.n; i++) {
      minX = Math.min(minX, main.cx[i]); maxX = Math.max(maxX, main.cx[i]);
      minY = Math.min(minY, main.cy[i]); maxY = Math.max(maxY, main.cy[i]);
      sumZ += z[i];
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
    return { x: mx, z: -my, y: sumZ / main.n, size, view };
  }, [main, z]);

  // map view widens the track (like a model) so the whole layout reads clearly
  const mapView = cameraMode === 'top';
  const scale = mapView ? Math.max(1, overview.size / 650) : 1;
  const badge = mapView ? overview.size * 0.022 : 7;
  const h = SLAB_H * scale;
  const base = useMemo(() => worldBase(main, z, scale), [main, z, scale]);

  // Shadows (shadowMap.autoUpdate is off, see Canvas onCreated):
  //  - follow views: a small box around the camera target, re-rendered every frame → crisp shadows
  //  - map view: one wide static box over the whole layout, rendered once
  const light = useRef<THREE.DirectionalLight>(null);
  const shadowDirty = useRef(true);
  const skyGeo = useMemo(() => skyGeometry(C.sky, C.horizon), [C.sky, C.horizon]);
  useEffect(() => () => skyGeo.dispose(), [skyGeo]);
  // Tight near/far per view instead of a logarithmic depth buffer (which disables early-z and
  // costs fill rate on every pixel): close views need precision near the car, the map needs range.
  useEffect(() => {
    const pc = getState().camera as THREE.PerspectiveCamera;
    pc.near = mapView ? 5 : 0.5;
    pc.far = mapView ? overview.size * 8 + 3000 : 6000;
    pc.updateProjectionMatrix();
  }, [getState, mapView, overview]);

  useEffect(() => {
    const l = light.current;
    if (!l) return;
    const cam = l.shadow.camera;
    const r = mapView ? overview.size * 0.75 : SHADOW_R;
    cam.left = -r;
    cam.right = r;
    cam.top = r;
    cam.bottom = -r;
    cam.near = 1;
    cam.far = mapView ? overview.size * 3 : 600;
    cam.updateProjectionMatrix();
    // bias scales with the texel size (≈7 cm close up, metres over the whole map)
    l.shadow.normalBias = mapView ? 0.8 : 0.05;
    l.shadow.bias = mapView ? -0.001 : -0.0005;
    if (mapView) {
      const d = overview.size;
      l.position.set(overview.x + SUN.x * d, overview.y + SUN.y * d, overview.z + SUN.z * d);
      l.target.position.set(overview.x, overview.y, overview.z);
      l.target.updateMatrixWorld();
    }
    shadowDirty.current = true;
  }, [mapView, overview, base, C]);

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const t = clock.current.advance(dt, period);
    const indices = indicesRef.current;
    indices.length = 0;
    const P = poses.current;

    for (let k = 0; k < runs.length; k++) {
      const lap = runs[k].lap;
      // a finished car waits on the line until the loop restarts
      const fi = t >= lap.lapTime ? lap.n - 0.001 : indexAtTime(lap, t);
      indices.push(fi);
      const s = sampleInto(lap, fi, scale, S);
      const ahead = sampleInto(lap, (fi + 3) % lap.n, scale, AHEAD);
      const target = Math.atan2(ahead.y - s.y, ahead.x - s.x);
      const prev = headings.current[k];
      let hd = target;
      if (prev !== null && prev !== undefined) {
        let dh = target - prev;
        while (dh > Math.PI) dh -= Math.PI * 2;
        while (dh < -Math.PI) dh += Math.PI * 2;
        hd = prev + dh * (1 - Math.exp(-dt * 14)); // frame-rate independent smoothing
      }
      headings.current[k] = hd;
      const ground = elevationAt(z, fi);
      const g = cars.current[k];
      if (g) {
        // pitch with the slope: elevation 3 samples ahead vs here
        const pitch = Math.atan2(elevationAt(z, fi + 3) - ground, 6);
        g.position.set(s.x, ground + h + 0.01 + k * 0.01, -s.y);
        g.rotation.set(0, hd, pitch, 'YZX');
        const cs = mapView ? scale * 2.2 : 1;
        g.scale.set(cs, cs, cs);
      }
      // thin, semi-transparent ribbon in the car colour with a faint halo; both fade out behind the car
      const tw = mapView ? 2 : 1;
      const ts = trailStyle.current;
      ts.h = h + (0.08 + k * 0.03) * scale;
      ts.side = (k - (runs.length - 1) / 2) * 0.7 * tw * scale;
      ts.wCore = 0.14 * tw * scale;
      ts.wGlow = 0.75 * tw * scale;
      updateTrails(trails[k].core, trails[k].glow, lap, z, Math.min(fi, lap.n - 1), scale, ts, trailColors[k]);
      const m = markers.current[k];
      if (m) {
        m.visible = mapView;
        m.position.set(s.x, ground + h + overview.size * 0.012, -s.y);
      }
      const spin = wheels.current[k];
      if (spin?.length) {
        const c = clock.current;
        const simDt = c.playing ? dt * c.rate : 0;
        const a = (wheelAngle.current[k] ?? 0) + ((s.speed / 3.6) * simDt) / (spin[0].userData.radius as number);
        wheelAngle.current[k] = a % (Math.PI * 2);
        for (const w of spin) w.rotation[w.userData.axis as "x" | "y" | "z"] = (w.userData.spin as number) * wheelAngle.current[k];
      }
      P.x[k] = s.x;
      P.y[k] = s.y;
      P.g[k] = ground;
      P.h[k] = hd;
    }

    if (cameraMode === 'chase') {
      // onboard-style chase of the main car (your lap / the reference lap)
      const fx = Math.cos(P.h[0]), fz = -Math.sin(P.h[0]);
      desired.current.set(P.x[0] - fx * 13, P.g[0] + h + 4, -P.y[0] - fz * 13);
      look.current.set(P.x[0] + fx * 12, P.g[0] + h + 1, -P.y[0] + fz * 12);
    } else if (cameraMode === 'heli') {
      // broadcast heli: high and behind the leader, with its own slower heading so chicanes don't swing it.
      // The leader only changes when another car is clearly ahead (≈16 m) — close cars swap the lead
      // all the time, and following every swap made the camera jump between them.
      let L = leader.current < indices.length ? leader.current : 0;
      for (let k = 0; k < indices.length; k++) if (indices[k] > indices[L] + 8) L = k;
      if (t < 0.05) L = 0; // new loop: everyone is back on the grid
      leader.current = L;
      if (camYaw.current === null) camYaw.current = P.h[L];
      let dy = P.h[L] - camYaw.current;
      while (dy > Math.PI) dy -= Math.PI * 2;
      while (dy < -Math.PI) dy += Math.PI * 2;
      camYaw.current += dy * (1 - Math.exp(-dt * 2.2));
      const fx = Math.cos(camYaw.current), fz = -Math.sin(camYaw.current);
      const rx = -fz, rz = fx; // right-hand side of the travel direction
      desired.current.set(P.x[L] - fx * HELI.back + rx * HELI.side, P.g[L] + h + HELI.up, -P.y[L] - fz * HELI.back + rz * HELI.side);
      look.current.set(P.x[L] + fx * HELI.ahead, P.g[L] + h, -P.y[L] + fz * HELI.ahead);
    } else {
      // oblique overview, perpendicular to the long axis
      const v = overview.view, d = overview.size * 0.78;
      desired.current.set(overview.x - v.x * d, overview.y + overview.size * 0.62, overview.z + v.y * d);
      look.current.set(overview.x, overview.y, overview.z);
    }
    if (cameraMode !== 'heli') camYaw.current = null;
    const kk = 1 - Math.exp(-dt * (mapView ? 3 : 4));
    camera.position.lerp(desired.current, kk);
    camTarget.current.lerp(look.current, kk);
    camera.lookAt(camTarget.current);
    if (sky.current) sky.current.position.copy(camera.position);

    // sun + shadow box follow the camera target; snapped to whole shadow texels so edges don't shimmer
    const l = light.current;
    if (l && !mapView) {
      const texel = (2 * SHADOW_R) / SHADOW_MAP;
      const tx = Math.round(camTarget.current.x / texel) * texel;
      const ty = Math.round(camTarget.current.y / texel) * texel;
      const tz = Math.round(camTarget.current.z / texel) * texel;
      l.target.position.set(tx, ty, tz);
      l.target.updateMatrixWorld();
      l.position.set(tx + SUN.x * 250, ty + SUN.y * 250, tz + SUN.z * 250);
      state.gl.shadowMap.needsUpdate = true;
    } else if (shadowDirty.current) {
      state.gl.shadowMap.needsUpdate = true;
      shadowDirty.current = false;
    }

    onTick(t, indices);
  });

  const far = overview.size * 4 + 3000;
  return (
    <>
      <color attach="background" args={[C.horizon]} />
      <fog attach="fog" args={[C.horizon, mapView ? overview.size * 1.6 : 260, mapView ? overview.size * 3.5 : 1500]} />
      <mesh ref={sky} geometry={skyGeo} renderOrder={-1} frustumCulled={false}>
        <meshBasicMaterial vertexColors side={THREE.BackSide} fog={false} depthWrite={false} />
      </mesh>
      <AdaptiveDpr />
      <hemisphereLight args={[C.hemiSky, C.hemiGround, Number(C.hemiIntensity) || 0.7]} />
      <directionalLight
        ref={light}
        intensity={Number(C.sun) || 2.4}
        castShadow
        shadow-mapSize={[SHADOW_MAP, SHADOW_MAP]}
        shadow-bias={-0.0005}
        shadow-normalBias={0.05}
      />
      {/* flat ground beyond the terrain patch, lost in the fog */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[overview.x, -0.4, overview.z]} receiveShadow>
        <planeGeometry args={[far, far]} />
        <meshStandardMaterial color={C.grass} roughness={1} />
      </mesh>
      <Track base={base} badge={badge} detail={!mapView} C={C} />
      {runs.map((run, k) => (
        <group key={k} ref={(g) => void (cars.current[k] = g)}>
          <RaceCar spec={carSpecs[k]} ghost={run.ghost} fallback={<Car ghost={run.ghost} tint={run.color} C={C} />} onWheels={(w) => void (wheels.current[k] = w)} />
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
