export interface UserTask {
  id: string;
  title: string;
  description: string;
  progress: number;
  goal: number;
  xp: number;
  period: 'Щоденне' | 'Тижневе' | 'Сезонне';
}

export interface UserLap {
  circuitId: string;
  round: number;
  lapTime: number; // seconds
  setOn: string;
  source?: 'steam' | 'local';
  attempts?: number;
  /** set when the last submitted run was a personal best */
  isNew?: boolean;
}

export interface UserProfile {
  name: string;
  handle: string;
  favouriteTeam: string;
  favouriteDriver: string;
  rating: number;
  ratingDelta: number;
  tier: string;
  level: number;
  xp: number;
  xpNext: number;
  globalRank: number;
  totalPlayers: number;
  predictionRank: number;
  predictionPoints: number;
  accuracy: number;
  predictionHistory: { round: number; points: number }[];
  tasks: UserTask[];
  laps: UserLap[];
}

export const ME: UserProfile = {
  name: 'Kitol',
  handle: 'kitol',
  favouriteTeam: 'ferrari',
  favouriteDriver: 'HAM',
  rating: 1842,
  ratingDelta: 37,
  tier: 'Gold II',
  level: 14,
  xp: 2380,
  xpNext: 3000,
  globalRank: 128,
  totalPlayers: 5412,
  predictionRank: 8,
  predictionPoints: 1238,
  accuracy: 0.42,
  predictionHistory: [
    { round: 1, points: 62 }, { round: 2, points: 88 }, { round: 3, points: 40 }, { round: 4, points: 115 },
    { round: 5, points: 71 }, { round: 6, points: 96 }, { round: 7, points: 140 }, { round: 8, points: 55 },
    { round: 9, points: 23 }, { round: 10, points: 78 }, { round: 11, points: 90 }, { round: 12, points: 61 },
    { round: 13, points: 84 }, { round: 14, points: 47 }, { round: 15, points: 102 }, { round: 16, points: 86 },
  ],
  tasks: [
    { id: 't1', title: 'Зроби прогноз на Остін', description: 'Заповни поул, переможця і подіум до кваліфікації', progress: 0, goal: 1, xp: 150, period: 'Тижневе' },
    { id: 't2', title: 'Сміливий прогноз', description: 'Вгадай хоча б 1 bold prediction з множником ×3+', progress: 2, goal: 3, xp: 400, period: 'Сезонне' },
    { id: 't3', title: 'Хот-лап', description: 'Проїдь коло на COTA в межах 3% від поулу', progress: 1, goal: 1, xp: 120, period: 'Тижневе' },
    { id: 't4', title: 'Бінго-лінія', description: 'Збери повну лінію у сезонному бінго', progress: 4, goal: 5, xp: 600, period: 'Сезонне' },
    { id: 't5', title: 'Читач паддоку', description: 'Прочитай 3 новини сьогодні', progress: 1, goal: 3, xp: 30, period: 'Щоденне' },
  ],
  laps: [
    { circuitId: 'monza', round: 13, lapTime: 80.412, setOn: '2026-09-03' },
    { circuitId: 'spa', round: 10, lapTime: 104.877, setOn: '2026-07-16' },
    { circuitId: 'suzuka', round: 3, lapTime: 89.204, setOn: '2026-03-26' },
    { circuitId: 'monaco', round: 6, lapTime: 72.951, setOn: '2026-06-04' },
    { circuitId: 'marina_bay', round: 16, lapTime: 92.633, setOn: '2026-10-08' },
    { circuitId: 'americas', round: 17, lapTime: 95.018, setOn: '2026-10-20' },
  ],
};
