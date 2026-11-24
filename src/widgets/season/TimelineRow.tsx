import { Link, useViewTransitionState } from 'react-router-dom';
import { motion } from 'motion/react';
import type { RaceEvent } from '../../shared/model/types';
import { Flag } from '../../shared/ui/atoms';
import { Tag } from '../../shared/ui/Tag';
import { fadeUp } from '../../shared/ui/motion';
import { TrackOutline } from '../../shared/ui/TrackOutline';
import { placeUa } from '../../shared/mock/placesUa';
import { cn } from '../../shared/lib/utils';
import { circuitTransition, daysTo, plural, podiumOf, trackFacts, type Status } from './model';

const monthShort = new Intl.DateTimeFormat('uk-UA', { month: 'short', timeZone: 'UTC' });

/**
 * The "Вісь" view: the season as one vertical line. The date of the race day on the left, a node
 * on the line (winner's colour / accent / empty), then the round: city, result or the days left.
 */
export function TimelineRow({ event, status, now }: { event: RaceEvent; status: Status; now: number }) {
  const place = placeUa(event.slug, event.country);
  const to = `/races/${event.round}`;
  const morph = useViewTransitionState(to);
  const day = new Date(`${event.endDate}T12:00:00Z`);
  const done = status === 'done';
  const podium = done ? podiumOf(event.round) : [];
  const winner = podium[0];
  const facts = done ? null : trackFacts(event);
  const left = daysTo(event, now);

  return (
    <motion.li variants={fadeUp} className="list-none">
      <Link
        to={to}
        viewTransition
        className="group relative grid grid-cols-[3.75rem_1.5rem_1fr] items-center gap-x-3 py-5 hover:bg-surface-2 sm:grid-cols-[5rem_1.5rem_1fr] md:grid-cols-[5.5rem_1.5rem_1fr_10rem] md:gap-x-5"
      >
        <span className="text-right leading-none">
          <span className="digits block text-3xl font-bold md:text-4xl">{day.getUTCDate()}</span>
          <span className="mt-1 block text-sm text-muted">{monthShort.format(day).replace('.', '')}</span>
        </span>

        {/* the axis: a line through the node */}
        <span aria-hidden className="relative flex h-full justify-center">
          <span className="absolute inset-y-[-1.25rem] w-px bg-line" />
          <span
            className={cn('relative z-10 mt-1 h-4 w-2 -skew-x-12 self-start', status === 'next' && 'bg-accent', status === 'later' && 'border border-ink/50 bg-bg', done && !winner && 'bg-ink')}
            style={done && winner ? { background: winner.color } : undefined}
          />
        </span>

        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="display text-[clamp(1.75rem,4vw,2.5rem)] leading-none" style={{ fontStretch: '78%' }}>
              {place.city}
            </span>
            {event.sprint && <Tag>Спринт</Tag>}
          </span>
          <span className="mt-2 flex items-center gap-2 text-sm text-muted">
            <Flag code={event.countryCode} className="h-4 w-4" />
            {place.grandPrix}, етап {event.round}
          </span>

          {done && winner ? (
            <span className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1">
              <span className="inline-flex items-center gap-2">
                <span aria-hidden className="h-5 w-1.5" style={{ background: winner.color }} />
                <span className="headline text-xl">{winner.last}</span>
                <span className="digits text-sm text-muted">{winner.time}</span>
              </span>
              {podium.slice(1).map((p) => (
                <span key={p.code} className="inline-flex items-center gap-1.5 text-sm">
                  <span aria-hidden className="h-3 w-1 -skew-x-12" style={{ background: p.color }} />
                  <span className="digits text-muted">P{p.position}</span> {p.last}
                </span>
              ))}
            </span>
          ) : (
            <span className="mt-3 flex flex-wrap items-baseline gap-x-6 gap-y-1">
              <span className="headline text-xl">
                {left === 0 ? (
                  'Сьогодні гонка'
                ) : (
                  <>
                    Через <span className="digits">{left}</span> {plural(left, 'день', 'дні', 'днів')}
                  </>
                )}
              </span>
              <span className="text-sm text-muted tnum">
                {facts?.km && <>{facts.km} км, </>}
                {facts?.laps} кіл{facts?.record && <>, рекорд {facts.record.time} ({facts.record.who}, {facts.record.year})</>}
              </span>
            </span>
          )}
        </span>

        <span
          aria-hidden
          className="pointer-events-none hidden h-20 w-full text-ink opacity-20 motion-safe:transition-[opacity,color] motion-safe:duration-300 group-hover:opacity-100 md:block"
          style={{ ...(morph ? circuitTransition(event.round) : null), ...(winner ? { ['--lit' as string]: winner.color } : null) }}
        >
          <TrackOutline circuitId={event.circuitId} className={cn('h-full w-full', done ? 'group-hover:text-[var(--lit)]' : 'group-hover:text-accent-ink')} strokeWidth={3} />
        </span>
      </Link>
    </motion.li>
  );
}
