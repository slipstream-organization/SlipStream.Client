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

export interface NewsItem {
  id: string;
  title: string;
  excerpt: string;
  tag: string;
  date: string;
  readMinutes: number;
  circuitId?: string;
  accent?: string;
  /** cover image; 'car' = side-on livery render, 'driver' = cut-out portrait, 'photo' = full-bleed photo (from the news API later) */
  image?: { src: string; kind: 'car' | 'driver' | 'photo' };
  /** driver codes the story is about — used on driver pages */
  drivers?: string[];
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
