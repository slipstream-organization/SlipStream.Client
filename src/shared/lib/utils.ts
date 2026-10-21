import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

/** Deterministic PRNG so mocked data is stable between reloads. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function formatLapTime(seconds: number, digits = 3) {
  const m = Math.floor(seconds / 60);
  const s = seconds - m * 60;
  const sec = s.toFixed(digits).padStart(digits + 3, '0');
  return `${m}:${sec}`;
}

export function formatRaceTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const rest = seconds - h * 3600;
  return `${h}:${formatLapTime(rest).padStart(9, '0')}`;
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export function formatDateRange(start: string, end: string) {
  const a = new Date(start);
  const b = new Date(end);
  const dd = (d: Date) => String(d.getUTCDate()).padStart(2, '0');
  if (a.getUTCMonth() === b.getUTCMonth()) return `${dd(a)} – ${dd(b)} ${MONTHS[b.getUTCMonth()]}`;
  return `${dd(a)} ${MONTHS[a.getUTCMonth()]} – ${dd(b)} ${MONTHS[b.getUTCMonth()]}`;
}

export function ordinalSuffix(n: number) {
  if (n === 1) return 'ST';
  if (n === 2) return 'ND';
  if (n === 3) return 'RD';
  return 'TH';
}

export const flagUrl = (code: string) => `https://flagcdn.com/w80/${code}.png`;
