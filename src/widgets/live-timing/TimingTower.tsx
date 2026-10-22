import { AnimatePresence, motion } from 'motion/react';
import { Flag, Timer } from 'lucide-react';
import { COMPOUND } from '../ai-preview/racePrediction';
import { DRIVER_BY_CODE, TEAM_BY_ID } from '../../shared/mock/season';
import { cn, formatLapTime } from '../../shared/lib/utils';
import type { CarState, TimingState } from './timingModel';

export type GapMode = 'interval' | 'leader';

interface Props {
  timing: TimingState;
  laps: number;
  gapMode: GapMode;
  onGapMode: (m: GapMode) => void;
  selected: string | null;
  hovered: string | null;
  onSelect: (code: string | null) => void;
  onHover: (code: string | null) => void;
}

const COLS = 'grid-cols-[22px_20px_1fr_74px_62px_38px_16px]';

/** Broadcast-style timing tower: position, gap / interval, last lap, tyre, stops. */
export function TimingTower({ timing, laps, gapMode, onGapMode, selected, hovered, onSelect, onHover }: Props) {
  const fl = timing.fastest;
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl bg-[#101016] text-white ring-1 ring-white/10">
      <div className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-f1-red/25 to-transparent px-3 py-2.5">
        <div className="flex items-baseline gap-1.5 font-mono">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">Коло</span>
          <span className="text-xl font-black">{timing.leaderLap}</span>
          <span className="text-sm text-white/40">/{laps}</span>
        </div>
        {timing.finished ? (
          <span className="flex items-center gap-1.5 rounded bg-white px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-black">
            <Flag className="h-3 w-3" /> Фініш
          </span>
        ) : (
          <span className="flex items-center gap-1.5 rounded bg-emerald-500 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-black">
            <span className="h-1.5 w-1.5 rounded-full bg-black/70" /> Зелений прапор
          </span>
        )}
      </div>

      <div className={cn('grid items-center gap-1.5 border-b border-white/10 px-2 py-1.5 text-[9px] font-bold uppercase tracking-wider text-white/40', COLS)}>
        <span className="text-center">П</span>
        <span />
        <span>Пілот</span>
        <button
          type="button"
          onClick={() => onGapMode(gapMode === 'interval' ? 'leader' : 'interval')}
          className="rounded bg-white/10 px-1 py-0.5 text-right text-white/80 transition hover:bg-f1-red hover:text-white"
          title="Перемкнути: інтервал / до лідера"
        >
          {gapMode === 'interval' ? 'Інтервал ⇄' : 'Лідер ⇄'}
        </button>
        <span className="text-right">Ост. коло</span>
        <span className="text-center">Шини</span>
        <span className="text-center">PS</span>
      </div>

      <ul className="relative flex-1">
        <AnimatePresence initial={false}>
          {timing.cars.map((c) => (
            <Row
              key={c.code}
              car={c}
              gapMode={gapMode}
              fastestLapHolder={fl?.code === c.code}
              active={selected === c.code}
              hover={hovered === c.code}
              onSelect={onSelect}
              onHover={onHover}
            />
          ))}
        </AnimatePresence>
      </ul>

      {fl && (
        <div className="flex items-center gap-2 border-t border-white/10 bg-purple-600/90 px-3 py-2 text-xs">
          <Timer className="h-4 w-4" />
          <span className="font-bold uppercase tracking-wider">Найшвидше коло</span>
          <span className="ml-auto font-black">{fl.code}</span>
          <span className="font-mono">{formatLapTime(fl.time)}</span>
          <span className="font-mono text-white/60">L{fl.lap}</span>
        </div>
      )}
    </div>
  );
}

function Row({
  car,
  gapMode,
  fastestLapHolder,
  active,
  hover,
  onSelect,
  onHover,
}: {
  car: CarState;
  gapMode: GapMode;
  fastestLapHolder: boolean;
  active: boolean;
  hover: boolean;
  onSelect: (code: string | null) => void;
  onHover: (code: string | null) => void;
}) {
  const d = DRIVER_BY_CODE[car.code];
  const team = TEAM_BY_ID[d.teamId];
  const gained = car.grid - car.position;
  const comp = COMPOUND[car.compound];
  const lastIsPb = car.lastLap !== undefined && car.lastLap === car.bestLap;
  const gap = gapMode === 'interval' ? car.interval : car.gap;
  return (
    <motion.li
      layout
      transition={{ type: 'spring', stiffness: 420, damping: 36 }}
      onClick={() => onSelect(active ? null : car.code)}
      onMouseEnter={() => onHover(car.code)}
      onMouseLeave={() => onHover(null)}
      className={cn(
        'grid cursor-pointer items-center gap-1.5 border-b border-white/[0.06] px-2 py-[5px] text-[13px] transition-colors last:border-0',
        COLS,
        active ? 'bg-white text-black' : hover ? 'bg-white/10' : car.position % 2 ? 'bg-transparent' : 'bg-white/[0.025]',
      )}
    >
      <span className={cn('grid h-5 place-items-center rounded-sm font-mono text-[11px] font-black', active ? 'bg-black text-white' : 'bg-white text-black')}>{car.position}</span>
      <span className={cn('text-center font-mono text-[9px] font-bold', gained > 0 ? 'text-emerald-400' : gained < 0 ? 'text-f1-red' : active ? 'text-black/30' : 'text-white/25')}>
        {gained > 0 ? `▲${gained}` : gained < 0 ? `▼${-gained}` : '–'}
      </span>
      <span className="flex min-w-0 items-center gap-1.5">
        <span className="h-4 w-[3px] shrink-0 rounded-full" style={{ background: team.color }} />
        <span className="font-black tracking-wide">{car.code}</span>
        {fastestLapHolder && <Timer className="h-3.5 w-3.5 shrink-0 text-purple-400" />}
        {car.inPit && <span className="rounded bg-sky-500 px-1 text-[9px] font-black text-black">PIT</span>}
        {car.drs && <span className="rounded bg-emerald-500 px-1 text-[9px] font-black text-black">DRS</span>}
        {car.finished && <Flag className="h-3 w-3 shrink-0 opacity-70" />}
      </span>
      <span className={cn('text-right font-mono text-[12px] tabular-nums', car.position === 1 && 'text-[10px] font-bold uppercase tracking-wider', active ? 'text-black' : 'text-white/90')}>
        {car.position === 1 ? (gapMode === 'interval' ? 'Інтервал' : 'Лідер') : gap}
      </span>
      <span
        className={cn(
          'text-right font-mono text-[11px] tabular-nums',
          fastestLapHolder && lastIsPb ?'font-bold text-purple-400' : lastIsPb ? 'text-emerald-400' : active ? 'text-black/60' : 'text-white/55',
        )}
      >
        {car.lastLap ? formatLapTime(car.lastLap) : '—'}
      </span>
      <span className="flex items-center justify-center gap-1">
        <span className="grid h-[18px] w-[18px] place-items-center rounded-full border-2 bg-[#111] font-mono text-[8px] font-black text-white" style={{ borderColor: comp.color }}>
          {car.compound}
        </span>
        <span className={cn('font-mono text-[10px]', active ? 'text-black/50' : 'text-white/45')}>{car.tyreAge}</span>
      </span>
      <span className={cn('text-center font-mono text-[11px]', active ? 'text-black/60' : 'text-white/50')}>{car.pitStops}</span>
    </motion.li>
  );
}
