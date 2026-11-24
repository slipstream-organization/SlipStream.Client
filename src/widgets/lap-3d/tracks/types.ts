import type { TeamId } from '../../../shared/model/types';
/** Per-track scene config — everything that makes one circuit look like itself. */
export interface TrackConfig {
  id: string;
  name: string;
  /** a point on / near the circuit (WGS-84) — where OSM data is fetched and the fit starts */
  geo: { lat: number; lon: number };
  /** official lap length, m — the centre line measured from data is stretched to it */
  realLength: number;
  /** track width, m (not in the data) */
  width: number;
  /** emissive barrier colours, cycled along the lap */
  neon: string[];
  /** metres of barrier per neon colour */
  neonRun: number;
  /** night sky / fog */
  sky: string;
  fog: string;
  /** team of the main car (livery) */
  team: TeamId;
  /** cached laps in public/tracks/<id>/laps/ */
  pool: string[];
  laps: { file: string; label: string; year: number; driver: string }[];
}
