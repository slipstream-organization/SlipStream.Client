import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { RollingNumber } from '../../shared/ui/RollingNumber';
import { fadeUp, stagger } from '../../shared/ui/motion';
import { cn } from '../../shared/lib/utils';

export interface TowerRow {
  id: string;
  /** three-letter code (drivers); omitted for constructors — the name takes the column */
  code?: string;
  name: string;
  color: string;
  points: number;
  href?: string;
}

/**
 * Championship as a broadcast timing tower: position block (leader in red), team colour stripe,
 * code, name, points rolling on an odometer and the gap to the leader. Rows are links.
 */
export function StandingsTower({ title, caption, rows, href = '/standings' }: { title: string; caption?: string; rows: TowerRow[]; href?: string }) {
  const leader = rows[0]?.points ?? 0;
  return (
    <section aria-label={title}>
      <header className="flex items-end justify-between gap-3 border-b-2 border-rule pb-2">
        <h3 className="display-narrow text-xl">{title}</h3>
        <Link to={href} className="inline-flex min-h-9 items-center text-sm font-semibold underline decoration-accent decoration-2 underline-offset-4">
          Уся таблиця
        </Link>
      </header>
      {caption && <p className="mt-2 text-sm text-muted">{caption}</p>}
      <motion.ol variants={stagger(0.03)} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-40px' }} className="mt-1">
        {rows.map((r, i) => (
          <motion.li key={r.id} variants={fadeUp}>
            <Link
              to={r.href ?? href}
              className={cn(
                'group grid min-h-11 items-center gap-x-3 border-b border-line py-1.5 hover:bg-surface-2',
                r.code ? 'grid-cols-[1.75rem_4px_2.75rem_minmax(0,1fr)_auto]' : 'grid-cols-[1.75rem_4px_minmax(0,1fr)_auto]',
              )}
            >
              <span className={cn('tnum grid h-7 place-items-center text-sm font-bold', i === 0 ? 'bg-accent text-on-accent' : 'bg-ink text-bg')}>{i + 1}</span>
              <span aria-hidden className="h-7 w-1 origin-left motion-safe:transition-transform motion-safe:duration-200 group-hover:scale-x-[2.5]" style={{ background: r.color }} />
              {r.code && <span className="font-bold [font-stretch:112%]">{r.code}</span>}
              <span className={cn('truncate', r.code ? 'text-sm text-muted' : 'font-semibold')}>{r.name}</span>
              <span className="text-right">
                <RollingNumber value={r.points} className="text-sm font-bold" />
                <span className="tnum block text-xs text-muted">{i === 0 ? 'лідер' : `−${leader - r.points}`}</span>
              </span>
            </Link>
          </motion.li>
        ))}
      </motion.ol>
    </section>
  );
}
