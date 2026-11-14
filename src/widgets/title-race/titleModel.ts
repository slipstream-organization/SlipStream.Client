/**
 * Title-race maths and forecast.
 * Mathematical chances: a driver is still in the fight while winning every remaining race would
 * take them past the leader (or level with them and ahead on wins — the first tie-break).
 * Forecast: Monte-Carlo of the remaining rounds from base pace + recent form, deterministic for a
 * given set of completed rounds so the page is stable between reloads. Replace with a real model/API later.
 */
import { DRIVERS, DRIVER_PACE, RACES, isCompleted } from '../../shared/mock/season';
import { POINTS, generateWeekend } from '../../shared/mock/results';
import type { RaceEvent, StandingRow, StandingsHistory } from '../../shared/model/types';
import { mulberry32 } from '../../shared/lib/utils';

export const MAX_PER_RACE = POINTS[0];

export type TitleStatus = 'champion' | 'leader' | 'alive' | 'out';

export interface TitleChance {
  code: string;
  position: number;
  points: number;
  wins: number;
  /** points if the driver wins every remaining race */
  maxPoints: number;
  gap: number; // to the leader
  status: TitleStatus;
  /** label of the round after which the driver could no longer catch the leader */
  outAfter?: string;
}

export interface TitleMaths {
  remaining: RaceEvent[];
  maxRemaining: number;
  leader: StandingRow;
  drivers: TitleChance[];
  decided: boolean;
  /** lead over P2 the leader needs after the next race to clinch the title there */
  clinchLead?: number;
}

export function titleMaths(table: StandingRow[], history: StandingsHistory, now = Date.now()): TitleMaths {
  const remaining = RACES.filter((r) => !isCompleted(r, now));
  const R = remaining.length;
  const maxRemaining = R * MAX_PER_RACE;
  const leader = table[0];

  const canCatch = (row: StandingRow) => {
    const max = row.points + maxRemaining;
    return max > leader.points || (max === leader.points && row.wins + R > leader.wins);
  };

  // round after which each driver dropped out of reach (history only knows points, so ties count as alive)
  const outRound = (code: string) => {
    const n = history.rounds.length;
    for (let j = 0; j < n; j++) {
      const lead = Math.max(...Object.values(history.series).map((s) => s.points[j]));
      const rem = RACES.length - (j + 1);
      if (history.series[code].points[j] + rem * MAX_PER_RACE < lead) return history.rounds[j].label;
    }
    return history.rounds[n - 1]?.label;
  };

  const decided = table.slice(1).every((r) => !canCatch(r));
  const drivers = table.map((row, i): TitleChance => {
    const status: TitleStatus = i === 0 ? (decided ? 'champion' : 'leader') : canCatch(row) ? 'alive' : 'out';
    return {
      code: row.id,
      position: row.position,
      points: row.points,
      wins: row.wins,
      maxPoints: row.points + maxRemaining,
      gap: leader.points - row.points,
      status,
      outAfter: status === 'out' ? outRound(row.id) : undefined,
    };
  });

  return {
    remaining,
    maxRemaining,
    leader,
    drivers,
    decided,
    clinchLead: !decided && R > 0 ? (R - 1) * MAX_PER_RACE + 1 : undefined,
  };
}

export interface DriverForecast {
  code: string;
  title: number; // 0..1
  expected: number; // mean final points
  p10: number;
  p90: number;
  /** most likely final championship position */
  likelyPos: number;
  expectedPos: number;
}

export interface TitleForecast {
  sims: number;
  drivers: DriverForecast[]; // sorted by expected final points
  /** probability that the title is settled at each remaining round */
  decidedAt: { round: number; label: string; p: number }[];
}

const SIMS = 6000;
const DNF = 0.07;

const gauss = (rand: () => number) => {
  const u = Math.max(1e-9, rand()), v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

/** Recent form 0..1: exponentially weighted points of the last 5 completed rounds. */
function form(now: number) {
  const done = RACES.filter((r) => isCompleted(r, now)).slice(-5);
  const raw: Record<string, number> = Object.fromEntries(DRIVERS.map((d) => [d.code, 0]));
  done.forEach((r, i) => {
    const w = 0.6 ** (done.length - 1 - i);
    for (const row of generateWeekend(r.round).race) raw[row.driverCode] += row.points * w;
  });
  const max = Math.max(1, ...Object.values(raw));
  return Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, v / max]));
}

export function titleForecast(table: StandingRow[], now = Date.now()): TitleForecast {
  const remaining = RACES.filter((r) => !isCompleted(r, now));
  const R = remaining.length;
  const codes = table.map((r) => r.id);
  const n = codes.length;
  const f = form(now);
  const strength = codes.map((c) => DRIVER_PACE[c] + 0.06 * f[c]);
  const rand = mulberry32(2026 * 31 + RACES.length - R);

  const finals = codes.map(() => new Float32Array(SIMS));
  const titles = new Float64Array(n);
  const posCount = codes.map(() => new Float64Array(n));
  const decided = new Float64Array(Math.max(1, R));

  const pts = new Float64Array(n);
  const wins = new Float64Array(n);
  const order = codes.map((_, i) => i);
  const score = new Float64Array(n);
  const rank = (a: number, b: number) => pts[b] - pts[a] || wins[b] - wins[a];

  for (let s = 0; s < SIMS; s++) {
    table.forEach((r, i) => {
      pts[i] = r.points;
      wins[i] = r.wins;
    });
    let settled = -1;
    for (let k = 0; k < R; k++) {
      for (let i = 0; i < n; i++) score[i] = rand() < DNF ? -1 : strength[i] + gauss(rand) * 0.045;
      order.sort((a, b) => score[b] - score[a]);
      for (let p = 0; p < POINTS.length; p++) {
        const i = order[p];
        if (score[i] < 0) break; // everyone behind retired
        pts[i] += POINTS[p];
        if (p === 0) wins[i] += 1;
      }
      if (settled < 0) {
        const left = (R - k - 1) * MAX_PER_RACE;
        const lead = order.slice().sort(rank)[0];
        if (codes.every((_, i) => i === lead || pts[i] + left < pts[lead])) settled = k;
      }
    }
    decided[settled < 0 ? Math.max(0, R - 1) : settled] += 1;
    const finalOrder = order.slice().sort(rank);
    titles[finalOrder[0]] += 1;
    finalOrder.forEach((i, p) => {
      posCount[i][p] += 1;
      finals[i][s] = pts[i];
    });
  }

  const drivers = codes
    .map((code, i): DriverForecast => {
      const sorted = Array.from(finals[i]).sort((a, b) => a - b);
      let likely = 0, expPos = 0;
      for (let p = 0; p < n; p++) {
        if (posCount[i][p] > posCount[i][likely]) likely = p;
        expPos += (p + 1) * posCount[i][p];
      }
      return {
        code,
        title: titles[i] / SIMS,
        expected: sorted.reduce((a, b) => a + b, 0) / SIMS,
        p10: sorted[Math.floor(SIMS * 0.1)],
        p90: sorted[Math.floor(SIMS * 0.9)],
        likelyPos: likely + 1,
        expectedPos: expPos / SIMS,
      };
    })
    .sort((a, b) => a.expectedPos - b.expectedPos);

  return {
    sims: SIMS,
    drivers,
    decidedAt: remaining.map((r, k) => ({ round: r.round, label: r.country, p: decided[k] / SIMS })),
  };
}
