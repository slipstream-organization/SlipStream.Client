/**
 * Career totals up to the end of the 2025 season (approximate, demo data).
 * The current season is added on top from race results in `shared/api`.
 */
export interface CareerBase {
  debut: number;
  starts: number;
  wins: number;
  podiums: number;
  poles: number;
  points: number;
  titles: number;
  best: { year: number; position: number };
}

export const CAREERS: Record<string, CareerBase> = {
  HAM: { debut: 2007, starts: 380, wins: 105, podiums: 202, poles: 104, points: 5014, titles: 7, best: { year: 2020, position: 1 } },
  VER: { debut: 2015, starts: 233, wins: 71, podiums: 127, poles: 48, points: 3444, titles: 4, best: { year: 2023, position: 1 } },
  ALO: { debut: 2001, starts: 425, wins: 32, podiums: 106, poles: 22, points: 2393, titles: 2, best: { year: 2005, position: 1 } },
  NOR: { debut: 2019, starts: 151, wins: 11, podiums: 44, poles: 16, points: 1430, titles: 1, best: { year: 2025, position: 1 } },
  LEC: { debut: 2018, starts: 171, wins: 8, podiums: 50, poles: 27, points: 1660, titles: 0, best: { year: 2022, position: 2 } },
  PIA: { debut: 2023, starts: 70, wins: 9, podiums: 26, poles: 6, points: 800, titles: 0, best: { year: 2025, position: 3 } },
  RUS: { debut: 2019, starts: 152, wins: 5, podiums: 24, poles: 7, points: 1030, titles: 0, best: { year: 2025, position: 4 } },
  BOT: { debut: 2013, starts: 246, wins: 10, podiums: 67, poles: 20, points: 1797, titles: 0, best: { year: 2019, position: 2 } },
  PER: { debut: 2011, starts: 281, wins: 6, podiums: 39, poles: 3, points: 1638, titles: 0, best: { year: 2023, position: 2 } },
  SAI: { debut: 2015, starts: 230, wins: 4, podiums: 29, poles: 6, points: 1330, titles: 0, best: { year: 2021, position: 5 } },
  GAS: { debut: 2017, starts: 176, wins: 1, podiums: 5, poles: 0, points: 460, titles: 0, best: { year: 2019, position: 7 } },
  OCO: { debut: 2016, starts: 180, wins: 1, podiums: 4, poles: 0, points: 480, titles: 0, best: { year: 2017, position: 8 } },
  HUL: { debut: 2010, starts: 250, wins: 0, podiums: 1, poles: 1, points: 620, titles: 0, best: { year: 2018, position: 7 } },
  STR: { debut: 2017, starts: 190, wins: 0, podiums: 3, poles: 1, points: 325, titles: 0, best: { year: 2020, position: 11 } },
  ALB: { debut: 2019, starts: 128, wins: 0, podiums: 2, poles: 0, points: 313, titles: 0, best: { year: 2020, position: 7 } },
  ANT: { debut: 2025, starts: 24, wins: 0, podiums: 3, poles: 0, points: 150, titles: 0, best: { year: 2025, position: 7 } },
  HAD: { debut: 2025, starts: 24, wins: 0, podiums: 1, poles: 0, points: 51, titles: 0, best: { year: 2025, position: 12 } },
  LAW: { debut: 2023, starts: 35, wins: 0, podiums: 0, poles: 0, points: 44, titles: 0, best: { year: 2025, position: 14 } },
  BEA: { debut: 2024, starts: 27, wins: 0, podiums: 0, poles: 0, points: 48, titles: 0, best: { year: 2025, position: 13 } },
  BOR: { debut: 2025, starts: 24, wins: 0, podiums: 0, poles: 0, points: 19, titles: 0, best: { year: 2025, position: 19 } },
  COL: { debut: 2024, starts: 27, wins: 0, podiums: 0, poles: 0, points: 5, titles: 0, best: { year: 2024, position: 19 } },
  LIN: { debut: 2026, starts: 0, wins: 0, podiums: 0, poles: 0, points: 0, titles: 0, best: { year: 2026, position: 0 } },
};
