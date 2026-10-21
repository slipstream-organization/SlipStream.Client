import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Flag as FlagIcon } from 'lucide-react';
import type { RaceEvent } from '../../shared/model/types';
import { generateWeekend } from '../../shared/mock/results';
import { isCompleted } from '../../shared/mock/season';
import { DriverBadge, Flag } from '../../shared/ui/atoms';
import { fadeUp } from '../../shared/ui/motion';
import { TrackOutline } from '../../shared/ui/TrackOutline';
import { cn, formatDateRange, ordinalSuffix } from '../../shared/lib/utils';

export function RaceCard({ event, isNext }: { event: RaceEvent; isNext?: boolean }) {
  const done = !event.testing && isCompleted(event);
  const podium = done ? generateWeekend(event.round).race.slice(0, 3) : [];
  const to = event.testing ? undefined : `/races/${event.round}`;

  const body = (
    <>
      {/* red sweep on hover */}
      <span className="absolute inset-x-0 bottom-0 h-[3px] origin-left scale-x-0 bg-f1-red transition-transform duration-500 group-hover:scale-x-100" />

      <div className="flex items-start justify-between gap-3">
        <div className="text-[11px] font-bold uppercase tracking-wider text-muted">{event.testing ? 'Testing' : `Round ${event.round}`}</div>
        {!event.testing && (
          <span className="flex items-center gap-1.5 rounded bg-surface-2 px-2 py-1 font-mono text-[11px] font-bold uppercase">
            <FlagIcon className="h-3 w-3" />
            {formatDateRange(event.startDate, event.endDate)}
          </span>
        )}
      </div>

      <div className="mt-2 flex items-center gap-3">
        <Flag code={event.countryCode} className="h-6 w-6" />
        <h3 className="display truncate text-[28px] not-italic tracking-tight">{event.country}</h3>
        {isNext && (
          <span className="ml-auto flex shrink-0 items-center gap-1.5 rounded-full bg-f1-red px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-white" /> Next
          </span>
        )}
      </div>
      <p className="mt-2 max-w-[85%] text-xs font-semibold uppercase leading-snug text-muted">{event.officialName}</p>

      {event.testing && <div className="mt-auto pt-10 font-mono text-sm font-bold uppercase">{formatDateRange(event.startDate, event.endDate)}</div>}

      {!done && !event.testing && (
        <TrackOutline
          circuitId={event.circuitId}
          className={cn('pointer-events-none absolute bottom-4 right-4 h-20 w-40 transition-all duration-500 group-hover:scale-105', isNext ? 'text-f1-red opacity-80' : 'text-ink opacity-15 group-hover:opacity-40')}
          strokeWidth={2}
          runner={isNext}
        />
      )}
      {event.testing && (
        <TrackOutline circuitId={event.circuitId} className="pointer-events-none absolute bottom-4 right-4 h-24 w-40 text-ink opacity-20" strokeWidth={2} />
      )}

      {done && (
        <div className="mt-auto grid grid-cols-3 gap-1.5 pt-6">
          {podium.map((r) => (
            <div key={r.driverCode} className="flex items-center gap-2 rounded-md bg-surface-2 px-2 py-1.5">
              <span className="flex flex-col items-center font-mono text-[10px] font-bold leading-none">
                <span className="text-sm">{r.position}</span>
                <span className="text-[7px]">{ordinalSuffix(r.position!)}</span>
              </span>
              <DriverBadge code={r.driverCode} size={26} />
              <span className="min-w-0 leading-tight">
                <span className="block text-sm font-black">{r.driverCode}</span>
                <span className="block truncate font-mono text-[10px] text-muted">{r.time}</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  );

  const cls = cn(
    'group relative flex min-h-[230px] flex-col overflow-hidden rounded-xl border border-line bg-surface p-4 transition-all duration-300 dark:bg-black',
    to && 'hover:-translate-y-1 hover:shadow-[0_20px_40px_-20px_rgba(225,6,0,0.45)]',
    isNext && 'ring-1 ring-f1-red/60',
  );

  return (
    <motion.div variants={fadeUp} layout>
      {to ? (
        <Link to={to} className={cls}>
          {body}
        </Link>
      ) : (
        <div className={cls}>{body}</div>
      )}
    </motion.div>
  );
}
