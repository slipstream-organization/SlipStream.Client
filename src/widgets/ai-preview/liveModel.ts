/**
 * Live race model. Until real timing data arrives from the API it simulates a full race
 * lap by lap (pace, tyre degradation per compound, pit stops) — the "actual" race — and,
 * at any lap, projects the order N laps ahead and at the flag from the expected pace and
 * the stops each driver still has to make. In production `actual` comes from live timing.
 */
import { DRIVERS, DRIVER_PACE, RACES } from '../../shared/mock/season';
import { mulberry32 } from '../../shared/lib/utils';
import { predictRace, type Compound } from './racePrediction';

const DEG: Record<Compound, number> = { S: 0.085, M: 0.055, H: 0.035 }; // s per lap of tyre age
const OFFSET: Record<Compound, number> = { S: -0.6, M: 0, H: 0.35 }; // fresh-tyre pace
const PIT_LOSS = 21.5;

interface Plan {
  stints: { compound: Compound; laps: number }[];
}

export interface LiveRace {
  laps: number;
  codes: string[];
  /** cumulative race time after each lap (index = lap, 0 = start line) */
  cum: Record<string, number[]>;
  /** position after each lap */
  pos: Record<string, number[]>;
  compound: Record<string, Compound[]>;
  tyreAge: Record<string, number[]>;
  pits: Record<string, number[]>;
  plan: Record<string, Plan>;
  base: number;
  pace: Record<string, number>;
}

const gauss = (rand: () => number) => {
  const u = Math.max(1e-9, rand()), v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

const cache = new Map<number, LiveRace>();

export function simulateLive(round: number): LiveRace {
  const hit = cache.get(round);
  if (hit) return hit;
  const ev = RACES.find((r) => r.round === round)!;
  const preview = predictRace(round);
  const rand = mulberry32(round * 911 + 3);
  const L = ev.laps;
  const base = ev.poleLapTime * 1.065;

  // grid = order of pole odds, lightly shuffled
  const grid = [...preview.odds].sort((a, b) => b.pole - a.pole || a.expected - b.expected).map((o) => o.code);
  const codes = DRIVERS.map((d) => d.code);
  const pace: Record<string, number> = {};
  const plan: Record<string, Plan> = {};
  for (const c of codes) {
    pace[c] = (0.97 - DRIVER_PACE[c]) * 6 + gauss(rand) * 0.08; // seconds per lap slower than ideal
    // most follow the favourite plan; pit lap varies per driver (undercut / overcut)
    const pick = rand();
    const strategies = preview.strategies;
    const s = pick < strategies[0].probability ? strategies[0] : pick < strategies[0].probability + strategies[1].probability ? strategies[1] : strategies[2];
    const jitter = Math.round(gauss(rand) * 3);
    const stints = s.stints.map((st, i) => ({ ...st, laps: i === 0 ? Math.max(6, st.laps + jitter) : st.laps }));
    const total = stints.reduce((a, b) => a + b.laps, 0);
    stints[stints.length - 1].laps += L - total;
    plan[c] = { stints };
  }

  const cum: LiveRace['cum'] = {}, pos: LiveRace['pos'] = {}, compound: LiveRace['compound'] = {}, tyreAge: LiveRace['tyreAge'] = {}, pits: LiveRace['pits'] = {};
  for (const c of codes) {
    cum[c] = [grid.indexOf(c) * 0.25];
    compound[c] = [plan[c].stints[0].compound];
    tyreAge[c] = [0];
    pits[c] = [];
    let lap = 0;
    plan[c].stints.forEach((st, si) => {
      for (let k = 0; k < st.laps; k++) {
        lap++;
        const age = k + 1;
        let t = base + pace[c] + OFFSET[st.compound] + DEG[st.compound] * age + gauss(rand) * 0.25;
        if (lap === 1) t += 2 + grid.indexOf(c) * 0.12; // standing start
        if (k === 0 && si > 0) {
          t += PIT_LOSS;
          pits[c].push(lap);
        }
        cum[c].push(cum[c][lap - 1] + t);
        compound[c].push(st.compound);
        tyreAge[c].push(age);
      }
    });
  }
  for (const c of codes) pos[c] = [grid.indexOf(c) + 1];
  for (let lap = 1; lap <= L; lap++) {
    [...codes].sort((a, b) => cum[a][lap] - cum[b][lap]).forEach((c, i) => (pos[c][lap] = i + 1));
  }

  const race = { laps: L, codes, cum, pos, compound, tyreAge, pits, plan, base, pace };
  cache.set(round, race);
  return race;
}

export interface Projection {
  lap: number;
  /** projected position for each of the next `horizon` laps (index 0 = lap+1) */
  future: Record<string, number[]>;
  finish: Record<string, number>;
  finishGapToNext: Record<string, number>; // how safe the projected finishing spot is (s)
  pendingStops: Record<string, number>;
}

/** Expected (noise-free) lap time for a driver on a given lap, from their plan. */
function expectedLap(race: LiveRace, c: string, lap: number) {
  let left = lap;
  for (let si = 0; si < race.plan[c].stints.length; si++) {
    const st = race.plan[c].stints[si];
    if (left <= st.laps) {
      return race.base + race.pace[c] + OFFSET[st.compound] + DEG[st.compound] * left + (left === 1 && si > 0 ? PIT_LOSS : 0);
    }
    left -= st.laps;
  }
  return race.base + race.pace[c];
}

export function project(race: LiveRace, lap: number, horizon = 10): Projection {
  const future: Projection['future'] = {};
  const finish: Projection['finish'] = {};
  const finishGapToNext: Projection['finishGapToNext'] = {};
  const pendingStops: Projection['pendingStops'] = {};
  const t: Record<string, number> = {};
  for (const c of race.codes) {
    t[c] = race.cum[c][lap];
    future[c] = [];
    pendingStops[c] = race.pits[c].filter((p) => p > lap).length;
  }
  const finishT: Record<string, number> = {};
  for (let l = lap + 1; l <= race.laps; l++) {
    for (const c of race.codes) t[c] += expectedLap(race, c, l);
    if (l - lap <= horizon) {
      [...race.codes].sort((a, b) => t[a] - t[b]).forEach((c, i) => future[c].push(i + 1));
    }
  }
  for (const c of race.codes) finishT[c] = t[c];
  const order = [...race.codes].sort((a, b) => finishT[a] - finishT[b]);
  order.forEach((c, i) => {
    finish[c] = i + 1;
    const neighbour = order[i + 1];
    finishGapToNext[c] = neighbour ? finishT[neighbour] - finishT[c] : 99;
  });
  return { lap, future, finish, finishGapToNext, pendingStops };
}
