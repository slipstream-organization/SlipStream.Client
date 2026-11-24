import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import type { RaceEvent } from '../../shared/model/types';
import { Flag } from '../../shared/ui/atoms';
import { Tag } from '../../shared/ui/Tag';
import { buttonClass } from '../../shared/ui/Button';
import { TrackOutline } from '../../shared/ui/TrackOutline';
import { placeUa } from '../../shared/mock/placesUa';
import { raceStart } from '../../shared/mock/season';
import { Countdown, useNow } from '../countdown/Countdown';
import { SESSION_UA, sessionDay, sessionTime, trackFacts, useViewerZone, weekendLabel } from './model';

/**
 * The next Grand Prix as the big poster of the page: the circuit drawn huge behind the city name,
 * the countdown, and the whole weekend's schedule in the viewer's own time zone.
 */
export function NextRaceFeature({ event }: { event: RaceEvent }) {
  const now = useNow(30_000);
  const zone = useViewerZone();
  const place = placeUa(event.slug, event.country);
  const facts = trackFacts(event);
  const start = raceStart(event);
  const live = now >= start;
  const nextSession = event.sessions.find((s) => new Date(s.start).getTime() > now);

  return (
    <motion.section
      aria-labelledby="next-race"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="relative isolate overflow-hidden rounded-md border border-line bg-surface"
    >
      {/* the circuit as the poster's picture: large, accent, the runner laps it */}
      <div aria-hidden className="pointer-events-none absolute right-3 top-14 -z-10 h-24 w-36 text-accent-ink opacity-30 sm:top-16 sm:h-36 sm:w-56 lg:-bottom-6 lg:left-[8%] lg:right-auto lg:top-auto lg:h-[115%] lg:w-[46%]">
        <TrackOutline circuitId={event.circuitId} className="h-full w-full" strokeWidth={4} runner runnerDuration={16} />
      </div>

      <div className="grid gap-8 p-5 md:p-8 lg:grid-cols-[1.25fr_1fr] lg:gap-12 lg:p-10">
        <div className="flex flex-col">
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-base font-semibold">
            <span className="inline-flex items-center gap-2.5">
              <Flag code={event.countryCode} className="h-6 w-6" /> {place.grandPrix}
            </span>
            {event.sprint && <Tag>Спринт</Tag>}
          </p>
          <h2 id="next-race" className="display mt-4 text-[clamp(3.25rem,10vw,7.5rem)] leading-[0.92]" style={{ fontStretch: '78%' }}>
            {place.city}
          </h2>
          <p className="mt-3 text-xl font-semibold tnum">{weekendLabel(event)}</p>
          <p className="mt-1 text-base text-muted">
            Етап {event.round}
            {facts.km && <>, траса {facts.km} км</>}, {facts.laps} кіл
          </p>

          <div className="mt-8">
            {live ? <p className="headline text-2xl">Гонка триває або щойно завершилась</p> : <Countdown target={start} />}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/game" className={buttonClass('primary')}>
              Зробити прогноз
            </Link>
            <Link to={`/races/${event.round}`} viewTransition className={buttonClass('secondary')}>
              Відкрити етап
            </Link>
          </div>
        </div>

        <div>
          <h3 className="headline text-xl">Розклад вікенду</h3>
          <p className="mt-1 text-sm text-muted">
            Ваш час: {zone.offset}, {zone.name.replace('_', ' ')}
          </p>
          <ol className="mt-4 rounded-md border border-line bg-bg/60">
            {event.sessions.map((s) => {
              const t = new Date(s.start).getTime();
              const over = t + 2 * 3600_000 < now;
              const isNext = s === nextSession;
              const race = s.kind === 'RACE';
              return (
                <li
                  key={s.kind}
                  className="grid grid-cols-[6.5rem_3.75rem_1fr] items-center gap-3 border-b border-line px-3 py-3 last:border-0 sm:grid-cols-[7.5rem_4rem_1fr]"
                  style={isNext ? { boxShadow: 'inset 3px 0 0 var(--c-accent)' } : undefined}
                >
                  <span className={over ? 'text-muted' : ''}>{sessionDay(s.start)}</span>
                  <span className={`digits font-bold ${over ? 'text-muted' : ''}`}>{sessionTime(s.start)}</span>
                  <span className={`flex flex-wrap items-center gap-x-2 ${race ? 'font-bold' : 'font-semibold'} ${over ? 'text-muted' : ''}`}>
                    {SESSION_UA[s.kind]}
                    {isNext && <span className="text-sm font-semibold text-accent-ink">далі</span>}
                    {over && <span className="text-sm font-normal">завершено</span>}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </motion.section>
  );
}
