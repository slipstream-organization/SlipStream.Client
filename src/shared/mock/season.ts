import type { Driver, RaceEvent, Session, Team, TeamId } from '../model/types';
import { REAL_LAPS } from './trackRecords';

export const SEASON = 2026;

export const TEAMS: Team[] = [
  { id: 'mercedes', slug: 'mercedes', name: 'Mercedes', fullName: 'Mercedes-AMG Petronas F1 Team', color: '#27F4D2' },
  { id: 'ferrari', slug: 'ferrari', name: 'Ferrari', fullName: 'Scuderia Ferrari HP', color: '#E80020' },
  { id: 'mclaren', slug: 'mclaren', name: 'McLaren', fullName: 'McLaren Formula 1 Team', color: '#FF8000' },
  { id: 'red_bull', slug: 'redbullracing', name: 'Red Bull Racing', fullName: 'Oracle Red Bull Racing', color: '#3671C6' },
  { id: 'racing_bulls', slug: 'racingbulls', name: 'Racing Bulls', fullName: 'Visa Cash App Racing Bulls', color: '#6692FF' },
  { id: 'aston_martin', slug: 'astonmartin', name: 'Aston Martin', fullName: 'Aston Martin Aramco F1 Team', color: '#229971' },
  { id: 'williams', slug: 'williams', name: 'Williams', fullName: 'Atlassian Williams Racing', color: '#64C4FF' },
  { id: 'audi', slug: 'audi', name: 'Audi', fullName: 'Audi F1 Team', color: '#F50537' },
  { id: 'alpine', slug: 'alpine', name: 'Alpine', fullName: 'BWT Alpine F1 Team', color: '#0093CC' },
  { id: 'haas', slug: 'haasf1team', name: 'Haas', fullName: 'TGR Haas F1 Team', color: '#B6BABD' },
  { id: 'cadillac', slug: 'cadillac', name: 'Cadillac', fullName: 'Cadillac F1 Team', color: '#D4AF37' },
];

export const TEAM_BY_ID = Object.fromEntries(TEAMS.map((t) => [t.id, t])) as Record<TeamId, Team>;

export const DRIVERS: Driver[] = [
  { code: 'RUS', number: 63, photo: 'G/GEORUS01_George_Russell/georus01', firstName: 'George', lastName: 'Russell', teamId: 'mercedes', country: 'gb' },
  { code: 'ANT', number: 12, photo: 'K/ANDANT01_Kimi_Antonelli/andant01', firstName: 'Kimi', lastName: 'Antonelli', teamId: 'mercedes', country: 'it' },
  { code: 'LEC', number: 16, photo: 'C/CHALEC01_Charles_Leclerc/chalec01', firstName: 'Charles', lastName: 'Leclerc', teamId: 'ferrari', country: 'mc' },
  { code: 'HAM', number: 44, photo: 'L/LEWHAM01_Lewis_Hamilton/lewham01', firstName: 'Lewis', lastName: 'Hamilton', teamId: 'ferrari', country: 'gb' },
  { code: 'NOR', number: 1, photo: 'L/LANNOR01_Lando_Norris/lannor01', firstName: 'Lando', lastName: 'Norris', teamId: 'mclaren', country: 'gb' },
  { code: 'PIA', number: 81, photo: 'O/OSCPIA01_Oscar_Piastri/oscpia01', firstName: 'Oscar', lastName: 'Piastri', teamId: 'mclaren', country: 'au' },
  { code: 'VER', number: 3, photo: 'M/MAXVER01_Max_Verstappen/maxver01', firstName: 'Max', lastName: 'Verstappen', teamId: 'red_bull', country: 'nl' },
  { code: 'HAD', number: 6, photo: 'I/ISAHAD01_Isack_Hadjar/isahad01', firstName: 'Isack', lastName: 'Hadjar', teamId: 'red_bull', country: 'fr' },
  { code: 'LAW', number: 30, photo: 'L/LIALAW01_Liam_Lawson/lialaw01', firstName: 'Liam', lastName: 'Lawson', teamId: 'racing_bulls', country: 'nz' },
  { code: 'LIN', number: 41, photo: 'A/ARVLIN01_Arvid_Lindblad/arvlin01', firstName: 'Arvid', lastName: 'Lindblad', teamId: 'racing_bulls', country: 'gb', rookie: true },
  { code: 'ALO', number: 14, photo: 'F/FERALO01_Fernando_Alonso/feralo01', firstName: 'Fernando', lastName: 'Alonso', teamId: 'aston_martin', country: 'es' },
  { code: 'STR', number: 18, photo: 'L/LANSTR01_Lance_Stroll/lanstr01', firstName: 'Lance', lastName: 'Stroll', teamId: 'aston_martin', country: 'ca' },
  { code: 'ALB', number: 23, photo: 'A/ALEALB01_Alexander_Albon/alealb01', firstName: 'Alexander', lastName: 'Albon', teamId: 'williams', country: 'th' },
  { code: 'SAI', number: 55, photo: 'C/CARSAI01_Carlos_Sainz/carsai01', firstName: 'Carlos', lastName: 'Sainz', teamId: 'williams', country: 'es' },
  { code: 'HUL', number: 27, photo: 'N/NICHUL01_Nico_Hulkenberg/nichul01', firstName: 'Nico', lastName: 'Hülkenberg', teamId: 'audi', country: 'de' },
  { code: 'BOR', number: 5, photo: 'G/GABBOR01_Gabriel_Bortoleto/gabbor01', firstName: 'Gabriel', lastName: 'Bortoleto', teamId: 'audi', country: 'br' },
  { code: 'GAS', number: 10, photo: 'P/PIEGAS01_Pierre_Gasly/piegas01', firstName: 'Pierre', lastName: 'Gasly', teamId: 'alpine', country: 'fr' },
  { code: 'COL', number: 43, photo: 'F/FRACOL01_Franco_Colapinto/fracol01', firstName: 'Franco', lastName: 'Colapinto', teamId: 'alpine', country: 'ar' },
  { code: 'OCO', number: 31, photo: 'E/ESTOCO01_Esteban_Ocon/estoco01', firstName: 'Esteban', lastName: 'Ocon', teamId: 'haas', country: 'fr' },
  { code: 'BEA', number: 87, photo: 'O/OLIBEA01_Oliver_Bearman/olibea01', firstName: 'Oliver', lastName: 'Bearman', teamId: 'haas', country: 'gb' },
  { code: 'PER', number: 11, photo: 'S/SERPER01_Sergio_Perez/serper01', firstName: 'Sergio', lastName: 'Pérez', teamId: 'cadillac', country: 'mx' },
  { code: 'BOT', number: 77, photo: 'V/VALBOT01_Valtteri_Bottas/valbot01', firstName: 'Valtteri', lastName: 'Bottas', teamId: 'cadillac', country: 'fi' },
];

export const DRIVER_BY_CODE = Object.fromEntries(DRIVERS.map((d) => [d.code, d])) as Record<string, Driver>;

/** Relative pace used only to generate believable mock results. */
export const DRIVER_PACE: Record<string, number> = {
  ANT: 0.95, RUS: 0.93, HAM: 0.9, VER: 0.9, LEC: 0.89, NOR: 0.89, PIA: 0.88, HAD: 0.8,
  ALO: 0.78, SAI: 0.77, ALB: 0.76, LAW: 0.74, HUL: 0.74, BEA: 0.74, BOR: 0.73, GAS: 0.73,
  LIN: 0.72, OCO: 0.72, STR: 0.7, COL: 0.68, BOT: 0.67, PER: 0.66,
};

interface CalendarSeed {
  round: number;
  slug: string;
  country: string;
  countryCode: string;
  officialName: string;
  circuitId: string;
  city: string;
  start: string;
  end: string;
  tz: number; // UTC offset, hours
  laps: number;
  pole: number;
  raceHour?: number; // local start hour of the race
  saturdayRace?: boolean;
  testing?: boolean;
}

const SEEDS: CalendarSeed[] = [
  { round: 0, slug: 'testing-1', country: 'Bahrain', countryCode: 'bh', officialName: 'FORMULA 1 ARAMCO PRE-SEASON TESTING 1 2026', circuitId: 'bahrain', city: 'Sakhir', start: '2026-02-11', end: '2026-02-13', tz: 3, laps: 0, pole: 89.8, testing: true },
  { round: 0, slug: 'testing-2', country: 'Bahrain', countryCode: 'bh', officialName: 'FORMULA 1 ARAMCO PRE-SEASON TESTING 2 2026', circuitId: 'bahrain', city: 'Sakhir', start: '2026-02-18', end: '2026-02-20', tz: 3, laps: 0, pole: 89.8, testing: true },
  { round: 1, slug: 'australia', country: 'Australia', countryCode: 'au', officialName: 'FORMULA 1 QATAR AIRWAYS AUSTRALIAN GRAND PRIX 2026', circuitId: 'albert_park', city: 'Melbourne', start: '2026-03-06', end: '2026-03-08', tz: 11, laps: 58, pole: 75.1 },
  { round: 2, slug: 'china', country: 'China', countryCode: 'cn', officialName: 'FORMULA 1 HEINEKEN CHINESE GRAND PRIX 2026', circuitId: 'shanghai', city: 'Shanghai', start: '2026-03-13', end: '2026-03-15', tz: 8, laps: 56, pole: 90.6 },
  { round: 3, slug: 'japan', country: 'Japan', countryCode: 'jp', officialName: 'FORMULA 1 ARAMCO JAPANESE GRAND PRIX 2026', circuitId: 'suzuka', city: 'Suzuka', start: '2026-03-27', end: '2026-03-29', tz: 9, laps: 53, pole: 86.9 },
  { round: 4, slug: 'miami', country: 'Miami', countryCode: 'us', officialName: 'FORMULA 1 CRYPTO.COM MIAMI GRAND PRIX 2026', circuitId: 'miami', city: 'Miami', start: '2026-05-01', end: '2026-05-03', tz: -4, laps: 57, pole: 86.2 },
  { round: 5, slug: 'canada', country: 'Canada', countryCode: 'ca', officialName: 'FORMULA 1 LENOVO GRAND PRIX DU CANADA 2026', circuitId: 'villeneuve', city: 'Montréal', start: '2026-05-22', end: '2026-05-24', tz: -4, laps: 70, pole: 70.9 },
  { round: 6, slug: 'monaco', country: 'Monaco', countryCode: 'mc', officialName: 'FORMULA 1 LOUIS VUITTON GRAND PRIX DE MONACO 2026', circuitId: 'monaco', city: 'Monte Carlo', start: '2026-06-05', end: '2026-06-07', tz: 2, laps: 78, pole: 69.9 },
  { round: 7, slug: 'barcelona', country: 'Barcelona-Catalunya', countryCode: 'es', officialName: 'FORMULA 1 MSC CRUISES GRAN PREMIO DE BARCELONA-CATALUNYA 2026', circuitId: 'catalunya', city: 'Barcelona', start: '2026-06-12', end: '2026-06-14', tz: 2, laps: 66, pole: 71.5 },
  { round: 8, slug: 'austria', country: 'Austria', countryCode: 'at', officialName: 'FORMULA 1 GROSSER PREIS VON ÖSTERREICH 2026', circuitId: 'red_bull_ring', city: 'Spielberg', start: '2026-06-26', end: '2026-06-28', tz: 2, laps: 71, pole: 63.9 },
  { round: 9, slug: 'great-britain', country: 'Great Britain', countryCode: 'gb', officialName: 'FORMULA 1 BRITISH GRAND PRIX 2026', circuitId: 'silverstone', city: 'Silverstone', start: '2026-07-03', end: '2026-07-05', tz: 1, laps: 52, pole: 84.4 },
  { round: 10, slug: 'belgium', country: 'Belgium', countryCode: 'be', officialName: 'FORMULA 1 BELGIAN GRAND PRIX 2026', circuitId: 'spa', city: 'Spa-Francorchamps', start: '2026-07-17', end: '2026-07-19', tz: 2, laps: 44, pole: 100.6 },
  { round: 11, slug: 'hungary', country: 'Hungary', countryCode: 'hu', officialName: 'FORMULA 1 HUNGARIAN GRAND PRIX 2026', circuitId: 'hungaroring', city: 'Budapest', start: '2026-07-24', end: '2026-07-26', tz: 2, laps: 70, pole: 75.4 },
  { round: 12, slug: 'netherlands', country: 'Netherlands', countryCode: 'nl', officialName: 'FORMULA 1 DUTCH GRAND PRIX 2026', circuitId: 'zandvoort', city: 'Zandvoort', start: '2026-08-21', end: '2026-08-23', tz: 2, laps: 72, pole: 68.7 },
  { round: 13, slug: 'italy', country: 'Italy', countryCode: 'it', officialName: 'FORMULA 1 GRAN PREMIO D’ITALIA 2026', circuitId: 'monza', city: 'Monza', start: '2026-09-04', end: '2026-09-06', tz: 2, laps: 53, pole: 78.8 },
  { round: 14, slug: 'madrid', country: 'Spain', countryCode: 'es', officialName: 'FORMULA 1 GRAN PREMIO DE ESPAÑA 2026', circuitId: 'madring', city: 'Madrid', start: '2026-09-11', end: '2026-09-13', tz: 2, laps: 57, pole: 88.0 },
  { round: 15, slug: 'azerbaijan', country: 'Azerbaijan', countryCode: 'az', officialName: 'FORMULA 1 AZERBAIJAN GRAND PRIX 2026', circuitId: 'baku', city: 'Baku', start: '2026-09-24', end: '2026-09-26', tz: 4, laps: 51, pole: 101.1, saturdayRace: true },
  { round: 16, slug: 'singapore', country: 'Singapore', countryCode: 'sg', officialName: 'FORMULA 1 SINGAPORE AIRLINES SINGAPORE GRAND PRIX 2026', circuitId: 'marina_bay', city: 'Singapore', start: '2026-10-09', end: '2026-10-11', tz: 8, laps: 62, pole: 89.5, raceHour: 20 },
  { round: 17, slug: 'united-states', country: 'United States', countryCode: 'us', officialName: 'FORMULA 1 MSC CRUISES UNITED STATES GRAND PRIX 2026', circuitId: 'americas', city: 'Austin', start: '2026-10-23', end: '2026-10-25', tz: -5, laps: 56, pole: 92.5, raceHour: 14 },
  { round: 18, slug: 'mexico', country: 'Mexico', countryCode: 'mx', officialName: 'FORMULA 1 GRAN PREMIO DE LA CIUDAD DE MÉXICO 2026', circuitId: 'rodriguez', city: 'Mexico City', start: '2026-10-30', end: '2026-11-01', tz: -6, laps: 71, pole: 75.6, raceHour: 14 },
  { round: 19, slug: 'brazil', country: 'Brazil', countryCode: 'br', officialName: 'FORMULA 1 GRANDE PRÊMIO DE SÃO PAULO 2026', circuitId: 'interlagos', city: 'São Paulo', start: '2026-11-06', end: '2026-11-08', tz: -3, laps: 71, pole: 69.5, raceHour: 14 },
  { round: 20, slug: 'las-vegas', country: 'Las Vegas', countryCode: 'us', officialName: 'FORMULA 1 HEINEKEN LAS VEGAS GRAND PRIX 2026', circuitId: 'vegas', city: 'Las Vegas', start: '2026-11-19', end: '2026-11-21', tz: -8, laps: 50, pole: 92.8, raceHour: 20, saturdayRace: true },
  { round: 21, slug: 'qatar', country: 'Qatar', countryCode: 'qa', officialName: 'FORMULA 1 QATAR AIRWAYS QATAR GRAND PRIX 2026', circuitId: 'losail', city: 'Lusail', start: '2026-11-27', end: '2026-11-29', tz: 3, laps: 57, pole: 79.4, raceHour: 19 },
  { round: 22, slug: 'abu-dhabi', country: 'Abu Dhabi', countryCode: 'ae', officialName: 'FORMULA 1 ETIHAD AIRWAYS ABU DHABI GRAND PRIX 2026', circuitId: 'yas_marina', city: 'Yas Island', start: '2026-12-04', end: '2026-12-06', tz: 4, laps: 58, pole: 82.2, raceHour: 17 },
];

function at(dateIso: string, dayOffset: number, localHour: number, tz: number) {
  const d = new Date(`${dateIso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dayOffset);
  d.setUTCHours(localHour - tz, localHour % 1 ? 30 : 0);
  return d.toISOString();
}

function buildSessions(s: CalendarSeed): Session[] {
  if (s.testing) return [];
  const raceHour = s.raceHour ?? 15;
  // start = day 0 (Fri for normal weekends, Thu for Saturday races)
  return [
    { kind: 'FP1', start: at(s.start, 0, 12.5, s.tz) },
    { kind: 'FP2', start: at(s.start, 0, 16, s.tz) },
    { kind: 'FP3', start: at(s.start, 1, 12.5, s.tz) },
    { kind: 'QUALI', start: at(s.start, 1, s.saturdayRace ? raceHour : 16, s.tz) },
    { kind: 'RACE', start: at(s.end, 0, raceHour, s.tz) },
  ];
}

export const CALENDAR: RaceEvent[] = SEEDS.map((s) => ({
  round: s.round,
  slug: s.slug,
  country: s.country,
  countryCode: s.countryCode,
  officialName: s.officialName,
  circuitId: s.circuitId,
  city: s.city,
  startDate: s.start,
  endDate: s.end,
  laps: s.laps,
  // mock 2026 pole = latest real pole + ~0.6 s (heavier 2026-spec cars)
  poleLapTime: REAL_LAPS[s.circuitId] ? Math.round((REAL_LAPS[s.circuitId].pole.lapTime + 0.6) * 1000) / 1000 : s.pole,
  sessions: buildSessions(s),
  testing: s.testing,
}));

export const RACES = CALENDAR.filter((e) => !e.testing);

export const raceStart = (e: RaceEvent) =>
  new Date(e.sessions.find((x) => x.kind === 'RACE')?.start ?? `${e.endDate}T14:00:00Z`).getTime();

/** A round counts as finished ~2h after lights out. */
export const isCompleted = (e: RaceEvent, now = Date.now()) => raceStart(e) + 2 * 3600_000 < now;
