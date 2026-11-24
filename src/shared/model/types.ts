export type TeamId =
  | 'mercedes' | 'ferrari' | 'mclaren' | 'red_bull' | 'racing_bulls'
  | 'aston_martin' | 'williams' | 'audi' | 'alpine' | 'haas' | 'cadillac';

export interface Team {
  id: TeamId;
  slug: string; // F1 media slug, e.g. "redbullracing"
  name: string;
  fullName: string;
  color: string;
}

export interface Driver {
  code: string;
  number: number;
  photo?: string; // F1 media headshot path, e.g. "L/LEWHAM01_Lewis_Hamilton/lewham01"
  firstName: string;
  lastName: string;
  teamId: TeamId;
  country: string; // ISO-3166 alpha-2, lower-case
  rookie?: boolean;
}

export type SessionKind = 'FP1' | 'FP2' | 'FP3' | 'SQ' | 'SPRINT' | 'QUALI' | 'RACE';

export interface Session {
  kind: SessionKind;
  start: string; // ISO UTC
}

export interface RaceEvent {
  round: number; // 0 = testing
  slug: string;
  country: string;
  countryCode: string;
  officialName: string;
  circuitId: string;
  city: string;
  startDate: string; // ISO date
  endDate: string;
  laps: number;
  poleLapTime: number; // seconds, reference value used for the lap simulation
  sessions: Session[];
  testing?: boolean;
  /** sprint weekend: FP1 → sprint qualifying → sprint → qualifying → race */
  sprint?: boolean;
}

export interface RaceResultRow {
  position: number | null; // null = DNF
  driverCode: string;
  grid: number;
  laps: number;
  time: string; // winner total time, "+gap" or "DNF"
  points: number;
  fastestLap?: boolean;
}

export interface QualiRow {
  position: number;
  driverCode: string;
  q1: string;
  q2?: string;
  q3?: string;
}

export interface RaceWeekendResult {
  round: number;
  race: RaceResultRow[];
  qualifying: QualiRow[];
  poleTime: number;
}

/**
 * A quote. Rule: a quote attributed to a real person must carry `source` (+ `sourceUrl`) — the
 * publication it was said in. Quotes without a source are rendered with a visible "Демо-контент"
 * badge, so invented words can never pass as real ones. Demo copy uses editorial authors only.
 */
export interface NewsQuote {
  text: string;
  author: string;
  role?: string;
  source?: string;
  sourceUrl?: string;
  /** the person quoted, when they are a driver / team in our data (colour of the quote rule) */
  driverCode?: string;
  teamId?: TeamId;
}

export interface NewsAuthor {
  name: string;
  role: string;
}

/**
 * A news story. Field names map to the API contract:
 * date → publishedAt, readMinutes → readingTime, image → cover.
 */
export interface NewsItem {
  id: string;
  /** URL key: /news/:slug */
  slug: string;
  title: string;
  /** one-line summary for cards */
  excerpt: string;
  /** the article's standfirst (italic subtitle under the headline) */
  lead?: string;
  tag: string;
  date: string;
  readMinutes: number;
  author?: NewsAuthor;
  /**
   * Article text as the news API sends it: plain text, paragraphs separated by line breaks.
   * Rendered as-is by shared/ui/Prose — no markup, nothing to preprocess.
   */
  body?: string;
  /** quotes[0] is shown on the article cover (left of the cut-out) */
  quotes?: NewsQuote[];
  tags?: string[];
  relatedDriverIds?: string[];
  relatedTeamIds?: TeamId[];
  circuitId?: string;
  accent?: string;
  /** cover image; 'car' = side-on livery render, 'driver' = cut-out portrait, 'photo' = full-bleed photo */
  image?: { src: string; kind: 'car' | 'driver' | 'photo' };
}

/** Live numbers an article body is written against (built from standings / results in shared/api). */
export interface ArticleContext {
  season: number;
  roundsDone: number;
  roundsLeft: number;
  /** points still available to one driver (25 a race) */
  maxLeft: number;
  driver: (code: string) => DriverFacts;
  team: (id: TeamId) => TeamFacts;
  leader: DriverFacts;
  second: DriverFacts;
  /** result of the race on a circuit this season, if it has been run */
  race: (circuitId: string) => { round: number; country: string; podium: DriverFacts[] } | undefined;
  /** Ukrainian plural: n + the right form ("1 очко", "3 очки", "5 очок") */
  n: (count: number, one: string, few: string, many: string) => string;
}

export interface DriverFacts {
  code: string;
  /** full name in Ukrainian ("Льюїс Гамільтон") */
  name: string;
  /** surname in Ukrainian, nominative */
  last: string;
  teamId: TeamId;
  team: string;
  pos: number;
  pts: number;
  wins: number;
  podiums: number;
  /** points behind the leader (0 for the leader) */
  gap: number;
  mate: string;
  /** points ahead of (+) or behind (−) the teammate */
  vsMate: number;
}

export interface TeamFacts {
  id: TeamId;
  name: string;
  pos: number;
  pts: number;
  wins: number;
  podiums: number;
  gap: number;
}

export interface StandingRow {
  position: number;
  id: string; // driver code or team id
  points: number;
  wins: number;
  podiums: number;
}

export interface StandingsHistory {
  rounds: { round: number; label: string }[];
  // per entity id: cumulative points and championship position after each round
  series: Record<string, { points: number[]; positions: number[] }>;
}

/** Lap input format: circuit outline (metres, any origin) + target lap time. */
export interface LapInput {
  circuitId: string;
  lapTime: number; // seconds
  title: string;
  subtitle?: string;
}

/** An image with attribution (backend: media objects). */
export interface MediaImage {
  src: string;
  alt: string;
  credit?: string;
  sourceUrl?: string;
}

/** Driver imagery (GET /api/drivers/{code}/media). */
export interface DriverMedia {
  /** transparent full-height cut-out, the official season portrait */
  cutout?: string;
  /** real photos of the driver for the biography carousel, in display order */
  photos: MediaImage[];
}

/* ── Race report (GET /v1/seasons/{year}/events/{round}/race-report) ───────────────────────── */

/** Pirelli: S/M/H slicks, I = intermediate, W = full wet. */
export type TyreCompound = 'S' | 'M' | 'H' | 'I' | 'W';

export interface Stint {
  driverCode: string;
  compound: TyreCompound;
  /** first and last lap of the stint, inclusive */
  fromLap: number;
  toLap: number;
}

export interface PitStop {
  driverCode: string;
  lap: number;
  /** stationary time, seconds */
  stationary: number;
  /** time lost in the pit lane, seconds */
  pitLane: number;
}

export type RaceMomentKind = 'start' | 'lead' | 'sc' | 'vsc' | 'red' | 'pit' | 'dnf' | 'fastest' | 'finish';

export interface RaceMoment {
  lap: number;
  kind: RaceMomentKind;
  text: string;
  driverCode?: string;
  /** neutralisations: last lap under SC / VSC */
  endLap?: number;
}

export interface RaceReport {
  round: number;
  laps: number;
  winnerTime: string;
  weather: { air: number; track: number; humidity: number; wind: number; rainChance: number };
  /** position after each lap; index 0 = grid. null = not running (retired) */
  positions: Record<string, (number | null)[]>;
  /** gap to the leader after each lap, seconds; index 0 = 0. null = retired or a lap down */
  gaps: Record<string, (number | null)[]>;
  /** lap times, index 0 = lap 1 */
  lapTimes: Record<string, number[]>;
  stints: Stint[];
  pitStops: PitStop[];
  neutralisations: { kind: 'sc' | 'vsc'; fromLap: number; toLap: number }[];
  fastestLaps: { driverCode: string; time: number; lap: number }[];
  speedTrap: { driverCode: string; kmh: number }[];
  moments: RaceMoment[];
  dnfReasons: Record<string, string>;
  driverOfDay: { driverCode: string; share: number };
  bestPitStop: PitStop;
}
