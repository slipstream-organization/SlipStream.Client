import { motion } from 'motion/react';
import { useEffect, useState, type ReactNode } from 'react';
import { driverPhoto } from '../lib/media';
import { DRIVER_BY_CODE, TEAM_BY_ID } from '../mock/season';
import type { TeamId } from '../model/types';
import { cn, flagUrl } from '../lib/utils';

export function Flag({ code, className }: { code: string; className?: string }) {
  return (
    <img decoding="async"
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
        <img decoding="async"
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

/**
 * Section heading on a heavy editorial rule. `kicker` is plain context (e.g. "Після 18 етапів"),
 * shown in graphite — not a decorative all-caps eyebrow.
 */
export function SectionTitle({ kicker, title, action }: { kicker?: string; title: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b-2 border-rule pb-3">
      <div className="min-w-0">
        <h2 className="display text-3xl md:text-4xl">{title}</h2>
        {kicker && <p className="mt-1 text-sm text-muted">{kicker}</p>}
      </div>
      {action}
    </div>
  );
}

/** Tab rail: the active option gets a red bar underneath that slides between options (shared layout = transform). */
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
    <div className="inline-flex max-w-full overflow-x-auto border-b border-line">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={cn(
            'relative flex shrink-0 items-center gap-1.5 font-semibold [font-stretch:110%]',
            size === 'sm' ? 'min-h-10 px-3 text-sm' : 'min-h-11 px-4 text-[15px]',
            value === o.value ? 'text-ink' : 'text-muted hover:text-ink',
          )}
        >
          {value === o.value && (
            <motion.span
              layoutId={`seg-${layoutKey}`}
              className="absolute inset-x-0 -bottom-px h-[3px] bg-accent"
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            />
          )}
          <span className="relative z-10 flex items-center gap-1.5">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

/** Waits 100ms before showing so fast loads never flash; keeps its height so nothing jumps. */
export function Loader({ className }: { className?: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 100);
    return () => clearTimeout(t);
  }, []);
  return (
    <div role="status" aria-busy="true" aria-label="Завантаження" className={cn('flex items-center justify-center py-20', className)}>
      <div className={cn('flex gap-1.5 transition-opacity duration-150', show ? 'opacity-100' : 'opacity-0')}>
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
