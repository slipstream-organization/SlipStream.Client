/* eslint-disable react-refresh/only-export-components */
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '../../shared/lib/utils';

const DAY = 86_400_000;

function split(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { days: Math.floor(s / 86400), hours: Math.floor((s % 86400) / 3600), mins: Math.floor((s % 3600) / 60), secs: s % 60 };
}

/** Ticks once a second; shared by the countdown and the start lights. */
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

/** One digit that rolls in from above when it changes (transform + opacity). */
function Digit({ value }: { value: string }) {
  return (
    <span className="relative inline-block h-[1em] w-[0.72em] overflow-hidden">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={value}
          initial={{ y: '-100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0 text-center"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/**
 * Race countdown as a timing readout: big tabular digits, units split by hairlines,
 * unit names underneath (sentence case). `size="sm"` for compact placements.
 */
export function Countdown({ target, className, size = 'lg' }: { target: number; className?: string; size?: 'lg' | 'sm' }) {
  const now = useNow();
  const t = split(target - now);
  const units: [string, number][] = [
    ['днів', t.days],
    ['год', t.hours],
    ['хв', t.mins],
    ['сек', t.secs],
  ];
  return (
    <div className={cn('flex', className)} role="timer" aria-label={`До старту ${t.days} дн ${t.hours} год ${t.mins} хв`}>
      {units.map(([label, v], i) => (
        <div key={label} className={cn('flex flex-col', i > 0 && 'border-l border-current/20', size === 'lg' ? 'px-3 first:pl-0 sm:px-5' : 'px-2 first:pl-0')}>
          <span aria-hidden className={cn('digits flex font-bold leading-none', size === 'lg' ? 'text-[2rem] sm:text-5xl' : 'text-2xl')}>
            {String(v)
              .padStart(2, '0')
              .split('')
              .map((d, k) => (
                <Digit key={k} value={d} />
              ))}
          </span>
          <span className="mt-2 text-xs opacity-75">{label}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Five start lights as a season clock: one light per remaining day of the final five, all five on
 * race day, "lights out" once the race has started. Meaning is also given in text (aria + caption).
 */
export function StartLights({ target, className }: { target: number; className?: string }) {
  const now = useNow();
  const left = target - now;
  const out = left <= 0;
  const lit = out ? 0 : Math.max(0, Math.min(5, 5 - Math.floor(left / DAY)));
  const caption = out ? 'Lights out — гонка триває' : lit === 0 ? 'Вогні загоряться за 5 днів до старту' : lit === 5 ? 'День гонки' : `${lit} з 5 — до старту менше ${6 - lit} дн`;
  return (
    <div className={cn('flex items-center gap-4', className)}>
      <div className="flex gap-1.5" role="img" aria-label={caption}>
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className="flex flex-col gap-1.5 bg-current/10 p-1.5">
            {[0, 1].map((r) => (
              <span key={r} className="relative block h-4 w-4 rounded-full bg-current/25 sm:h-5 sm:w-5">
                <span
                  className={cn('absolute inset-0 rounded-full bg-accent shadow-[0_0_14px_var(--c-accent)] motion-safe:transition-opacity motion-safe:duration-300', i < lit ? 'opacity-100' : 'opacity-0')}
                />
              </span>
            ))}
          </span>
        ))}
      </div>
      <span className="text-sm opacity-80">{caption}</span>
    </div>
  );
}
