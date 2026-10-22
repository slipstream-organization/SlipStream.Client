/**
 * Continuous live-timing state on top of the lap-by-lap race simulation: where every car
 * is right now (mid-lap), gaps / intervals, last & best laps, tyres, DRS.
 * In production the same shape comes from the live timing feed.
 */
import type { LiveRace } from '../ai-preview/liveModel';
import type { Compound } from '../ai-preview/racePrediction';
import { mulberry32 } from '../../shared/lib/utils';
import { indexAtTime, sampleAt, type LapModel } from '../lap-simulator/lapModel';

export interface CarState {
  code: string;
  position: number;
  grid: number;
  /** laps completed + fraction of the current lap */
  progress: number;
  /** fraction of the current lap, 0..1 (time-based) */
  lapFrac: number;
  lap: number; // current lap number (1-based), capped at race laps
  finished: boolean;
  gap: string; // to leader
  interval: string; // to car ahead
  intervalSec: number;
  lastLap?: number;
  bestLap?: number;
  compound: Compound;
  tyreAge: number;
  pitStops: number;
  inPit: boolean;
  drs: boolean;
}

export interface TimingState {
  t: number;
  leaderLap: number;
  finished: boolean;
  cars: CarState[]; // sorted by position
  fastest?: { code: string; time: number; lap: number };
}

/** Race time at which `code` reached a given progress (laps + fraction). */
function timeAt(race: LiveRace, code: string, p: number) {
  const cum = race.cum[code];
  const l = Math.floor(p);
  if (l >= race.laps) return cum[race.laps];
  return cum[l] + (p - l) * (cum[l + 1] - cum[l]);
}

function progressAt(race: LiveRace, code: string, t: number) {
  const cum = race.cum[code];
  if (t <= cum[0]) return 0;
  if (t >= cum[race.laps]) return race.laps;
  let lo = 0, hi = race.laps;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (cum[mid] <= t) lo = mid;
    else hi = mid;
  }
  return lo + (t - cum[lo]) / (cum[lo + 1] - cum[lo]);
}

const fmtGap = (s: number) => `+${s.toFixed(s < 60 ? 3 : 1)}`;
const fmtLapped = (n: number) => `+${n} ${n === 1 ? 'КОЛО' : 'КОЛА'}`;

export const raceDuration = (race: LiveRace) => Math.max(...race.codes.map((c) => race.cum[c][race.laps]));
export const leaderFinishTime = (race: LiveRace) => Math.min(...race.codes.map((c) => race.cum[c][race.laps]));

export function timingAt(race: LiveRace, t: number): TimingState {
  const winnerT = leaderFinishTime(race);
  const raw = race.codes.map((code) => {
    // once the leader takes the flag, everyone finishes the lap they are on
    const flagLap = race.cum[code].findIndex((x) => x >= winnerT);
    const done = t >= race.cum[code][flagLap];
    return { code, progress: done ? flagLap : progressAt(race, code, t), done };
  });
  // finished cars are ordered by the time they crossed the line on their final lap
  const finishTime = (r: (typeof raw)[number]) => race.cum[r.code][r.progress];
  raw.sort((a, b) => b.progress - a.progress || a.code.localeCompare(b.code));
  const finishedFirst = raw.filter((r) => r.done).sort((a, b) => b.progress - a.progress || finishTime(a) - finishTime(b));
  const order = [...finishedFirst, ...raw.filter((r) => !r.done)];

  let fastest: TimingState['fastest'];
  const leader = order[0];
  const cars: CarState[] = order.map((r, i) => {
    const { code, progress, done } = r;
    const completed = Math.min(race.laps, Math.floor(progress));
    const lapFrac = done ? 0 : progress - Math.floor(progress);
    let best: number | undefined;
    for (let l = 1; l <= completed; l++) {
      const lt = race.cum[code][l] - race.cum[code][l - 1];
      if (best === undefined || lt < best) best = lt;
      if (!fastest || lt < fastest.time) fastest = { code, time: lt, lap: l };
    }
    const lastLap = completed > 0 ? race.cum[code][completed] - race.cum[code][completed - 1] : undefined;

    let gap = 'ЛІДЕР', interval = 'ЛІДЕР', intervalSec = 0;
    if (i > 0) {
      const ahead = order[i - 1];
      const toLeader = done ? finishTime(r) - finishTime(leader) : t - timeAt(race, leader.code, progress);
      const lappedBy = Math.floor(leader.progress - progress + (done ? 0 : 1e-9));
      gap = lappedBy >= 1 ? fmtLapped(lappedBy) : fmtGap(toLeader);
      intervalSec = done ? finishTime(r) - finishTime(ahead) : t - timeAt(race, ahead.code, progress);
      const lappedByAhead = Math.floor(ahead.progress - progress);
      interval = lappedByAhead >= 1 && !done ? fmtLapped(lappedByAhead) : fmtGap(intervalSec);
    }

    const lapIdx = Math.min(race.laps, completed + (done ? 0 : 1));
    const pitLap = race.pits[code].includes(completed + 1);
    return {
      code,
      position: i + 1,
      grid: race.pos[code][0],
      progress,
      lapFrac,
      lap: Math.max(1, lapIdx),
      finished: done,
      gap,
      interval,
      intervalSec,
      lastLap,
      bestLap: best,
      compound: race.compound[code][lapIdx],
      tyreAge: race.tyreAge[code][lapIdx],
      pitStops: race.pits[code].filter((p) => p <= completed + (pitLap && lapFrac > 0.08 ? 1 : 0)).length,
      // a stop happens at the start of its lap — show the car as "in pit" for the first slice
      inPit: !done && pitLap && lapFrac < 0.12,
      drs: !done && i > 0 && completed >= 2 && intervalSec < 1 && intervalSec > 0,
    };
  });

  const finished = t >= winnerT;
  return { t, leaderLap: Math.min(race.laps, Math.floor(leader.progress) + (finished ? 0 : 1)), finished, cars, fastest };
}

export interface Weather {
  air: number;
  track: number;
  humidity: number;
  wind: number;
  rainChance: number;
}

export function mockWeather(round: number): Weather {
  const rand = mulberry32(round * 131 + 9);
  const air = Math.round(18 + rand() * 12);
  return {
    air,
    track: Math.round(air + 10 + rand() * 12),
    humidity: Math.round(35 + rand() * 40),
    wind: Math.round((1 + rand() * 5) * 10) / 10,
    rainChance: Math.round(rand() * 20),
  };
}

const SAMPLE_STEP = 2; // lap model sample spacing, metres

/** Where on the lap model a car is, as a fractional sample index. */
export function carIndex(lap: LapModel, car: CarState) {
  if (car.finished) return 12 + (20 - car.position) * 3; // parked just past the line
  let fi = indexAtTime(lap, car.lapFrac * lap.lapTime);
  // lap 1: cars start from their grid slot (8 m apart) behind the line
  if (car.progress < 1) fi -= ((car.grid * 8) / SAMPLE_STEP) * (1 - car.lapFrac);
  return ((fi % lap.n) + lap.n) % lap.n;
}

/** Mock telemetry for the selected car: speed off the reference lap, gear, throttle / brake. */
export function telemetry(lap: LapModel, car: CarState) {
  const fi = carIndex(lap, car);
  const now = sampleAt(lap, fi, 0).speed;
  const ahead = sampleAt(lap, (fi + 6) % lap.n, 0).speed;
  const speed = car.finished ? 0 : car.inPit ? 80 : Math.round(now);
  return {
    speed,
    gear: speed === 0 ? 0 : Math.max(1, Math.min(8, Math.ceil(speed / 41))),
    throttle: car.inPit || ahead < now - 1 ? 0 : Math.min(100, Math.round(60 + (ahead - now) * 20)),
    brake: !car.inPit && ahead < now - 1,
  };
}
