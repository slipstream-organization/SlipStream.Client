import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import type { RaceEvent } from '../../shared/model/types';
import { cn } from '../../shared/lib/utils';
import { placeUa } from '../../shared/mock/placesUa';
import { podiumOf, statusOf, weekendLabel } from './model';

/**
 * The season as a strip: one segment per round. Finished rounds are painted in the winner's team
 * colour — the whole season's story at a glance — the next round is framed in the accent, the rest are empty.
 * A dot above a segment marks a sprint weekend. Segments are links (44px tall); below ~1000px the
 * strip scrolls inside its own region instead of squeezing the targets.
 */
export function SeasonRail({ rounds, nextRound }: { rounds: RaceEvent[]; nextRound: number | undefined }) {
  const [hot, setHot] = useState<RaceEvent | null>(null);
  const done = rounds.filter((e) => statusOf(e, nextRound) === 'done').length;
  const total = rounds.length;
  const shown = hot ?? rounds.find((e) => e.round === nextRound) ?? rounds[rounds.length - 1];
  const winners = useMemo(() => Object.fromEntries(rounds.filter((e) => statusOf(e, nextRound) === 'done').map((e) => [e.round, podiumOf(e.round)[0]])), [rounds, nextRound]);

  const status = shown ? statusOf(shown, nextRound) : 'later';
  const place = shown ? placeUa(shown.slug, shown.country) : undefined;

  return (
    <section aria-label="Сезон" className="border-b border-line pb-6">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-2">
        <p className="headline text-2xl md:text-3xl">
          {nextRound ? (
            <>
              Етап <span className="digits">{nextRound}</span> з <span className="digits">{total}</span>
            </>
          ) : (
            <>Сезон завершено: {total} етапів</>
          )}
        </p>
        <p aria-live="polite" className="min-h-6 text-base tnum text-muted">
          {shown && place && (
            <>
              <span className="font-semibold text-ink">{place.city}</span>, {weekendLabel(shown)}
              {status === 'done' && winners[shown.round] && <> — виграв {winners[shown.round].last}</>}
              {status === 'next' && <> — наступний</>}
            </>
          )}
        </p>
      </div>

      <div className="-mx-4 mt-4 overflow-x-auto px-4 md:mx-0 md:px-0" role="group" aria-label={`Пройдено ${done} з ${total} етапів`}>
        <ol className="flex min-w-[1000px] gap-[3px] lg:min-w-0" onMouseLeave={() => setHot(null)}>
          {rounds.map((e, i) => {
            const st = statusOf(e, nextRound);
            const w = winners[e.round];
            const p = placeUa(e.slug, e.country);
            return (
              <li key={e.round} className="min-w-0 flex-1">
                <Link
                  to={`/races/${e.round}`}
                  aria-label={`Етап ${e.round}, ${p.city}, ${weekendLabel(e)}${e.sprint ? ', спринт' : ''}${st === 'done' && w ? `, виграв ${w.last}` : st === 'next' ? ', наступний' : ''}`}
                  onMouseEnter={() => setHot(e)}
                  onFocus={() => setHot(e)}
                  onBlur={() => setHot(null)}
                  className="group flex h-14 flex-col justify-end gap-1 outline-offset-2"
                >
                  <span aria-hidden className={cn('mx-auto h-1.5 w-1.5 rounded-full bg-ink', !e.sprint && 'invisible')} />
                  <motion.span
                    aria-hidden
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1], delay: i * 0.015 }}
                    className={cn(
                      'block origin-bottom transition-[filter,box-shadow] duration-150 group-hover:brightness-110',
                      st === 'done' ? 'h-7' : st === 'next' ? 'h-9' : 'h-7',
                      st === 'later' && 'border border-line bg-surface-2',
                      // the next round is hollow with an accent frame — filled red would read as a Ferrari win
                      st === 'next' && 'border-2 border-accent bg-bg',
                      st === 'done' && !w && 'bg-ink',
                    )}
                    style={st === 'done' && w ? { background: w.color } : undefined}
                  />
                </Link>
              </li>
            );
          })}
        </ol>
        <p className="mt-2 hidden gap-5 text-sm text-muted sm:flex" aria-hidden>
          <span className="inline-flex items-center gap-2">
            <i className="h-3 w-3 bg-ink" /> Пройдено (колір переможця)
          </span>
          <span className="inline-flex items-center gap-2">
            <i className="h-3 w-3 border-2 border-accent" /> Наступний
          </span>
          <span className="inline-flex items-center gap-2">
            <i className="h-1.5 w-1.5 rounded-full bg-ink" /> Спринт
          </span>
        </p>
      </div>
    </section>
  );
}
