/* eslint-disable react-refresh/only-export-components */
import type { Stint, TyreCompound } from '../../shared/model/types';
import { cn } from '../../shared/lib/utils';

/** Pirelli compound colours — a domain convention, the same in both themes. */
export const TYRE: Record<TyreCompound, { name: string; bg: string; fg: string }> = {
  S: { name: 'Soft', bg: '#e10600', fg: '#ffffff' },
  M: { name: 'Medium', bg: '#f5c518', fg: '#111111' },
  H: { name: 'Hard', bg: '#ececec', fg: '#111111' },
  I: { name: 'Intermediate', bg: '#43b02a', fg: '#ffffff' },
  W: { name: 'Wet', bg: '#0067ad', fg: '#ffffff' },
};

/** One driver's stints as a bar across the race distance; each segment labelled with its compound. */
export function StintBar({ stints, laps, className, labels = true }: { stints: Stint[]; laps: number; className?: string; labels?: boolean }) {
  return (
    <div className={cn('relative h-5 w-full', className)} role="img" aria-label={stints.map((s) => `${TYRE[s.compound].name}, кола ${s.fromLap}–${s.toLap}`).join('; ')}>
      {stints.map((s) => (
        <span
          key={s.fromLap}
          className="absolute inset-y-0 flex items-center justify-center overflow-hidden rounded-[2px] text-[0.75rem] font-bold leading-none shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)]"
          style={{
            left: `calc(${((s.fromLap - 1) / laps) * 100}% + 1px)`,
            width: `calc(${((s.toLap - s.fromLap + 1) / laps) * 100}% - 2px)`,
            background: TYRE[s.compound].bg,
            color: TYRE[s.compound].fg,
          }}
        >
          {labels && s.toLap - s.fromLap >= 3 ? s.compound : ''}
        </span>
      ))}
    </div>
  );
}
