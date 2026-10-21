export interface BoldOption {
  id: string;
  label: string;
  multiplier: number;
}

export const BOLD_OPTIONS: BoldOption[] = [
  { id: 'sc-lap1', label: 'Safety Car на першому колі', multiplier: 2 },
  { id: 'dnf3', label: 'Більше 3 сходів з дистанції', multiplier: 3 },
  { id: 'outside-top5', label: 'Переможець стартує поза топ-5', multiplier: 4 },
  { id: 'rookie-points', label: 'Новачок фінішує в очках', multiplier: 2 },
  { id: 'red-flag', label: 'Червоний прапор', multiplier: 5 },
  { id: 'teammates-clash', label: 'Контакт між напарниками', multiplier: 6 },
  { id: 'no-pole-win', label: 'Поулмен не виграє гонку', multiplier: 1.5 },
  { id: 'cadillac-points', label: 'Cadillac набирає очки', multiplier: 4 },
];

export interface BingoCell {
  id: string;
  label: string;
  /** Round where it happened — filled automatically as the season goes on. */
  fulfilledRound?: number;
  free?: boolean;
}

export const BINGO: BingoCell[] = [
  { id: 'b1', label: 'Перший подіум Хаджара', fulfilledRound: 6 },
  { id: 'b2', label: 'Ferrari 1–2' },
  { id: 'b3', label: 'Гамільтон виграє гонку', fulfilledRound: 7 },
  { id: 'b4', label: 'Червоний прапор у Монако', fulfilledRound: 6 },
  { id: 'b5', label: 'Мокра гонка', fulfilledRound: 9 },
  { id: 'b6', label: 'Верстаппен на подіумі', fulfilledRound: 5 },
  { id: 'b7', label: 'Сход обох машин команди' },
  { id: 'b8', label: 'Антонеллі — 5 перемог поспіль', fulfilledRound: 6 },
  { id: 'b9', label: 'Піт-стоп швидше 2.0 с', fulfilledRound: 4 },
  { id: 'b10', label: 'Cadillac в очках', fulfilledRound: 12 },
  { id: 'b11', label: 'Перемога з поза топ-10' },
  { id: 'b12', label: 'Алонсо на подіумі' },
  { id: 'b13', label: 'FREE', free: true },
  { id: 'b14', label: 'Safety Car у Баку', fulfilledRound: 15 },
  { id: 'b15', label: 'Пілот замінений посеред сезону' },
  { id: 'b16', label: 'McLaren 1–2' },
  { id: 'b17', label: 'Поул з відривом > 0.5 с', fulfilledRound: 10 },
  { id: 'b18', label: 'Чемпіон визначений до Вегасу' },
  { id: 'b19', label: 'Штраф за перевищення ліміту треку', fulfilledRound: 8 },
  { id: 'b20', label: '3 різні переможці поспіль' },
  { id: 'b21', label: 'Перший подіум Racing Bulls', fulfilledRound: 13 },
  { id: 'b22', label: 'Обгін на останньому колі за перемогу' },
  { id: 'b23', label: 'Пілот отримав Grid penalty', fulfilledRound: 3 },
  { id: 'b24', label: 'Нічна гонка без SC' },
  { id: 'b25', label: 'Гонка на дощових шинах повністю' },
];

export interface LeaderboardEntry {
  rank: number;
  name: string;
  points: number;
  streak: number;
  isMe?: boolean;
}

export const PREDICTION_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, name: 'box_box_olena', points: 1482, streak: 6 },
  { rank: 2, name: 'apex_hunter', points: 1455, streak: 3 },
  { rank: 3, name: 'drs_zone', points: 1390, streak: 2 },
  { rank: 4, name: 'undercut_ua', points: 1344, streak: 4 },
  { rank: 5, name: 'sector_purple', points: 1310, streak: 1 },
  { rank: 6, name: 'lights_out_kyiv', points: 1276, streak: 0 },
  { rank: 7, name: 'tifosi_lviv', points: 1251, streak: 2 },
  { rank: 8, name: 'kitol', points: 1238, streak: 3, isMe: true },
  { rank: 9, name: 'pitwall_max', points: 1201, streak: 1 },
  { rank: 10, name: 'slipstreamer', points: 1189, streak: 0 },
];
