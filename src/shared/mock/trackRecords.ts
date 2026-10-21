/**
 * Real reference laps per circuit, written from memory — verify before production.
 *  - `pole`: the latest known pole lap at the venue (2025 season unless noted)
 *  - `record`: the fastest lap ever recorded on the current layout (any session)
 * Used as ghost cars in the 3D lap and as the benchmark in lap analysis.
 */
export interface RefLap {
  lapTime: number;
  driver: string;
  code: string;
  year: number;
}

export interface CircuitRefs {
  pole: RefLap;
  record: RefLap;
}

const lap = (lapTime: number, driver: string, code: string, year: number): RefLap => ({ lapTime, driver, code, year });

export const REAL_LAPS: Record<string, CircuitRefs> = {
  albert_park: { pole: lap(75.096, 'Lando Norris', 'NOR', 2025), record: lap(75.096, 'Lando Norris', 'NOR', 2025) },
  bahrain: { pole: lap(89.841, 'Oscar Piastri', 'PIA', 2025), record: lap(87.264, 'Lewis Hamilton', 'HAM', 2020) },
  shanghai: { pole: lap(90.641, 'Oscar Piastri', 'PIA', 2025), record: lap(90.641, 'Oscar Piastri', 'PIA', 2025) },
  suzuka: { pole: lap(86.983, 'Max Verstappen', 'VER', 2025), record: lap(86.983, 'Max Verstappen', 'VER', 2025) },
  miami: { pole: lap(86.204, 'Max Verstappen', 'VER', 2025), record: lap(86.204, 'Max Verstappen', 'VER', 2025) },
  villeneuve: { pole: lap(70.899, 'George Russell', 'RUS', 2025), record: lap(70.24, 'Sebastian Vettel', 'VET', 2019) },
  monaco: { pole: lap(69.954, 'Lando Norris', 'NOR', 2025), record: lap(69.954, 'Lando Norris', 'NOR', 2025) },
  catalunya: { pole: lap(71.546, 'Oscar Piastri', 'PIA', 2025), record: lap(71.546, 'Oscar Piastri', 'PIA', 2025) },
  red_bull_ring: { pole: lap(63.971, 'Lando Norris', 'NOR', 2025), record: lap(62.939, 'Valtteri Bottas', 'BOT', 2020) },
  silverstone: { pole: lap(84.892, 'Max Verstappen', 'VER', 2025), record: lap(84.303, 'Lewis Hamilton', 'HAM', 2020) },
  spa: { pole: lap(100.562, 'Lando Norris', 'NOR', 2025), record: lap(100.562, 'Lando Norris', 'NOR', 2025) },
  hungaroring: { pole: lap(75.372, 'Charles Leclerc', 'LEC', 2025), record: lap(73.447, 'Lewis Hamilton', 'HAM', 2020) },
  zandvoort: { pole: lap(68.662, 'Oscar Piastri', 'PIA', 2025), record: lap(68.662, 'Oscar Piastri', 'PIA', 2025) },
  monza: { pole: lap(78.792, 'Max Verstappen', 'VER', 2025), record: lap(78.792, 'Max Verstappen', 'VER', 2025) },
  baku: { pole: lap(101.117, 'Max Verstappen', 'VER', 2025), record: lap(100.495, 'Valtteri Bottas', 'BOT', 2019) },
  marina_bay: { pole: lap(89.158, 'George Russell', 'RUS', 2025), record: lap(89.158, 'George Russell', 'RUS', 2025) },
  americas: { pole: lap(92.51, 'Max Verstappen', 'VER', 2025), record: lap(92.029, 'Valtteri Bottas', 'BOT', 2019) },
  rodriguez: { pole: lap(75.586, 'Lando Norris', 'NOR', 2025), record: lap(74.758, 'Charles Leclerc', 'LEC', 2019) },
  interlagos: { pole: lap(69.511, 'Lando Norris', 'NOR', 2025), record: lap(67.281, 'Lewis Hamilton', 'HAM', 2018) },
  // 2025 qualifying was wet — the latest dry pole is used instead
  vegas: { pole: lap(92.312, 'George Russell', 'RUS', 2024), record: lap(92.312, 'George Russell', 'RUS', 2024) },
  losail: { pole: lap(79.387, 'Oscar Piastri', 'PIA', 2025), record: lap(79.387, 'Oscar Piastri', 'PIA', 2025) },
  yas_marina: { pole: lap(82.207, 'Max Verstappen', 'VER', 2025), record: lap(82.109, 'Max Verstappen', 'VER', 2021) },
  // madring: new venue for 2026 — no real reference laps exist yet
};

/** Ghost runs for a circuit: latest real pole + all-time record (merged when they're the same lap). */
export function referenceGhosts(circuitId: string, colors: { pole: string; record: string }) {
  const refs = REAL_LAPS[circuitId];
  if (!refs) return [];
  const same = refs.pole.lapTime === refs.record.lapTime && refs.pole.year === refs.record.year;
  if (same) return [{ label: `Поул ${refs.pole.year} · рекорд`, detail: refs.record.code, lapTime: refs.record.lapTime, color: colors.record }];
  return [
    { label: `Поул ${refs.pole.year}`, detail: refs.pole.code, lapTime: refs.pole.lapTime, color: colors.pole },
    { label: 'Рекорд траси', detail: `${refs.record.code} · ${refs.record.year}`, lapTime: refs.record.lapTime, color: colors.record },
  ];
}
