/**
 * Race-weekend prediction model ("AI preview").
 * Inputs: season form (recent points, weighted), base pace, venue history (real pole / record holders).
 * Method: Monte-Carlo — qualifying and race are simulated N times with noise, DNFs and a
 * grid-position effect; odds are the share of simulations where each outcome happened.
 * Deterministic per round, so the page is stable between reloads. Replace with a real model/API later.
 */
import { DRIVERS, DRIVER_PACE, RACES } from '../../shared/mock/season';
import { generateWeekend } from '../../shared/mock/results';
import { isCompleted } from '../../shared/mock/season';
import { REAL_LAPS } from '../../shared/mock/trackRecords';
import { mulberry32 } from '../../shared/lib/utils';

export interface DriverOdds {
  code: string;
  pole: number; // 0..1
  win: number;
  podium: number;
  points: number; // top-10 finish
  fastestLap: number;
  expected: number; // mean finishing position
  form: number; // 0..1 normalised recent form
}

export type Compound = 'S' | 'M' | 'H';

/** Pirelli compound colours (domain convention: soft red, medium yellow, hard white). */
export const COMPOUND: Record<Compound, { label: string; color: string; text: string }> = {
  S: { label: 'Soft', color: '#e10600', text: '#fff' },
  M: { label: 'Medium', color: '#f5c518', text: '#111' },
  H: { label: 'Hard', color: '#e9e9ea', text: '#111' },
};
export interface StrategyPlan {
  name: string;
  probability: number;
  stints: { compound: Compound; laps: number }[];
}

export interface RacePreview {
  odds: DriverOdds[]; // sorted by win probability
  strategies: StrategyPlan[];
  safetyCar: number;
  summary: string[];
  sims: number;
}

const SIMS = 4000;
const HIGH_DEG = new Set(['bahrain', 'losail', 'silverstone', 'suzuka', 'catalunya', 'shanghai', 'americas']);
const LOW_DEG = new Set(['monaco', 'monza', 'baku', 'vegas', 'rodriguez', 'villeneuve']);
const STREET = new Set(['monaco', 'baku', 'marina_bay', 'vegas', 'miami', 'madring', 'albert_park', 'villeneuve']);

const gauss = (rand: () => number) => {
  const u = Math.max(1e-9, rand()), v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

/** Recent form: exponentially weighted points of the last 5 completed rounds before `round`. */
function formScores(round: number) {
  const done = RACES.filter((r) => r.round < round && isCompleted(r)).slice(-5);
  const raw: Record<string, number> = Object.fromEntries(DRIVERS.map((d) => [d.code, 0]));
  done.forEach((race, i) => {
    const w = Math.pow(1.35, i);
    for (const row of generateWeekend(race.round).race) raw[row.driverCode] += row.points * w;
  });
  const max = Math.max(1, ...Object.values(raw));
  return Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, v / max]));
}

const cache = new Map<number, RacePreview>();

export function predictRace(round: number): RacePreview {
  const hit = cache.get(round);
  if (hit) return hit;
  const ev = RACES.find((r) => r.round === round)!;
  const rand = mulberry32(round * 4219 + 7);
  const form = formScores(round);
  const refs = REAL_LAPS[ev.circuitId];

  // combined strength: base pace + recent form + venue history bonus
  const strength: Record<string, number> = {};
  for (const d of DRIVERS) {
    let s = DRIVER_PACE[d.code] * 0.65 + form[d.code] * 0.3;
    if (refs?.pole.code === d.code) s += 0.03;
    if (refs?.record.code === d.code) s += 0.015;
    strength[d.code] = s;
  }

  const tally = Object.fromEntries(DRIVERS.map((d) => [d.code, { pole: 0, win: 0, podium: 0, points: 0, fl: 0, pos: 0 }]));
  const codes = DRIVERS.map((d) => d.code);

  for (let s = 0; s < SIMS; s++) {
    // qualifying
    const q = codes.map((c) => ({ c, v: strength[c] + gauss(rand) * 0.065 })).sort((a, b) => b.v - a.v);
    tally[q[0].c].pole++;
    const grid: Record<string, number> = {};
    q.forEach((x, i) => (grid[x.c] = i));
    // race: strength + grid advantage + noise, ~4 % DNF chance each
    const r = codes
      .map((c) => ({ c, v: strength[c] - grid[c] * 0.004 + gauss(rand) * 0.085, dnf: rand() < 0.04 }))
      .sort((a, b) => Number(a.dnf) - Number(b.dnf) || b.v - a.v);
    r.forEach((x, i) => {
      const t = tally[x.c];
      t.pos += x.dnf ? 20 : i + 1;
      if (x.dnf) return;
      if (i === 0) t.win++;
      if (i < 3) t.podium++;
      if (i < 10) t.points++;
    });
    // fastest lap: usually a fast car, often one that pitted late for softs
    const flPool = r.filter((x) => !x.dnf).slice(0, 10);
    const fl = flPool.map((x) => ({ c: x.c, v: strength[x.c] + gauss(rand) * 0.12 })).sort((a, b) => b.v - a.v)[0];
    if (fl) tally[fl.c].fl++;
  }

  const odds: DriverOdds[] = codes
    .map((c) => ({
      code: c,
      pole: tally[c].pole / SIMS,
      win: tally[c].win / SIMS,
      podium: tally[c].podium / SIMS,
      points: tally[c].points / SIMS,
      fastestLap: tally[c].fl / SIMS,
      expected: tally[c].pos / SIMS,
      form: form[c],
    }))
    .sort((a, b) => b.win - a.win || a.expected - b.expected);

  // strategy
  const L = ev.laps;
  const deg = HIGH_DEG.has(ev.circuitId) ? 'high' : LOW_DEG.has(ev.circuitId) ? 'low' : 'mid';
  const oneStop: StrategyPlan = { name: '1 стоп · M → H', probability: 0, stints: [{ compound: 'M', laps: Math.round(L * 0.38) }, { compound: 'H', laps: L - Math.round(L * 0.38) }] };
  const oneStopRev: StrategyPlan = { name: '1 стоп · H → M', probability: 0, stints: [{ compound: 'H', laps: Math.round(L * 0.58) }, { compound: 'M', laps: L - Math.round(L * 0.58) }] };
  const twoStop: StrategyPlan = {
    name: '2 стопи · S → M → H',
    probability: 0,
    stints: [{ compound: 'S', laps: Math.round(L * 0.22) }, { compound: 'M', laps: Math.round(L * 0.36) }, { compound: 'H', laps: L - Math.round(L * 0.22) - Math.round(L * 0.36) }],
  };
  const p = deg === 'high' ? [0.34, 0.16, 0.5] : deg === 'low' ? [0.62, 0.3, 0.08] : [0.55, 0.2, 0.25];
  [oneStop, oneStopRev, twoStop].forEach((s, i) => (s.probability = p[i]));
  const strategies = [oneStop, oneStopRev, twoStop].sort((a, b) => b.probability - a.probability);
  const safetyCar = STREET.has(ev.circuitId) ? 0.72 : deg === 'high' ? 0.38 : 0.45;

  // human-readable summary
  const fav = odds[0], second = odds[1];
  const poleFav = [...odds].sort((a, b) => b.pole - a.pole)[0];
  const flFav = [...odds].sort((a, b) => b.fastestLap - a.fastestLap)[0];
  const riser = [...odds].filter((o) => o.expected > 6).sort((a, b) => b.form - a.form)[0];
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  const summary = [
    `Фаворит — ${fav.code}: ${pct(fav.win)} на перемогу і ${pct(fav.podium)} на подіум. Найближчий суперник — ${second.code} (${pct(second.win)}).`,
    `Поул найімовірніше візьме ${poleFav.code} (${pct(poleFav.pole)})${refs ? `; минулого разу тут на поулі був ${refs.pole.code} (${refs.pole.year})` : ''}.`,
    `Найшвидше коло: ${flFav.code} (${pct(flFav.fastestLap)}) — темп у гоночних відрізках найстабільніший.`,
    `Стратегія: найімовірніше «${strategies[0].name}» (${pct(strategies[0].probability)}); знос шин на цій трасі ${deg === 'high' ? 'високий' : deg === 'low' ? 'низький' : 'середній'}. Шанс машини безпеки — ${pct(safetyCar)}.`,
    riser ? `Темна конячка: ${riser.code} — сильна форма останніх етапів, але старт із середини пелотону.` : '',
  ].filter(Boolean);

  const preview = { odds, strategies, safetyCar, summary, sims: SIMS };
  cache.set(round, preview);
  return preview;
}
