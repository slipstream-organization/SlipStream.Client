import * as THREE from 'three';
import type { TrackBundle } from '../data/loadTrack';
import type { LapTrace } from '../data/trackData';

/**
 * One shared clock for everything that moves — camera, cars, trails, labels. It lives outside React
 * state: the frame loop calls advance(), consumers read t and compare epoch to reset their cursors.
 */
export class Playback {
  /** seconds into the lap */
  t: number;
  playing: boolean;
  /** counts lap wrap-arounds so each consumer can reset its own cursor */
  epoch = 0;
  constructor(t = 0, playing = true) {
    this.t = t;
    this.playing = playing;
  }
  advance(dt: number, lapTime: number) {
    if (!this.playing) return;
    this.t += dt;
    if (this.t >= lapTime) {
      this.t -= lapTime;
      this.epoch++;
    }
  }
  setPlaying(on: boolean) {
    this.playing = on;
  }
}

/** Position on a lap's racing line at distance s (scene axes: x, elevation, −y). Writes into `out`. */
export function poseAt(bundle: TrackBundle, lap: LapTrace, s: number, out: THREE.Vector3) {
  const { centre, elevation } = bundle;
  const L = lap.length;
  const d = ((s % L) + L) % L;
  const f = d / lap.ds;
  const i = Math.min(lap.n - 1, Math.floor(f)), u = f - i;
  const x = lap.x[i] + (lap.x[i + 1] - lap.x[i]) * u;
  const y = lap.y[i] + (lap.y[i + 1] - lap.y[i]) * u;
  const fe = (d / centre.ds) % centre.n;
  const e0 = Math.floor(fe), e1 = (e0 + 1) % centre.n;
  return out.set(x, elevation[e0] + (elevation[e1] - elevation[e0]) * (fe - e0), -y);
}
