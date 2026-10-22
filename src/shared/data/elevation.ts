/**
 * Elevation change per circuit (metres, lowest → highest point, approximate real values).
 * Until the API provides real altitude traces we synthesise a smooth closed profile with this range.
 */
import { mulberry32 } from '../lib/utils';

export const ELEVATION_RANGE: Record<string, number> = {
  spa: 102,
  red_bull_ring: 65,
  interlagos: 43,
  monaco: 42,
  americas: 41,
  suzuka: 40,
  hungaroring: 34,
  catalunya: 30,
  baku: 27,
  madring: 22,
  zandvoort: 18,
  bahrain: 17,
  monza: 13,
  silverstone: 11,
  shanghai: 7,
  yas_marina: 6,
  losail: 6,
  rodriguez: 5,
  villeneuve: 5,
  marina_bay: 4,
  miami: 4,
  albert_park: 3,
  vegas: 2,
};

/** Above this the track is shown as a tilted mini-3D model by default. */
export const HILLY_THRESHOLD = 20;

export const isHilly = (circuitId: string) => (ELEVATION_RANGE[circuitId] ?? 0) >= HILLY_THRESHOLD;

/**
 * Elevation (metres above the lowest point) at every `count` evenly spaced fraction of the lap.
 * A short Fourier series keeps it periodic, so the lap closes on itself.
 */
export function elevationProfile(circuitId: string, count: number): Float32Array {
  const range = ELEVATION_RANGE[circuitId] ?? 5;
  let seed = 7;
  for (const ch of circuitId) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  const rand = mulberry32(seed);
  const harmonics = [1, 2, 3, 5].map((k) => ({ k, a: (1 / k) * (0.6 + rand() * 0.8), ph: rand() * Math.PI * 2 }));
  const z = new Float32Array(count);
  let min = Infinity, max = -Infinity;
  for (let i = 0; i < count; i++) {
    const u = (i / count) * Math.PI * 2;
    let v = 0;
    for (const h of harmonics) v += h.a * Math.sin(h.k * u + h.ph);
    z[i] = v;
    min = Math.min(min, v);
    max = Math.max(max, v);
  }
  for (let i = 0; i < count; i++) z[i] = ((z[i] - min) / (max - min || 1)) * range;
  return z;
}
