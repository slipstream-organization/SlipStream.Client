import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { TrackBundle } from '../data/loadTrack';
import { distanceAt, type LapTrace } from '../data/trackData';
import { loadCar } from '../../lap-simulator/carLoader';
import { carModelFor } from '../../../shared/config/carModels';
import type { TeamId } from '../../../shared/model/types';
import { makeHologram } from './hologram';
import { poseAt, type Playback } from './playback';
import { poolTexture } from './textures';

const TRAIL_N = 110; // samples
const TRAIL_STEP = 2.4; // metres between them → ≈ 260 m of light behind the car
const TRAIL_W = 0.55; // half width, m

/** A flat ribbon whose vertices are rewritten every frame; alpha fades towards the tail. */
function makeTrail(rgb: [number, number, number], alpha: number) {
  const pos = new Float32Array(TRAIL_N * 2 * 3);
  const col = new Float32Array(TRAIL_N * 2 * 4);
  for (let k = 0; k < TRAIL_N; k++) {
    const a = (1 - k / (TRAIL_N - 1)) ** 1.7 * alpha;
    for (const j of [0, 1]) col.set([rgb[0], rgb[1], rgb[2], a], (k * 2 + j) * 4);
  }
  const idx: number[] = [];
  for (let k = 0; k < TRAIL_N - 1; k++) idx.push(2 * k, 2 * k + 1, 2 * k + 2, 2 * k + 1, 2 * k + 3, 2 * k + 2);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('color', new THREE.BufferAttribute(col, 4));
  g.setIndex(idx);
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5); // moves every frame — never cull it
  return g;
}

interface Car {
  lap: LapTrace;
  group: RefObject<THREE.Group | null>;
  wheels: RefObject<THREE.Object3D[]>;
  trail: THREE.BufferGeometry;
}

/**
 * The two laps on the track: the main car in the team livery and the other lap as a blue hologram,
 * each with a light trail on the asphalt. Both read the same clock, so the gap you see is the gap
 * between the laps. Wheels spin at the real speed.
 */
export function Cars({ bundle, main, ghost, playback, teamId, accent }: { bundle: TrackBundle; main: LapTrace; ghost: LapTrace; playback: RefObject<Playback>; teamId: TeamId; accent: string }) {
  const mainGroup = useRef<THREE.Group>(null);
  const ghostGroup = useRef<THREE.Group>(null);
  const mainWheels = useRef<THREE.Object3D[]>([]);
  const ghostWheels = useRef<THREE.Object3D[]>([]);
  const holoRef = useMemo(() => makeHologram('#3aa0ff'), []);
  const holo = holoRef.material;
  const cursors = useRef([
    { hint: 0, epoch: 0 },
    { hint: 0, epoch: 0 },
  ]);
  const pool = useMemo(() => poolTexture(), []);
  const trails = useMemo(() => ({ main: makeTrail([1.5, 1.5, 1.6], 0.85), ghost: makeTrail([0.25, 0.6, 2.2], 0.8) }), []);

  // the models: loaded once, the ghost is the same model with the hologram skin
  useEffect(() => {
    let dead = false;
    const spec = carModelFor(teamId, '#ffffff');
    const added: THREE.Object3D[] = [];
    Promise.all([loadCar(spec, false), loadCar(spec, true)]).then(([a, b]) => {
      if (dead || !mainGroup.current || !ghostGroup.current) return;
      a.object.rotation.order = 'YZX';
      b.object.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) m.material = holo;
      });
      mainGroup.current.add(a.object);
      ghostGroup.current.add(b.object);
      mainWheels.current = a.wheels;
      ghostWheels.current = b.wheels;
      added.push(a.object, b.object);
    });
    return () => {
      dead = true;
      added.forEach((o) => o.parent?.remove(o));
    };
  }, [teamId, holo]);

  const cars = useMemo<Car[]>(
    () => [
      { lap: main, group: mainGroup, wheels: mainWheels, trail: trails.main },
      { lap: ghost, group: ghostGroup, wheels: ghostWheels, trail: trails.ghost },
    ],
    [main, ghost, trails],
  );
  const v = useMemo(() => ({ p: new THREE.Vector3(), q: new THREE.Vector3(), a: new THREE.Vector3(), b: new THREE.Vector3() }), []);

  useFrame((_, dtRaw) => {
    const pb = playback.current;
    const dt = Math.min(dtRaw, 0.1);
    holoRef.setTime(pb.t);
    for (let n = 0; n < cars.length; n++) {
      const c = cars[n];
      const cur = cursors.current[n];
      if (cur.epoch !== pb.epoch) {
        cur.epoch = pb.epoch;
        cur.hint = 0;
      }
      const { s, i } = distanceAt(c.lap, pb.t, cur.hint);
      cur.hint = i;
      const g = c.group.current;
      if (g) {
        poseAt(bundle, c.lap, s, v.p);
        poseAt(bundle, c.lap, s + 6, v.q);
        const fx = v.q.x - v.p.x, fy = v.q.y - v.p.y, fz = v.q.z - v.p.z;
        g.position.copy(v.p);
        g.rotation.order = 'YZX';
        g.rotation.y = Math.atan2(-fz, fx); // the model's nose is +X
        g.rotation.z = Math.atan2(fy, Math.hypot(fx, fz));
        if (pb.playing) {
          const step = (c.lap.speed[Math.min(c.lap.n, i)] / 3.6) * dt;
          for (const w of c.wheels.current) w.rotation.z -= step / (w.userData.radius || 0.33);
        }
      }

      // the trail: positions behind the car, every TRAIL_STEP metres, as a ribbon on the asphalt
      const arr = c.trail.attributes.position.array as Float32Array;
      poseAt(bundle, c.lap, s, v.a);
      for (let k = 0; k < TRAIL_N; k++) {
        poseAt(bundle, c.lap, s - (k + 1) * TRAIL_STEP, v.b);
        const dx = v.a.x - v.b.x, dz = v.a.z - v.b.z;
        const l = Math.hypot(dx, dz) || 1;
        const px = (-dz / l) * TRAIL_W, pz = (dx / l) * TRAIL_W;
        const o = k * 6;
        arr[o] = v.a.x + px; arr[o + 1] = v.a.y + 0.14; arr[o + 2] = v.a.z + pz;
        arr[o + 3] = v.a.x - px; arr[o + 4] = v.a.y + 0.14; arr[o + 5] = v.a.z - pz;
        v.a.copy(v.b);
      }
      c.trail.attributes.position.needsUpdate = true;
    }
  });

  const mat = (
    <meshBasicMaterial vertexColors transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
  );
  return (
    <>
      <mesh geometry={trails.ghost} renderOrder={3}>{mat}</mesh>
      <mesh geometry={trails.main} renderOrder={3}>{mat}</mesh>
      <group ref={ghostGroup} />
      <group ref={mainGroup}>
        {/* the car lights the road under it */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]} renderOrder={2}>
          <planeGeometry args={[11, 11]} />
          <meshBasicMaterial map={pool} color={accent} transparent opacity={0.6} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
      </group>
    </>
  );
}
