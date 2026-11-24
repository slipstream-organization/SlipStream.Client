import { useMemo, useRef, type RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { TrackBundle } from '../data/loadTrack';
import { distanceAt, type LapTrace } from '../data/trackData';
import { poseAt, type Playback } from './playback';

export type CameraMode = 'chase' | 'drone';

export interface Stats {
  fps: number;
  calls: number;
  triangles: number;
  dpr: number;
}

/**
 * Drives the camera and reports performance. Everything per frame lives in refs and scratch
 * vectors — no React state, no allocations. Smoothing is time-based (1 − e^(−k·dt)), so the camera
 * feels the same at 30 and 144 fps.
 */
export function Rig({ bundle, lap, mode, playback, onStats }: { bundle: TrackBundle; lap: LapTrace; mode: CameraMode; playback: RefObject<Playback>; onStats: (s: Stats) => void }) {
  const gl = useThree((x) => x.gl);
  const setDpr = useThree((x) => x.setDpr);
  const get = useThree((x) => x.get);
  const modeRef = useRef(mode);
  const st = useRef({ hint: 0, epoch: -1, snap: true, acc: 0, frames: 0, slow: 0, dpr: gl.getPixelRatio() });
  const v = useMemo(
    () => ({ p: new THREE.Vector3(), q: new THREE.Vector3(), fwd: new THREE.Vector3(), want: new THREE.Vector3(), look: new THREE.Vector3(), lookWant: new THREE.Vector3() }),
    [],
  );

  useFrame((_, dtRaw) => {
    modeRef.current = mode;
    const camera = get().camera;
    const s = st.current;
    const pb = playback.current;
    const dt = Math.min(dtRaw, 0.1);
    if (s.epoch !== pb.epoch) {
      s.epoch = pb.epoch;
      s.hint = 0;
      s.snap = true;
    }
    const { s: dist, i } = distanceAt(lap, pb.t, s.hint);
    s.hint = i;
    poseAt(bundle, lap, dist, v.p);
    poseAt(bundle, lap, dist + 9, v.q);
    v.fwd.subVectors(v.q, v.p).setY(0).normalize();

    if (modeRef.current === 'chase') {
      v.want.copy(v.p).addScaledVector(v.fwd, -8.5).setY(v.p.y + 2.4);
      v.lookWant.copy(v.p).addScaledVector(v.fwd, 24).setY(v.p.y + 1.1);
    } else {
      v.want.copy(v.p).addScaledVector(v.fwd, -46).setY(v.p.y + 78);
      v.lookWant.copy(v.p).addScaledVector(v.fwd, 12);
    }
    if (s.snap) {
      camera.position.copy(v.want);
      v.look.copy(v.lookWant);
      s.snap = false;
    } else {
      camera.position.lerp(v.want, 1 - Math.exp(-dt * 6));
      v.look.lerp(v.lookWant, 1 - Math.exp(-dt * 9));
    }
    camera.lookAt(v.look);

    // the faster the car, the wider the lens
    const cam = camera as THREE.PerspectiveCamera;
    const fov = 58 + (lap.speed[Math.min(lap.n, i)] / 350) * 14;
    if (Math.abs(cam.fov - fov) > 0.15) {
      cam.fov += (fov - cam.fov) * (1 - Math.exp(-dt * 4));
      cam.updateProjectionMatrix();
    }

    // stats twice a second; drop the pixel ratio if the frame time stays high
    s.acc += dtRaw;
    s.frames++;
    if (s.acc >= 0.5) {
      const fps = s.frames / s.acc;
      const r = gl.info.render;
      onStats({ fps, calls: r.calls, triangles: r.triangles, dpr: s.dpr });
      s.slow = fps < 30 ? s.slow + 1 : 0;
      if (s.slow >= 3 && s.dpr > 1) {
        s.dpr = Math.max(1, s.dpr - 0.25);
        setDpr(s.dpr);
        s.slow = 0;
      }
      s.acc = 0;
      s.frames = 0;
    }
  });
  return null;
}
