import type { TeamId } from '../model/types';

/**
 * Team history up to the end of the 2025 season (approximate, demo data).
 * `best.position === 0` means the team has no completed season yet.
 */
export interface TeamHistory {
  firstSeason: number;
  base: string;
  titles: number;
  wins: number;
  podiums: number;
  poles: number;
  best: { year: number; position: number };
}

export const TEAM_HISTORY: Record<TeamId, TeamHistory> = {
  ferrari: { firstSeason: 1950, base: 'Маранелло, Італія', titles: 16, wins: 248, podiums: 830, poles: 253, best: { year: 2008, position: 1 } },
  mclaren: { firstSeason: 1966, base: 'Вокінг, Велика Британія', titles: 10, wins: 203, podiums: 535, poles: 167, best: { year: 2025, position: 1 } },
  mercedes: { firstSeason: 2010, base: 'Брекклі, Велика Британія', titles: 8, wins: 130, podiums: 305, poles: 137, best: { year: 2020, position: 1 } },
  red_bull: { firstSeason: 2005, base: 'Мілтон-Кінс, Велика Британія', titles: 6, wins: 130, podiums: 290, poles: 107, best: { year: 2023, position: 1 } },
  williams: { firstSeason: 1978, base: 'Гроув, Велика Британія', titles: 9, wins: 114, podiums: 316, poles: 128, best: { year: 1997, position: 1 } },
  aston_martin: { firstSeason: 2021, base: 'Сілверстоун, Велика Британія', titles: 0, wins: 0, podiums: 10, poles: 0, best: { year: 2023, position: 5 } },
  alpine: { firstSeason: 2021, base: 'Енстон, Велика Британія', titles: 0, wins: 1, podiums: 6, poles: 0, best: { year: 2022, position: 4 } },
  racing_bulls: { firstSeason: 2006, base: 'Фаенца, Італія', titles: 0, wins: 2, podiums: 6, poles: 1, best: { year: 2019, position: 6 } },
  haas: { firstSeason: 2016, base: 'Канаполіс, США', titles: 0, wins: 0, podiums: 0, poles: 1, best: { year: 2018, position: 5 } },
  audi: { firstSeason: 2026, base: 'Хінвіль, Швейцарія', titles: 0, wins: 0, podiums: 0, poles: 0, best: { year: 2026, position: 0 } },
  cadillac: { firstSeason: 2026, base: 'Фішерс, США', titles: 0, wins: 0, podiums: 0, poles: 0, best: { year: 2026, position: 0 } },
};
