import type { TrackConfig } from '../tracks/types';
import type { EnvironmentData } from '../scene/buildings';
import { buildCentreline, traceLap, type Centreline, type LapTrace, type PoolLap, type RawLap } from './trackData';

export interface TrackBundle {
  config: TrackConfig;
  centre: Centreline;
  /** smoothed elevation per station, metres above the lowest point */
  elevation: Float32Array;
  /** signed curvature per station, 1/m (+ = left) */
  curvature: Float32Array;
  laps: Record<string, LapTrace>;
  /** buildings and landmarks from OpenStreetMap, if the track has been prepared (tracks:osm) */
  environment: EnvironmentData | null;
}

const cache = new Map<string, Promise<TrackBundle>>();

async function json<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return r.json() as Promise<T>;
}

/** x / y of OpenF1 samples are 1/10 m; stretch them so the lap has the official length. */
const stretch = <T extends { pos: number[][] }>(lap: T, f: number): T => ({ ...lap, pos: lap.pos.map((p) => [p[0], p[1] * f, p[2] * f, p[3]]) });

export function loadTrack(config: TrackConfig): Promise<TrackBundle> {
  let p = cache.get(config.id);
  if (!p) {
    p = (async () => {
      const base = `/tracks/${config.id}/laps/`;
      const pools = await Promise.all(config.pool.map((f) => json<{ laps: PoolLap[] }>(base + f)));
      const raws = await Promise.all(config.laps.map((l) => json<RawLap>(base + l.file)));
      const pool = pools.flatMap((x) => x.laps);
      const environment = await json<EnvironmentData>(`/tracks/${config.id}/environment.json`).catch(() => null);

      // the measured line is ~1 % shorter than the official one (racing lines cut corners)
      const first = buildCentreline(pool);
      const f = config.realLength / first.length;
      const centre = buildCentreline(pool.map((l) => stretch(l, f)));
      const laps: Record<string, LapTrace> = {};
      config.laps.forEach((l, i) => {
        laps[l.label] = traceLap(stretch(raws[i], f), centre);
      });

      const n = centre.n;
      // elevation: GPS z is noisy — smooth it hard, then measure from the lowest point
      let z = Float32Array.from(centre.z);
      for (let pass = 0; pass < 6; pass++) {
        const next = new Float32Array(n);
        for (let i = 0; i < n; i++) {
          let a = 0;
          for (let d = -8; d <= 8; d++) a += z[(i + d + n) % n];
          next[i] = a / 17;
        }
        z = next;
      }
      const min = Math.min(...z);
      for (let i = 0; i < n; i++) z[i] -= min;

      const curvature = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const a = (i - 3 + n) % n, b = (i + 3) % n;
        curvature[i] = (centre.tx[a] * centre.ty[b] - centre.ty[a] * centre.tx[b]) / (6 * centre.ds);
      }
      return { config, centre, elevation: z, curvature, laps, environment };
    })();
    cache.set(config.id, p);
  }
  return p;
}
