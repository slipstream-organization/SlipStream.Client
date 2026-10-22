import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { findCorners, indexAtTime, sampleAt, type LapModel } from './lapModel';
import type { SimClock } from './simClock';

export type CameraMode = 'chase' | 'heli' | 'top';

export interface SceneRun {
  lap: LapModel;
  /** tint for ghost cars; the main car stays dark grey */
  color: string;
  ghost?: boolean;
}

/**
 * "Architect model" look (like Tilke renders): a solid white raised track on a soft grey
 * ground, corner numbers in circles, chequered flag at the start. Every surface is a separate
 * solid with real height, so nothing is coplanar and nothing flickers.
 */
const C = {
  sky: '#b9bdc3',
  ground: '#a4a8af',
  slab: '#f7f7f5',
  slabSide: '#c9ccd1',
  car: '#26272b',
  carLight: '#6f737a',
  tyre: '#111113',
};

const SLAB_H = 0.9;

// world coordinates: x → X, north (y) → −Z

/** Raised track: top face + both side faces, with flat (non-smoothed) normals. */
function slabGeometry(lap: LapModel, half: number, h: number) {
  const { n, cx, cy, nx, ny } = lap;
  const pos: number[] = [];
  const nor: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  const top = new THREE.Color(C.slab), side = new THREE.Color(C.slabSide);

  const strip = (a: (i: number) => [number, number, number], b: (i: number) => [number, number, number], normal: (i: number) => [number, number, number], c: THREE.Color) => {
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
  const L = (i: number, y: number): [number, number, number] => [cx[i] + nx[i] * half, y, -(cy[i] + ny[i] * half)];
  const R = (i: number, y: number): [number, number, number] => [cx[i] - nx[i] * half, y, -(cy[i] - ny[i] * half)];
  strip((i) => L(i, h), (i) => R(i, h), () => [0, 1, 0], top);
  strip((i) => L(i, 0), (i) => L(i, h), (i) => [nx[i], 0, -ny[i]], side);
  strip((i) => R(i, h), (i) => R(i, 0), (i) => [-nx[i], 0, ny[i]], side);

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  return g;
}

/** Fading trail behind a car: the last ~200 m of its line, from track colour to the car's colour. */
const TRAIL = 100; // samples (2 m each)
function makeTrail() {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array((TRAIL + 1) * 2 * 3), 3));
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array((TRAIL + 1) * 2 * 3), 3));
  const idx: number[] = [];
  for (let k = 1; k <= TRAIL; k++) {
    const v = k * 2;
    idx.push(v - 2, v - 1, v, v - 1, v + 1, v);
  }
  g.setIndex(idx);
  return g;
}

const SLAB_COLOR = new THREE.Color(C.slab);
const tmpColor = new THREE.Color();

function updateTrail(g: THREE.BufferGeometry, lap: LapModel, fi: number, scale: number, h: number, color: THREE.Color) {
  const pos = g.getAttribute('position') as THREE.BufferAttribute;
  const col = g.getAttribute('color') as THREE.BufferAttribute;
  const w = 0.55 * scale;
  for (let k = 0; k <= TRAIL; k++) {
    const f = Math.max(0, fi - (TRAIL - k)); // oldest → newest
    const s = sampleAt(lap, f, scale);
    const i0 = Math.floor(f) % lap.n;
    const nx = lap.nx[i0], ny = lap.ny[i0];
    pos.setXYZ(k * 2, s.x + nx * w, h, -(s.y + ny * w));
    pos.setXYZ(k * 2 + 1, s.x - nx * w, h, -(s.y - ny * w));
    tmpColor.copy(SLAB_COLOR).lerp(color, (k / TRAIL) ** 1.5);
    col.setXYZ(k * 2, tmpColor.r, tmpColor.g, tmpColor.b);
    col.setXYZ(k * 2 + 1, tmpColor.r, tmpColor.g, tmpColor.b);
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

function discTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d')!;
  ctx.beginPath();
  ctx.arc(32, 32, 30, 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function badgeTexture(label: string) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.beginPath();
  ctx.arc(64, 64, 54, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#8a8f98';
  ctx.stroke();
  ctx.fillStyle = '#3a3d44';
  ctx.font = 'bold 58px "JetBrains Mono", monospace';
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
  const slab = useMemo(() => slabGeometry(lap, half, h), [lap, half, h]);

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
        <meshStandardMaterial vertexColors roughness={0.75} />
      </mesh>
      {/* chequered start line */}
      <mesh position={[start.x, h + 0.1 * scale, start.z]} rotation={[-Math.PI / 2, 0, start.rot]}>
        <planeGeometry args={[2 * scale, half * 2]} />
        <meshBasicMaterial map={stripTex} />
      </mesh>
      {/* flag on a pole next to the line */}
      <group position={[start.x - start.nx * flagSide, 0, start.z + start.ny * flagSide]} rotation={[0, start.rot, 0]} scale={scale}>
        <mesh position={[0, 4, 0]} castShadow>
          <cylinderGeometry args={[0.12, 0.12, 8, 8]} />
          <meshStandardMaterial color="#55585e" />
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

function Car({ ghost, tint }: { ghost?: boolean; tint?: string }) {
  const ghostMat = useMemo(
    () => (ghost ? new THREE.MeshStandardMaterial({ color: tint, transparent: true, opacity: 0.55, depthWrite: false, emissive: tint, emissiveIntensity: 0.4 }) : null),
    [ghost, tint],
  );
  const body = ghostMat ?? undefined;
  const part = (pos: [number, number, number], size: [number, number, number], color: string, rot?: [number, number, number]) => (
    <mesh position={pos} rotation={rot} material={body}>
      <boxGeometry args={size} />
      {!ghost && <meshStandardMaterial color={color} metalness={0.3} roughness={0.45} />}
    </mesh>
  );
  const wheel = (x: number, z: number, r: number, w: number) => (
    <mesh position={[x, r, z]} rotation={[Math.PI / 2, 0, 0]} material={body}>
      <cylinderGeometry args={[r, r, w, 16]} />
      {!ghost && <meshStandardMaterial color={C.tyre} roughness={0.7} />}
    </mesh>
  );
  return (
    <group>
      {part([0, 0.12, 0], [4.6, 0.06, 1.7], C.car)}
      {part([0.4, 0.42, 0], [2.8, 0.42, 0.75], C.car)}
      {part([2.35, 0.33, 0], [1.5, 0.22, 0.34], C.car, [0, 0, -0.08])}
      {part([2.95, 0.12, 0], [0.55, 0.05, 1.95], C.carLight)}
      {part([-0.35, 0.36, 0], [1.7, 0.42, 1.55], C.car)}
      {part([-1.1, 0.62, 0], [1.8, 0.42, 0.5], C.car)}
      {part([-0.15, 0.9, 0], [0.45, 0.38, 0.32], C.carLight)}
      {part([0.55, 0.82, 0], [0.9, 0.06, 0.55], C.carLight)}
      {part([-2.3, 0.98, 0], [0.45, 0.06, 1.0], C.carLight)}
      {part([-2.3, 0.75, -0.5], [0.55, 0.55, 0.04], C.car)}
      {part([-2.3, 0.75, 0.5], [0.55, 0.55, 0.04], C.car)}
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
  useEffect(() => () => disc.dispose(), [disc]);
  const trails = useMemo(() => runs.map(() => makeTrail()), [runs]);
  const trailColors = useMemo(() => runs.map((r, k) => new THREE.Color(k === 0 ? C.car : r.color)), [runs]);
  useEffect(() => () => trails.forEach((t) => t.dispose()), [trails]);
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
      updateTrail(trails[k], lap, Math.min(fi, lap.n - 1), scale, h + (0.06 + k * 0.03) * scale, trailColors[k]);
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
      // oblique "architect model" view, perpendicular to the long axis
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
      <fog attach="fog" args={[C.sky, mapView ? overview.size * 1.6 : 350, mapView ? overview.size * 3.5 : 1600]} />
      <hemisphereLight args={['#ffffff', '#9da1a8', 1.4]} />
      <directionalLight
        ref={light}
        position={[overview.x - overview.size * 0.35, overview.size * 0.9, overview.z - overview.size * 0.25]}
        intensity={1.7}
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
        <meshStandardMaterial color={C.ground} roughness={1} />
      </mesh>
      <Track lap={main} scale={scale} badge={badge} />
      {runs.map((run, k) => (
        <group key={k} ref={(g) => void (cars.current[k] = g)}>
          <Car ghost={run.ghost} tint={run.color} />
        </group>
      ))}
      {trails.map((g, k) => (
        <mesh key={`t${k}`} geometry={g} frustumCulled={false}>
          <meshBasicMaterial vertexColors side={THREE.DoubleSide} />
        </mesh>
      ))}
      {/* map markers are sprites, so they stay round whatever the camera angle */}
      {runs.map((run, k) => {
        const d = overview.size * (k ? 0.014 : 0.017);
        return (
          <sprite key={`m${k}`} ref={(m) => void (markers.current[k] = m)} visible={false} scale={[d, d, 1]} renderOrder={50 - k}>
            <spriteMaterial map={disc} color={run.ghost ? run.color : '#26272b'} transparent depthTest={false} depthWrite={false} />
          </sprite>
        );
      })}
    </>
  );
}
