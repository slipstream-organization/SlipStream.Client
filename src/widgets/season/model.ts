import { useMemo, type CSSProperties } from 'react';
import type { RaceEvent, SessionKind } from '../../shared/model/types';
import { generateWeekend } from '../../shared/mock/results';
import { REAL_LAPS } from '../../shared/mock/trackRecords';
import { CIRCUITS } from '../../shared/data/circuits';
import { DRIVER_BY_CODE, TEAM_BY_ID, isCompleted, raceStart } from '../../shared/mock/season';
import { UA_NAMES } from '../../shared/mock/articles';
import { formatLapTime } from '../../shared/lib/utils';

export const SESSION_UA: Record<SessionKind, string> = {
  FP1: 'Практика 1',
  FP2: 'Практика 2',
  FP3: 'Практика 3',
  SQ: 'Спринт-кваліфікація',
  SPRINT: 'Спринт',
  QUALI: 'Кваліфікація',
  RACE: 'Гонка',
};

/** Shared name: the poster's circuit morphs into the circuit in the race page's hero (View Transition). */
export const circuitTransition = (round: number) => ({ viewTransitionName: `race-${round}` }) as CSSProperties;

export type Status = 'done' | 'next' | 'later' | 'testing';

/** done = finished; next = the first unfinished round; later = every round after it. */
export function statusOf(e: RaceEvent, nextRound: number | undefined): Status {
  if (e.testing) return 'testing';
  if (isCompleted(e)) return 'done';
  return e.round === nextRound ? 'next' : 'later';
}

/** Who won and who stood next to them — from the classification, in the team colours. */
export function podiumOf(round: number) {
  return generateWeekend(round)
    .race.slice(0, 3)
    .map((r) => {
      const d = DRIVER_BY_CODE[r.driverCode];
      return { code: r.driverCode, position: r.position!, time: r.time, last: UA_NAMES[r.driverCode]?.[1] ?? d.lastName, color: TEAM_BY_ID[d.teamId].color, team: TEAM_BY_ID[d.teamId].name };
    });
}

/** Track facts for an upcoming round: length, laps, lap record. */
export function trackFacts(e: RaceEvent) {
  const c = CIRCUITS[e.circuitId];
  const rec = REAL_LAPS[e.circuitId]?.record;
  return {
    km: c ? (c.length / 1000).toFixed(3) : undefined,
    laps: e.laps,
    record: rec ? { time: formatLapTime(rec.lapTime), who: UA_NAMES[rec.code]?.[1] ?? rec.driver, year: rec.year } : undefined,
  };
}

const monthName = new Intl.DateTimeFormat('uk-UA', { month: 'long' });
export const monthLabel = (iso: string) => {
  const m = monthName.format(new Date(`${iso}T12:00:00Z`));
  return m.charAt(0).toUpperCase() + m.slice(1);
};

/** Months of the end date (the race day), so a weekend never straddles two groups. */
export function groupByMonth(events: RaceEvent[]) {
  const groups: { key: string; label: string; events: RaceEvent[] }[] = [];
  for (const e of events) {
    const key = e.endDate.slice(0, 7);
    const last = groups[groups.length - 1];
    if (last?.key === key) last.events.push(e);
    else groups.push({ key, label: monthLabel(e.endDate), events: [e] });
  }
  return groups;
}

const dayMonth = new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'long', timeZone: 'UTC' });
const dayMonthShort = new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const dayOnly = new Intl.DateTimeFormat('uk-UA', { day: 'numeric', timeZone: 'UTC' });

/** "16–18 жовтня" / "30 жовтня – 1 листопада" (the weekend, in the track's own dates). */
export function weekendLabel(e: RaceEvent, short = false) {
  const a = new Date(`${e.startDate}T12:00:00Z`);
  const b = new Date(`${e.endDate}T12:00:00Z`);
  const f = short ? dayMonthShort : dayMonth;
  if (a.getUTCMonth() === b.getUTCMonth()) return `${dayOnly.format(a)}–${f.format(b)}`;
  return `${f.format(a)} – ${f.format(b)}`;
}

/** Whole days until lights out (rounded up); 0 on race day. */
export const daysTo = (e: RaceEvent, now: number) => Math.max(0, Math.ceil((raceStart(e) - now) / 86_400_000));

export function plural(n: number, one: string, few: string, many: string) {
  const a = n % 100, b = a % 10;
  return a > 10 && a < 20 ? many : b === 1 ? one : b >= 2 && b <= 4 ? few : many;
}

/** The viewer's time zone: "GMT+2" and the IANA name — sessions are shown in it. */
export function useViewerZone() {
  return useMemo(() => {
    let name = 'UTC';
    let offset = 'UTC';
    try {
      name = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      offset = new Intl.DateTimeFormat('uk-UA', { timeZoneName: 'short' }).formatToParts(new Date()).find((p) => p.type === 'timeZoneName')?.value ?? 'UTC';
    } catch {
      /* keep UTC */
    }
    return { name, offset };
  }, []);
}

const dayFmt = new Intl.DateTimeFormat('uk-UA', { weekday: 'short', day: 'numeric', month: 'short' });
const timeFmt = new Intl.DateTimeFormat('uk-UA', { hour: '2-digit', minute: '2-digit' });
export const sessionDay = (iso: string) => dayFmt.format(new Date(iso));
export const sessionTime = (iso: string) => timeFmt.format(new Date(iso));
