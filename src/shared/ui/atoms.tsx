import { motion } from 'motion/react';
import { useState, type ReactNode } from 'react';
import { driverPhoto } from '../lib/media';
import { DRIVER_BY_CODE, TEAM_BY_ID } from '../mock/season';
import type { TeamId } from '../model/types';
import { cn, flagUrl } from '../lib/utils';

export function Flag({ code, className }: { code: string; className?: string }) {
  return (
    <img
      src={flagUrl(code)}
      alt=""
      loading="lazy"
      className={cn('inline-block h-6 w-6 shrink-0 rounded-full object-cover ring-2 ring-white/80 dark:ring-white/20', className)}
    />
  );
}

/** Driver headshot on a team-coloured disc; falls back to the race number if the photo fails. */
export function DriverBadge({ code, size = 32, className }: { code: string; size?: number; className?: string }) {
  const d = DRIVER_BY_CODE[code];
  const color = d ? TEAM_BY_ID[d.teamId].color : '#888';
  const [failed, setFailed] = useState(false);
  const src = driverPhoto(code, size > 64 ? '4col' : '1col');
  return (
    <span
      className={cn('relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full font-mono font-bold text-black', className)}
      style={{ width: size, height: size, background: `radial-gradient(circle at 30% 25%, #fff8, transparent 60%), ${color}`, fontSize: size * 0.38 }}
    >
      {d?.number ?? '?'}
      {src && !failed && (
        <img
          src={src}
          alt={d ? `${d.firstName} ${d.lastName}` : ''}
          loading="lazy"
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full scale-[1.35] object-cover object-top"
          style={{ background: color, transformOrigin: '50% 0%' }}
        />
      )}
    </span>
  );
}

export function TeamBar({ teamId, className }: { teamId: TeamId; className?: string }) {
  return <span className={cn('inline-block w-1 self-stretch rounded-full', className)} style={{ background: TEAM_BY_ID[teamId].color }} />;
}

export function SectionTitle({ kicker, title, action }: { kicker?: string; title: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        {kicker && <div className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-f1-red">{kicker}</div>}
        <h2 className="display text-3xl md:text-4xl">{title}</h2>
      </div>
      {action}
    </div>
  );
}

/** Animated segmented control (shared pill slides between options). */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = 'md',
  layoutKey,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode }[];
  size?: 'sm' | 'md';
  layoutKey: string;
}) {
  return (
    <div className="inline-flex rounded-full border border-line bg-surface p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            'relative flex items-center gap-1.5 rounded-full font-bold uppercase tracking-wide transition-colors',
            size === 'sm' ? 'px-3 py-1 text-[11px]' : 'px-4 py-1.5 text-xs',
            value === o.value ? 'text-white' : 'text-muted hover:text-ink',
          )}
        >
          {value === o.value && (
            <motion.span
              layoutId={`seg-${layoutKey}`}
              className="absolute inset-0 rounded-full bg-f1-red"
              transition={{ type: 'spring', stiffness: 500, damping: 38 }}
            />
          )}
          <span className="relative z-10 flex items-center gap-1.5">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

export function Loader({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-center py-20', className)}>
      <div className="flex gap-1.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <motion.span
            key={i}
            className="h-2 w-6 skew-x-[-20deg] bg-f1-red"
            animate={{ opacity: [0.15, 1, 0.15] }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.12 }}
          />
        ))}
      </div>
    </div>
  );
}
