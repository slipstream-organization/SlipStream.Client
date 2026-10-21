import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '../../shared/lib/utils';

function split(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { days: Math.floor(s / 86400), hours: Math.floor((s % 86400) / 3600), mins: Math.floor((s % 3600) / 60), secs: s % 60 };
}

function Digit({ value }: { value: string }) {
  return (
    <span className="relative inline-block h-[1em] w-[0.62em] overflow-hidden">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={value}
          initial={{ y: '-100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0 text-center"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export function Countdown({ target, className, size = 'lg' }: { target: number; className?: string; size?: 'lg' | 'sm' }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const t = split(target - now);
  const units: [string, number][] = [
    ['Днів', t.days],
    ['Год', t.hours],
    ['Хв', t.mins],
    ['Сек', t.secs],
  ];

  return (
    <div className={cn('flex gap-1.5 sm:gap-3', className)}>
      {units.map(([label, v], i) => (
        <div key={label} className="flex items-start gap-1.5 sm:gap-3">
          <div
            className={cn(
              'flex flex-col items-center rounded-lg border border-white/10 bg-white/5 backdrop-blur',
              size === 'lg' ? 'min-w-[56px] px-2 py-2 sm:min-w-[88px] sm:px-4 sm:py-3' : 'min-w-[52px] px-2 py-1.5',
            )}
          >
            <span className={cn('flex font-mono font-bold leading-none tabular-nums', size === 'lg' ? 'text-[28px] sm:text-5xl' : 'text-2xl')}>
              {String(v).padStart(2, '0').split('').map((d, k) => (
                <Digit key={k} value={d} />
              ))}
            </span>
            <span className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.2em] opacity-60">{label}</span>
          </div>
          {i < units.length - 1 && <span className={cn('font-mono font-bold opacity-30', size === 'lg' ? 'pt-2 text-2xl sm:text-5xl' : 'pt-1 text-2xl')}>:</span>}
        </div>
      ))}
    </div>
  );
}
