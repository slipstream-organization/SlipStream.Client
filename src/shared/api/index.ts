/**
 * Data access layer. Everything is mocked for now — each function is async so
 * it can be replaced 1:1 with real HTTP calls (axios) once the backend exists.
 */
import type { RaceEvent, StandingRow, StandingsHistory, TeamId } from '../model/types';
import { CALENDAR, DRIVERS, RACES, TEAMS, isCompleted, raceStart } from '../mock/season';
import { TEAM_HISTORY, type TeamHistory } from '../mock/teamHistory';
import { CAREERS, type CareerBase } from '../mock/careers';
import { generateWeekend } from '../mock/results';
import { NEWS } from '../mock/content';
import { BINGO, PREDICTION_LEADERBOARD } from '../mock/game';
import { ME } from '../mock/profile';

const SHORT: Record<string, string> = {
  australia: 'AUS', china: 'CHN', japan: 'JPN', miami: 'MIA', canada: 'CAN', monaco: 'MON', barcelona: 'BAR',
  austria: 'AUT', 'great-britain': 'GBR', belgium: 'BEL', hungary: 'HUN', netherlands: 'NED', italy: 'ITA',
  madrid: 'MAD', azerbaijan: 'AZE', singapore: 'SGP', 'united-states': 'USA', mexico: 'MEX', brazil: 'BRA',
  'las-vegas': 'LVG', qatar: 'QAT', 'abu-dhabi': 'ABU',
};

const delay = <T>(value: T, ms = 120) => new Promise<T>((r) => setTimeout(() => r(value), ms));

export const completedRaces = (now = Date.now()) => RACES.filter((r) => isCompleted(r, now));

export function getNextRace(now = Date.now()): RaceEvent | undefined {
  return RACES.find((r) => !isCompleted(r, now));
}

export function getLastRace(now = Date.now()): RaceEvent | undefined {
  const done = completedRaces(now);
  return done[done.length - 1];
}

export const getRaceByRound = (round: number) => RACES.find((r) => r.round === round);

export function getResult(round: number) {
  const ev = getRaceByRound(round);
  if (!ev || !isCompleted(ev)) return undefined;
  return generateWeekend(round);
}

function computeStandings(kind: 'drivers' | 'constructors'): { table: StandingRow[]; history: StandingsHistory } {
  const done = completedRaces();
  const ids = kind === 'drivers' ? DRIVERS.map((d) => d.code) : TEAMS.map((t) => t.id);
  const teamOf = Object.fromEntries(DRIVERS.map((d) => [d.code, d.teamId]));
  const totals: Record<string, StandingRow> = Object.fromEntries(
    ids.map((id) => [id, { id, points: 0, wins: 0, podiums: 0, position: 0 }]),
  );
  const series: StandingsHistory['series'] = Object.fromEntries(ids.map((id) => [id, { points: [], positions: [] }]));

  for (const race of done) {
    for (const row of generateWeekend(race.round).race) {
      const id = kind === 'drivers' ? row.driverCode : teamOf[row.driverCode];
      totals[id].points += row.points;
      if (row.position === 1) totals[id].wins += 1;
      if (row.position && row.position <= 3) totals[id].podiums += 1;
    }
    const ranked = Object.values(totals).sort((a, b) => b.points - a.points || b.wins - a.wins);
    ranked.forEach((r, i) => {
      series[r.id].points.push(r.points);
      series[r.id].positions.push(i + 1);
    });
  }

  const table = Object.values(totals)
    .sort((a, b) => b.points - a.points || b.wins - a.wins)
    .map((r, i) => ({ ...r, position: i + 1 }));

  return {
    table,
    history: {
      rounds: done.map((r) => ({ round: r.round, label: SHORT[r.slug] ?? r.countryCode.toUpperCase() })),
      series,
    },
  };
}

export interface DriverStats {
  season: {
    position: number;
    starts: number;
    wins: number;
    podiums: number;
    poles: number;
    points: number;
    dnfs: number;
    bestFinish: number | null;
    form: { round: number; label: string; position: number | null }[];
    results: { round: number; label: string; country: string; countryCode: string; position: number | null; grid: number; points: number }[];
  };
  career: CareerBase;
}

export function getDriverStats(code: string): DriverStats {
  const done = completedRaces();
  const season = { position: 0, starts: 0, wins: 0, podiums: 0, poles: 0, points: 0, dnfs: 0, bestFinish: null as number | null, form: [] as DriverStats['season']['form'], results: [] as DriverStats['season']['results'] };
  for (const race of done) {
    const w = generateWeekend(race.round);
    const row = w.race.find((r) => r.driverCode === code);
    if (!row) continue;
    season.starts += 1;
    season.points += row.points;
    if (row.position === 1) season.wins += 1;
    if (row.position && row.position <= 3) season.podiums += 1;
    if (row.position === null) season.dnfs += 1;
    if (row.position && (season.bestFinish === null || row.position < season.bestFinish)) season.bestFinish = row.position;
    if (w.qualifying[0]?.driverCode === code) season.poles += 1;
    const label = SHORT[race.slug] ?? race.countryCode.toUpperCase();
    season.form.push({ round: race.round, label, position: row.position });
    season.results.push({ round: race.round, label, country: race.country, countryCode: race.countryCode, position: row.position, grid: row.grid, points: row.points });
  }
  season.form = season.form.slice(-5);
  season.position = computeStandings('drivers').table.find((r) => r.id === code)?.position ?? 0;

  const base = CAREERS[code];
  // best year only counts completed seasons — the running one is shown separately
  return {
    season,
    career: {
      ...base,
      starts: base.starts + season.starts,
      wins: base.wins + season.wins,
      podiums: base.podiums + season.podiums,
      poles: base.poles + season.poles,
      points: base.points + season.points,
    },
  };
}

export interface TeamStats {
  season: { position: number; points: number; wins: number; podiums: number; poles: number; oneTwos: number; dnfs: number };
  history: TeamHistory;
  drivers: { code: string; points: number }[];
}

export function getTeamStats(id: TeamId): TeamStats {
  const done = completedRaces();
  const codes = DRIVERS.filter((d) => d.teamId === id).map((d) => d.code);
  const season = { position: 0, points: 0, wins: 0, podiums: 0, poles: 0, oneTwos: 0, dnfs: 0 };
  const driverPoints: Record<string, number> = Object.fromEntries(codes.map((c) => [c, 0]));
  for (const race of done) {
    const w = generateWeekend(race.round);
    const rows = w.race.filter((r) => codes.includes(r.driverCode));
    for (const r of rows) {
      season.points += r.points;
      driverPoints[r.driverCode] += r.points;
      if (r.position === 1) season.wins += 1;
      if (r.position && r.position <= 3) season.podiums += 1;
      if (r.position === null) season.dnfs += 1;
    }
    if (rows.filter((r) => r.position === 1 || r.position === 2).length === 2) season.oneTwos += 1;
    if (codes.includes(w.qualifying[0]?.driverCode)) season.poles += 1;
  }
  season.position = computeStandings('constructors').table.find((r) => r.id === id)?.position ?? 0;
  return { season, history: TEAM_HISTORY[id], drivers: codes.map((code) => ({ code, points: driverPoints[code] })) };
}

export const driverNews = (code: string) => NEWS.filter((n) => n.drivers?.includes(code));

export const api = {
  driverStats: (code: string) => delay(getDriverStats(code), 60),
  calendar: () => delay(CALENDAR),
  nextRace: () => delay(getNextRace()),
  lastRace: () => delay(getLastRace()),
  race: (round: number) => delay(getRaceByRound(round)),
  result: (round: number) => delay(getResult(round)),
  news: () => delay(NEWS),
  driverStandings: () => delay(computeStandings('drivers')),
  constructorStandings: () => delay(computeStandings('constructors')),
  bingo: () => delay(BINGO.map((c) => ({ ...c, done: !!c.free || (!!c.fulfilledRound && completedRaces().some((r) => r.round === c.fulfilledRound)) }))),
  predictionLeaderboard: () => delay(PREDICTION_LEADERBOARD),
  me: () => delay(ME),
};

export { raceStart, isCompleted };
