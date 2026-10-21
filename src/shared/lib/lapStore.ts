import { useMemo, useSyncExternalStore } from 'react';
import type { UserLap } from '../mock/profile';

/**
 * Laps the user drove in the sim (Steam game / local exe). Stored locally until the
 * backend exists; then `saveLap` becomes a POST and `useMyLaps` a fetch.
 * Only the personal best per circuit is kept; `attempts` counts every submitted run.
 */
const KEY = 'slipstream-laps';
const listeners = new Set<() => void>();
let snapshot: UserLap[] = read();

function read(): UserLap[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as UserLap[]) : [];
  } catch {
    return [];
  }
}

function write(laps: UserLap[]) {
  snapshot = laps;
  try {
    localStorage.setItem(KEY, JSON.stringify(laps));
  } catch {
    /* storage unavailable — keep in memory */
  }
  listeners.forEach((l) => l());
}

/** Saves a run; returns whether it is a new personal best for the circuit. */
export function saveLap(lap: UserLap, baseline: UserLap[] = []): { pb: boolean; previous?: number } {
  const prev = [...snapshot, ...baseline].filter((l) => l.circuitId === lap.circuitId).sort((a, b) => a.lapTime - b.lapTime)[0];
  const attempts = (snapshot.find((l) => l.circuitId === lap.circuitId)?.attempts ?? 0) + 1;
  const pb = !prev || lap.lapTime < prev.lapTime;
  const best = pb ? lap : { ...prev };
  write([...snapshot.filter((l) => l.circuitId !== lap.circuitId), { ...best, attempts, isNew: pb }]);
  return { pb, previous: prev?.lapTime };
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

/** Profile laps merged with locally recorded runs (best per circuit, newest first). */
export function useMyLaps(base: UserLap[]): UserLap[] {
  const stored = useSyncExternalStore(subscribe, () => snapshot);
  return useMemo(() => {
    // a stored entry is already the best for its circuit (saveLap compares with the baseline)
    const byCircuit = new Map<string, UserLap>();
    for (const l of base) byCircuit.set(l.circuitId, l);
    for (const l of stored) byCircuit.set(l.circuitId, l);
    return [...byCircuit.values()].sort((a, b) => b.setOn.localeCompare(a.setOn));
  }, [base, stored]);
}
