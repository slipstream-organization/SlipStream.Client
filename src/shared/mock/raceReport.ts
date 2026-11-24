/**
 * Race report — mock of GET /v1/seasons/{year}/events/{round}/race-report until the backend
 * ingests OpenF1 (laps, position, intervals, stints, pit, race_control, weather).
 *
 * Built backwards from the classification in results.ts so every block on the page tells the same
 * race: lap 0 is the grid, each finisher's cumulative time at the flag equals their official time,
 * retirements stop on their last lap. In between: strategies, pit losses, a safety car that bunches
 * the field, tyre degradation and noise. Deterministic per round.
 */
import type { PitStop, RaceMoment, RaceReport, Stint, TyreCompound } from '../model/types';
import { formatLapTime, mulberry32 } from '../lib/utils';
import { RACES } from './season';
import { generateWeekend } from './results';
import { UA_NAMES } from './articles';

const name = (code: string) => UA_NAMES[code]?.[1] ?? code;

const DNF_REASONS = ['Двигун', 'Гідравліка', 'Коробка передач', 'Зіткнення', 'Пошкодження після контакту', 'Гальма', 'Перегрів'];
const COMPOUND_NAME: Record<TyreCompound, string> = { S: 'Soft', M: 'Medium', H: 'Hard', I: 'Inter', W: 'Wet' };
const OFFSET: Record<TyreCompound, number> = { S: -0.55, M: 0, H: 0.35, I: 4, W: 7 };
const DEG: Record<TyreCompound, number> = { S: 0.085, M: 0.05, H: 0.03, I: 0.04, W: 0.03 };

const cache = new Map<number, RaceReport | null>();

function parseRaceTime(s: string) {
  const [h, m, sec] = s.split(':');
  return Number(h) * 3600 + Number(m) * 60 + Number(sec);
}

export function raceReport(round: number): RaceReport | null {
  if (cache.has(round)) return cache.get(round)!;
  const ev = RACES.find((r) => r.round === round);
  if (!ev) return null;

  const res = generateWeekend(round);
  const rand = mulberry32(round * 104729 + 7);
  const N = ev.laps;
  const rows = res.race;
  const W = parseRaceTime(rows[0].time);
  const base = W / N;
  const codes = rows.map((r) => r.driverCode);

  // ── targets: total time at the flag for every classified driver
  const target: Record<string, number> = {};
  let lappedIdx = 0;
  for (const r of rows) {
    if (r.position === null) continue;
    if (r.position === 1) target[r.driverCode] = W;
    else if (r.time.includes('LAP')) target[r.driverCode] = W + 1 + lappedIdx++ * 0.9 + rand() * 0.5;
    else target[r.driverCode] = W + Number(r.time.replace('+', ''));
  }

  // ── retirements and their reasons
  const dnfReasons: Record<string, string> = {};
  for (const r of rows) if (r.position === null) dnfReasons[r.driverCode] = DNF_REASONS[Math.floor(rand() * DNF_REASONS.length)];
  const lapsOf = (c: string) => rows.find((r) => r.driverCode === c)!.laps;

  // ── neutralisations: a crash brings out the safety car, otherwise sometimes a random one
  const neutralisations: RaceReport['neutralisations'] = [];
  const crash = rows.find((r) => r.position === null && /Зіткнення|контакту/.test(dnfReasons[r.driverCode]));
  if (crash && crash.laps < N - 6) neutralisations.push({ kind: 'sc', fromLap: crash.laps + 1, toLap: Math.min(N - 3, crash.laps + 3 + Math.floor(rand() * 3)) });
  else if (rand() < 0.45) {
    const from = 4 + Math.floor(rand() * (N - 14));
    neutralisations.push({ kind: 'sc', fromLap: from, toLap: from + 3 + Math.floor(rand() * 2) });
  }
  if (rand() < 0.35) {
    const from = 5 + Math.floor(rand() * (N - 12));
    const clash = neutralisations.some((n) => from <= n.toLap + 2 && from + 2 >= n.fromLap - 2);
    if (!clash) neutralisations.push({ kind: 'vsc', fromLap: from, toLap: from + 1 });
  }
  neutralisations.sort((a, b) => a.fromLap - b.fromLap);
  const underNeutral = (lap: number) => neutralisations.find((n) => lap >= n.fromLap && lap <= n.toLap);
  const lastNeutral = neutralisations.reduce((m, n) => Math.max(m, n.toLap), 0);

  // ── strategies → pit laps, stints, stops
  const stints: Stint[] = [];
  const pitStops: PitStop[] = [];
  const pitLapsOf: Record<string, Map<number, number>> = {};
  const compoundAt: Record<string, TyreCompound[]> = {};
  for (const c of codes) {
    const last = lapsOf(c);
    const twoStop = rand() < 0.45;
    const plan: TyreCompound[] = twoStop ? (rand() < 0.5 ? ['S', 'M', 'H'] : ['M', 'H', 'M']) : [rand() < 0.6 ? 'M' : 'S', 'H'];
    let pits = twoStop ? [Math.round(N * (0.24 + rand() * 0.1)), Math.round(N * (0.58 + rand() * 0.12))] : [Math.round(N * (0.38 + rand() * 0.2))];
    // a pit window that overlaps a safety car pulls the stop into it (cheap stop)
    const sc = neutralisations.find((n) => n.kind === 'sc');
    if (sc) pits = pits.map((p) => (Math.abs(p - sc.fromLap) < 7 && rand() < 0.7 ? sc.fromLap + 1 : p));
    pits = [...new Set(pits)].filter((p) => p < last).sort((a, b) => a - b);

    pitLapsOf[c] = new Map();
    let from = 1;
    pits.forEach((p, i) => {
      stints.push({ driverCode: c, compound: plan[i], fromLap: from, toLap: p });
      const stationary = rand() < 0.06 ? 4 + rand() * 4 : 1.9 + rand() * 1.4;
      const pitLane = 18.5 + stationary + rand() * 1.5;
      pitStops.push({ driverCode: c, lap: p, stationary: Math.round(stationary * 100) / 100, pitLane: Math.round(pitLane * 10) / 10 });
      pitLapsOf[c].set(p, pitLane);
      from = p + 1;
    });
    stints.push({ driverCode: c, compound: plan[pits.length], fromLap: from, toLap: last });
    compoundAt[c] = [];
    for (const s of stints.filter((x) => x.driverCode === c)) for (let l = s.fromLap; l <= s.toLap; l++) compoundAt[c][l] = s.compound;
  }

  // ── raw lap times
  const lapTimes: Record<string, number[]> = {};
  const gridOf = (c: string) => rows.find((r) => r.driverCode === c)!.grid;
  for (const c of codes) {
    const last = lapsOf(c);
    const avg = target[c] ? target[c] / last : base * (1.004 + gridOf(c) * 0.0012);
    const t: number[] = [];
    let stintStart = 1;
    for (let l = 1; l <= last; l++) {
      const comp = compoundAt[c][l];
      if (l > 1 && compoundAt[c][l - 1] !== comp) stintStart = l;
      const age = l - stintStart;
      // fuel burn: the car gets ~0.06 s a lap quicker as it lightens
      let lt = avg + OFFSET[comp] + DEG[comp] * age + 0.06 * (N / 2 - l) - 0.6 + (rand() - 0.5) * 0.22;
      if (l === 1) lt += 3 + (gridOf(c) - 1) * 0.42;
      if (underNeutral(l)) lt = base * (underNeutral(l)!.kind === 'sc' ? 1.42 : 1.3);
      lt += pitLapsOf[c].get(l) ?? 0;
      t.push(lt);
    }
    lapTimes[c] = t;
  }

  const cumOf = (c: string) => {
    let s = 0;
    return lapTimes[c].map((x) => (s += x));
  };

  // the safety car bunches the field: at its last lap everyone closes up behind the leader
  for (const n of neutralisations.filter((x) => x.kind === 'sc')) {
    const L = n.toLap;
    const running = codes.filter((c) => lapTimes[c].length >= L);
    const cum = Object.fromEntries(running.map((c) => [c, cumOf(c)[L - 1]]));
    running.sort((a, b) => cum[a] - cum[b]);
    const lead = cum[running[0]];
    running.forEach((c, i) => {
      lapTimes[c][L - 1] += lead + i * 0.85 - cum[c];
    });
  }

  // finishers: spread the remaining difference over the green laps after the last neutralisation
  for (const c of codes) {
    if (!target[c]) continue;
    const t = lapTimes[c];
    const diff = target[c] - t.reduce((a, b) => a + b, 0);
    const from = Math.min(lastNeutral, t.length - 1);
    const span = t.length - from;
    for (let l = from; l < t.length; l++) t[l] += diff / span;
  }

  // ── fastest laps (green, no pit, no lap 1); the official FL holder must hold the quickest
  const green = (c: string, i: number) => i > 0 && !underNeutral(i + 1) && !pitLapsOf[c].has(i + 1) && !pitLapsOf[c].has(i);
  const bestOf = (c: string) => {
    let best = Infinity, lap = 0;
    lapTimes[c].forEach((x, i) => {
      if (green(c, i) && x < best) {
        best = x;
        lap = i + 1;
      }
    });
    return { time: best, lap };
  };
  const fl = rows.find((r) => r.fastestLap)?.driverCode;
  if (fl) {
    const others = Math.min(...codes.filter((c) => c !== fl).map((c) => bestOf(c).time));
    const mine = bestOf(fl);
    if (mine.time >= others - 0.05) {
      const i = mine.lap - 1;
      const cut = mine.time - (others - 0.09 - rand() * 0.12);
      lapTimes[fl][i] -= cut;
      if (lapTimes[fl][i + 1] !== undefined) lapTimes[fl][i + 1] += cut;
      else lapTimes[fl][i - 1] += cut;
    }
  }
  const fastestLaps = codes
    .map((c) => ({ driverCode: c, ...bestOf(c) }))
    .filter((x) => Number.isFinite(x.time))
    .map((x) => ({ driverCode: x.driverCode, time: Math.round(x.time * 1000) / 1000, lap: x.lap }))
    .sort((a, b) => a.time - b.time);

  // ── positions and gaps after each lap
  const cum = Object.fromEntries(codes.map((c) => [c, cumOf(c)]));
  const positions: RaceReport['positions'] = {};
  const gaps: RaceReport['gaps'] = {};
  for (const c of codes) {
    positions[c] = [gridOf(c)];
    gaps[c] = [0];
  }
  for (let L = 1; L <= N; L++) {
    const done = codes.filter((c) => cum[c].length >= L).sort((a, b) => cum[a][L - 1] - cum[b][L - 1]);
    // classified but lapped: still running, ranked behind by their last completed lap
    const lapped = codes
      .filter((c) => target[c] && cum[c].length < L)
      .sort((a, b) => cum[b].length - cum[a].length || cum[a][cum[a].length - 1] - cum[b][cum[b].length - 1]);
    const order = [...done, ...lapped];
    const leadT = done.length ? cum[done[0]][L - 1] : 0;
    for (const c of codes) {
      const p = order.indexOf(c);
      positions[c].push(p < 0 ? null : p + 1);
      gaps[c].push(cum[c].length >= L ? Math.round((cum[c][L - 1] - leadT) * 1000) / 1000 : null);
    }
  }

  // ── speed trap
  const speedTrap = codes
    .map((c, i) => ({ driverCode: c, kmh: Math.round(318 + rand() * 18 + (codes.length - i) * 0.35) }))
    .sort((a, b) => b.kmh - a.kmh);

  // ── key moments
  const moments: RaceMoment[] = [];
  const lap1 = codes.filter((c) => positions[c][1] !== null).map((c) => ({ c, gain: gridOf(c) - positions[c][1]! }));
  const mover = lap1.sort((a, b) => b.gain - a.gain)[0];
  const lap1Leader = codes.find((c) => positions[c][1] === 1)!;
  moments.push({
    lap: 1,
    kind: 'start',
    driverCode: mover && mover.gain >= 2 ? mover.c : lap1Leader,
    text:
      mover && mover.gain >= 2
        ? `Старт: ${name(mover.c)} піднімається з P${gridOf(mover.c)} на P${positions[mover.c][1]}. Перше коло веде ${name(lap1Leader)}.`
        : `Старт: ${name(lap1Leader)} утримує лідерство в першому повороті.`,
  });
  let leader = lap1Leader;
  let leadChanges = 0;
  for (let L = 2; L <= N && leadChanges < 6; L++) {
    const now = codes.find((c) => positions[c][L] === 1)!;
    if (now !== leader) {
      const byPit = pitLapsOf[leader]?.has(L);
      moments.push({ lap: L, kind: 'lead', driverCode: now, text: byPit ? `${name(now)} очолює гонку, поки ${name(leader)} у боксах.` : `${name(now)} обганяє ${name(leader)} і виходить у лідери.` });
      leader = now;
      leadChanges++;
    }
  }
  for (const n of neutralisations) {
    const cause = n.kind === 'sc' && crash && n.fromLap === crash.laps + 1 ? ` після сходу ${name(crash.driverCode)}` : '';
    moments.push({ lap: n.fromLap, endLap: n.toLap, kind: n.kind, text: n.kind === 'sc' ? `Сейфті-кар${cause}, кола ${n.fromLap}–${n.toLap}.` : `Віртуальний сейфті-кар, кола ${n.fromLap}–${n.toLap}.` });
  }
  for (const c of codes.slice(0, 3)) {
    for (const p of pitStops.filter((x) => x.driverCode === c)) {
      const from = compoundAt[c][p.lap], to = compoundAt[c][p.lap + 1];
      if (!to) continue;
      moments.push({ lap: p.lap, kind: 'pit', driverCode: c, text: `Піт-стоп ${name(c)}: ${COMPOUND_NAME[from]} → ${COMPOUND_NAME[to]}, ${p.stationary.toFixed(1)} с.` });
    }
  }
  for (const r of rows.filter((x) => x.position === null)) {
    moments.push({ lap: r.laps, kind: 'dnf', driverCode: r.driverCode, text: `${name(r.driverCode)} сходить: ${dnfReasons[r.driverCode].toLowerCase()}.` });
  }
  if (fastestLaps[0]) moments.push({ lap: fastestLaps[0].lap, kind: 'fastest', driverCode: fastestLaps[0].driverCode, text: `Найшвидше коло гонки: ${name(fastestLaps[0].driverCode)}, ${formatLapTime(fastestLaps[0].time)}.` });
  moments.push({ lap: N, kind: 'finish', driverCode: rows[0].driverCode, text: `Фініш: ${name(rows[0].driverCode)} перемагає, ${name(rows[1].driverCode)} другий з відставанням ${rows[1].time}.` });
  moments.sort((a, b) => a.lap - b.lap);

  // ── awards
  const dotd = rows
    .filter((r) => r.position !== null)
    .map((r) => ({ c: r.driverCode, s: r.grid - r.position! + (r.position! <= 3 ? 2 : 0) + rand() * 2 }))
    .sort((a, b) => b.s - a.s)[0];
  const bestPitStop = [...pitStops].sort((a, b) => a.stationary - b.stationary)[0];

  // weather: same model as the live widget
  const wr = mulberry32(round * 131 + 9);
  const air = Math.round(18 + wr() * 12);
  const weather = { air, track: Math.round(air + 10 + wr() * 12), humidity: Math.round(35 + wr() * 40), wind: Math.round((1 + wr() * 5) * 10) / 10, rainChance: Math.round(wr() * 20) };

  const report: RaceReport = {
    round,
    laps: N,
    winnerTime: rows[0].time,
    weather,
    positions,
    gaps,
    lapTimes,
    stints,
    pitStops,
    neutralisations,
    fastestLaps,
    speedTrap,
    moments,
    dnfReasons,
    driverOfDay: { driverCode: dotd.c, share: Math.round((0.18 + rand() * 0.24) * 100) / 100 },
    bestPitStop,
  };
  cache.set(round, report);
  return report;
}
