import type { QualiRow, RaceResultRow, RaceWeekendResult } from '../model/types';
import { formatLapTime, formatRaceTime, mulberry32 } from '../lib/utils';
import { DRIVERS, DRIVER_PACE, RACES } from './season';

export const POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];

/** Known podiums (winner total time, then gaps) — the rest of each classification is generated. */
const KNOWN_PODIUMS: Record<number, { codes: string[]; winner: string; gaps: number[] }> = {
  1: { codes: ['RUS', 'ANT', 'LEC'], winner: '1:23:06.801', gaps: [2.974, 15.519] },
  2: { codes: ['ANT', 'RUS', 'HAM'], winner: '1:33:15.607', gaps: [5.515, 25.267] },
  3: { codes: ['ANT', 'PIA', 'LEC'], winner: '1:28:03.403', gaps: [13.722, 15.27] },
  4: { codes: ['ANT', 'NOR', 'PIA'], winner: '1:33:19.273', gaps: [3.264, 27.092] },
  5: { codes: ['ANT', 'HAM', 'VER'], winner: '1:28:15.758', gaps: [10.768, 11.276] },
  6: { codes: ['ANT', 'HAM', 'HAD'], winner: '2:23:31.243', gaps: [6.271, 23.394] },
  7: { codes: ['HAM', 'RUS', 'NOR'], winner: '1:32:28.105', gaps: [19.561, 23.719] },
};

function noisyOrder(rand: () => number, spread: number) {
  return DRIVERS.map((d) => ({ code: d.code, score: DRIVER_PACE[d.code] + (rand() - 0.5) * spread }))
    .sort((a, b) => b.score - a.score)
    .map((x) => x.code);
}

const cache = new Map<number, RaceWeekendResult>();

export function generateWeekend(round: number): RaceWeekendResult {
  const hit = cache.get(round);
  if (hit) return hit;

  const event = RACES.find((r) => r.round === round)!;
  const rand = mulberry32(round * 7919 + 2026);

  // ---- Qualifying
  const qualiOrder = noisyOrder(rand, 0.12);
  const known = KNOWN_PODIUMS[round];
  if (known) {
    // winners usually start near the front
    const w = known.codes[0];
    qualiOrder.splice(qualiOrder.indexOf(w), 1);
    qualiOrder.splice(Math.floor(rand() * 3), 0, w);
  }
  const pole = event.poleLapTime;
  let t = pole;
  const qualifying: QualiRow[] = qualiOrder.map((code, i) => {
    if (i > 0) t += 0.02 + rand() * 0.18;
    const q1 = t + 0.4 + rand() * 0.5;
    const q2 = t + 0.15 + rand() * 0.3;
    return {
      position: i + 1,
      driverCode: code,
      q1: formatLapTime(q1),
      q2: i < 16 ? formatLapTime(q2) : undefined,
      q3: i < 10 ? formatLapTime(t) : undefined,
    };
  });

  // ---- Race
  let order = noisyOrder(rand, 0.14);
  if (known) order = [...known.codes, ...order.filter((c) => !known.codes.includes(c))];

  const dnfCount = Math.floor(rand() * 3.2);
  const dnfs = new Set<string>();
  while (dnfs.size < dnfCount) {
    const c = order[8 + Math.floor(rand() * (order.length - 8))];
    dnfs.add(c);
  }
  const classified = order.filter((c) => !dnfs.has(c));
  const finishers = [...classified, ...dnfs];

  const winnerSeconds = known
    ? parseRaceTime(known.winner)
    : event.laps * pole * (1.07 + rand() * 0.04);
  const lapTime = winnerSeconds / event.laps;

  let gap = 0;
  const fastestIdx = Math.floor(rand() * Math.min(8, classified.length));
  const race: RaceResultRow[] = finishers.map((code, i) => {
    const grid = qualiOrder.indexOf(code) + 1;
    if (dnfs.has(code)) {
      return { position: null, driverCode: code, grid, laps: Math.floor(event.laps * (0.2 + rand() * 0.7)), time: 'DNF', points: 0 };
    }
    if (i > 0) gap = known && i < 3 ? known.gaps[i - 1] : gap + 1 + rand() * 7;
    const lapsDown = Math.floor(gap / lapTime);
    const time = i === 0 ? formatRaceTime(winnerSeconds) : lapsDown > 0 ? `+${lapsDown} LAP${lapsDown > 1 ? 'S' : ''}` : `+${gap.toFixed(3)}`;
    return {
      position: i + 1,
      driverCode: code,
      grid,
      laps: event.laps - lapsDown,
      time,
      points: POINTS[i] ?? 0,
      fastestLap: i === fastestIdx,
    };
  });

  const result = { round, race, qualifying, poleTime: pole };
  cache.set(round, result);
  return result;
}

function parseRaceTime(s: string) {
  const [h, m, sec] = s.split(':');
  return Number(h) * 3600 + Number(m) * 60 + Number(sec);
}
