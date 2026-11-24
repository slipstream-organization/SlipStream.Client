import type { TrackConfig } from './types';

export const vegas: TrackConfig = {
  id: 'vegas',
  name: 'Лас-Вегас',
  geo: { lat: 36.1135, lon: -115.171 },
  realLength: 6201,
  width: 14,
  neon: ['#ff2d95', '#8a4dff', '#19e6e6'],
  neonRun: 90,
  sky: '#05060d',
  fog: '#080a18',
  team: 'red_bull',
  pool: ['pool-2026.json', 'pool-2024.json', 'pool-2023.json'],
  laps: [
    { file: '2026-VER.json', label: 'MAX 2026', year: 2026, driver: 'VER' },
    { file: '2023-VER.json', label: 'MAX 2023', year: 2023, driver: 'VER' },
  ],
};
