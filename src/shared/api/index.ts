/**
 * Data access layer. Everything is mocked for now — each function is async so
 * it can be replaced 1:1 with real HTTP calls (axios) once the backend exists.
 */
import type { ArticleContext, DriverFacts, DriverMedia, NewsItem, RaceEvent, StandingRow, StandingsHistory, TeamFacts, TeamId } from '../model/types';
import { DRIVER_PHOTOS } from '../mock/driverMedia';
import { raceReport } from '../mock/raceReport';
import { driverCutout } from '../lib/media';
import { CALENDAR, DRIVERS, DRIVER_BY_CODE, RACES, TEAMS, TEAM_BY_ID, isCompleted, raceStart } from '../mock/season';
import { ARTICLES, UA_NAMES } from '../mock/articles';
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

export const driverNews = (code: string) => NEWS.filter((n) => n.relatedDriverIds?.includes(code));

/** Ukrainian plural: "1 очко", "3 очки", "5 очок". */
function plural(count: number, one: string, few: string, many: string) {
  const a = Math.abs(count) % 100, b = a % 10;
  const word = a > 10 && a < 20 ? many : b === 1 ? one : b >= 2 && b <= 4 ? few : many;
  return `${count} ${word}`;
}

/** Driver media: official season cut-out + the driver-page photo carousel (mock → backend later). */
function driverMedia(code: string): DriverMedia {
  const d = DRIVER_BY_CODE[code];
  const p = DRIVER_PHOTOS[code];
  const name = d ? `${d.firstName} ${d.lastName}` : code;
  return {
    cutout: driverCutout(code),
    photos: (p?.photos ?? []).map((src, i, all) => ({
      src,
      alt: `${name}, фото ${i + 1} з ${all.length}`,
      credit: 'Formula 1 / Getty Images',
      sourceUrl: `https://www.formula1.com/en/drivers/${p!.page}`,
    })),
  };
}

/** The live numbers article copy is written against — same source as the standings tables. */
function articleContext(): ArticleContext {
  const drivers = computeStandings('drivers').table;
  const teams = computeStandings('constructors').table;
  const byDriver = Object.fromEntries(drivers.map((r) => [r.id, r]));
  const byTeam = Object.fromEntries(teams.map((r) => [r.id, r]));
  const roundsDone = completedRaces().length;
  const roundsLeft = RACES.length - roundsDone;
  const empty: StandingRow = { id: '', position: 0, points: 0, wins: 0, podiums: 0 };

  const driver = (code: string): DriverFacts => {
    const d = DRIVER_BY_CODE[code];
    const r = byDriver[code] ?? empty;
    const mate = DRIVERS.find((x) => x.teamId === d.teamId && x.code !== code);
    const [name, last] = UA_NAMES[code] ?? [`${d.firstName} ${d.lastName}`, d.lastName];
    return {
      code,
      name,
      last,
      teamId: d.teamId,
      team: TEAM_BY_ID[d.teamId].name,
      pos: r.position,
      pts: r.points,
      wins: r.wins,
      podiums: r.podiums,
      gap: (drivers[0]?.points ?? 0) - r.points,
      mate: mate ? (UA_NAMES[mate.code]?.[0] ?? mate.lastName) : '',
      vsMate: r.points - ((mate && byDriver[mate.code]?.points) || 0),
    };
  };
  const team = (id: TeamId): TeamFacts => {
    const r = byTeam[id] ?? empty;
    return { id, name: TEAM_BY_ID[id].name, pos: r.position, pts: r.points, wins: r.wins, podiums: r.podiums, gap: (teams[0]?.points ?? 0) - r.points };
  };
  const race = (circuitId: string) => {
    const ev = RACES.find((r) => r.circuitId === circuitId && isCompleted(r));
    if (!ev) return undefined;
    const podium = generateWeekend(ev.round)
      .race.filter((r) => r.position && r.position <= 3)
      .sort((a, b) => (a.position ?? 99) - (b.position ?? 99))
      .map((r) => driver(r.driverCode));
    return { round: ev.round, country: ev.country, podium };
  };
  return {
    season: RACES[0] ? new Date(RACES[0].startDate).getUTCFullYear() : new Date().getFullYear(),
    roundsDone,
    roundsLeft,
    maxLeft: roundsLeft * 25,
    driver,
    team,
    leader: driver(drivers[0]?.id ?? DRIVERS[0].code),
    second: driver(drivers[1]?.id ?? DRIVERS[1].code),
    race,
    n: plural,
  };
}

/** Full article: the mock writes its Markdown against live standings; the API will just send the text. */
function buildArticle(slug: string): NewsItem | null {
  const item = NEWS.find((n) => n.slug === slug);
  if (!item) return null;
  const spec = ARTICLES[item.id];
  return { ...item, body: spec ? spec.build(articleContext()).join('\n\n') : undefined };
}

export const api = {
  driverStats: (code: string) => delay(getDriverStats(code), 60),
  driverMedia: (code: string) => delay(driverMedia(code), 60),
  calendar: () => delay(CALENDAR),
  nextRace: () => delay(getNextRace()),
  lastRace: () => delay(getLastRace()),
  race: (round: number) => delay(getRaceByRound(round)),
  result: (round: number) => delay(getResult(round)),
  raceReport: (round: number) => delay(raceReport(round)),
  news: () => delay(NEWS),
  /** Full article by slug; null when it does not exist (the page shows a not-found state). */
  newsArticle: (slug: string) => delay(buildArticle(slug)),
  driverStandings: () => delay(computeStandings('drivers')),
  constructorStandings: () => delay(computeStandings('constructors')),
  bingo: () => delay(BINGO.map((c) => ({ ...c, done: !!c.free || (!!c.fulfilledRound && completedRaces().some((r) => r.round === c.fulfilledRound)) }))),
  predictionLeaderboard: () => delay(PREDICTION_LEADERBOARD),
  me: () => delay(ME),
};

export { raceStart, isCompleted };
