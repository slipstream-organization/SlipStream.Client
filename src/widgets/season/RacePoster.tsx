import { Link, useViewTransitionState } from 'react-router-dom';
import { motion } from 'motion/react';
import type { RaceEvent } from '../../shared/model/types';
import { Flag } from '../../shared/ui/atoms';
import { Tag } from '../../shared/ui/Tag';
import { fadeUp } from '../../shared/ui/motion';
import { TrackOutline } from '../../shared/ui/TrackOutline';
import { placeUa } from '../../shared/mock/placesUa';
import { cn } from '../../shared/lib/utils';
import { circuitTransition, daysTo, plural, podiumOf, trackFacts, weekendLabel, type Status } from './model';

/**
 * A round as a poster. The circuit is the picture, the city the headline.
 *  finished — the winner in their team colour, P2 / P3 smaller, a link to the full report
 *  upcoming — the days left and the facts of the track: length, laps, lap record
 * On hover the poster lifts a little and the circuit lights up (winner's colour / accent).
 */
export function RacePoster({ event, status, now }: { event: RaceEvent; status: Status; now: number }) {
  const place = placeUa(event.slug, event.country);
  const to = `/races/${event.round}`;
  const morph = useViewTransitionState(to);
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
        className={cn(
          'group relative isolate flex min-h-[340px] flex-col overflow-hidden rounded-md border bg-surface p-5 hover:border-ink/40 motion-safe:transition-[transform,border-color] motion-safe:duration-200 motion-safe:hover:-translate-y-1',
          status === 'next' ? 'border-accent' : 'border-line',
        )}
      >
        {/* the circuit */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-[8%] top-[22%] -z-10 h-[46%] w-[78%] text-ink opacity-[0.16] motion-safe:transition-[opacity,transform,color] motion-safe:duration-300 group-hover:opacity-100 motion-safe:group-hover:scale-[1.04]"
          style={{ ...(morph ? circuitTransition(event.round) : null), ...(winner ? { ['--lit' as string]: winner.color } : null) }}
        >
          <TrackOutline circuitId={event.circuitId} className={cn('h-full w-full', done ? 'group-hover:text-[var(--lit)]' : 'group-hover:text-accent-ink')} strokeWidth={3.5} />
        </div>

        <div className="flex items-start justify-between gap-3">
          <p className="flex min-w-0 items-center gap-2 text-sm font-semibold">
            <Flag code={event.countryCode} className="h-5 w-5 shrink-0" />
            <span className="truncate">{place.grandPrix}</span>
          </p>
          <span className="shrink-0 text-sm text-muted tnum">Етап {event.round}</span>
        </div>

        <h3 className="display mt-3 text-[clamp(2.25rem,4.2vw,3.25rem)] leading-[0.95] [text-wrap:balance]" style={{ fontStretch: '78%' }}>
          {place.city}
        </h3>
        <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-base tnum">
          <span className="font-semibold">{weekendLabel(event)}</span>
          {event.sprint && <Tag>Спринт</Tag>}
        </p>

        {done && winner ? (
          <div className="mt-auto pt-24">
            <div className="flex items-stretch gap-3">
              <span aria-hidden className="w-1.5 shrink-0" style={{ background: winner.color }} />
              <div className="min-w-0">
                <p className="headline text-2xl leading-tight">{winner.last}</p>
                <p className="digits text-sm text-muted">{winner.time}</p>
              </div>
            </div>
            <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {podium.slice(1).map((p) => (
                <span key={p.code} className="inline-flex items-center gap-1.5">
                  <span aria-hidden className="h-3 w-1 -skew-x-12" style={{ background: p.color }} />
                  <span className="digits text-muted">P{p.position}</span> {p.last}
                </span>
              ))}
            </p>
          </div>
        ) : (
          <div className="mt-auto pt-24">
            <p className="headline text-2xl leading-tight">
              {left === 0 ? 'Сьогодні гонка' : (
                <>
                  Через <span className="digits">{left}</span> {plural(left, 'день', 'дні', 'днів')}
                </>
              )}
            </p>
            <dl className="mt-3 grid grid-cols-[auto_auto_1fr] gap-x-5 gap-y-0.5 text-sm">
              <div>
                <dt className="text-muted">Траса</dt>
                <dd className="font-semibold tnum">{facts?.km ? `${facts.km} км` : '—'}</dd>
              </div>
              <div>
                <dt className="text-muted">Кола</dt>
                <dd className="font-semibold tnum">{facts?.laps || '—'}</dd>
              </div>
              <div>
                <dt className="text-muted">Рекорд кола</dt>
                <dd className="font-semibold tnum">{facts?.record ? `${facts.record.time}, ${facts.record.who} ${facts.record.year}` : '—'}</dd>
              </div>
            </dl>
          </div>
        )}
      </Link>
    </motion.li>
  );
}
