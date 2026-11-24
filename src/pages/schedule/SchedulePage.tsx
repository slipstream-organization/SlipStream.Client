import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { LayoutGrid, Rows3 } from 'lucide-react';
import { api, getNextRace } from '../../shared/api';
import { useData } from '../../shared/lib/useData';
import { Segmented } from '../../shared/ui/atoms';
import { Skeleton, SkeletonCards } from '../../shared/ui/Skeleton';
import { StateBlock } from '../../shared/ui/StateBlock';
import { Button } from '../../shared/ui/Button';
import { stagger } from '../../shared/ui/motion';
import { SEASON } from '../../shared/mock/season';
import { placeUa } from '../../shared/mock/placesUa';
import { TrackOutline } from '../../shared/ui/TrackOutline';
import type { RaceEvent } from '../../shared/model/types';
import { useNow } from '../../widgets/countdown/Countdown';
import { SeasonRail } from '../../widgets/season/SeasonRail';
import { NextRaceFeature } from '../../widgets/season/NextRaceFeature';
import { RacePoster } from '../../widgets/season/RacePoster';
import { TimelineRow } from '../../widgets/season/TimelineRow';
import { groupByMonth, statusOf, weekendLabel } from '../../widgets/season/model';

type Show = 'all' | 'done' | 'upcoming' | 'sprint';
type View = 'posters' | 'timeline';
const SHOWS: Show[] = ['all', 'done', 'upcoming', 'sprint'];

/**
 * Pattern 1 — List / Index: the season's rounds.
 * Season strip → the next Grand Prix as a big poster → rounds grouped by month, as posters or on
 * a timeline. Filter and view live in the URL (?show=, ?view=), so a reload or a shared link keeps them.
 */
export function SchedulePage() {
  const { data, error, reload } = useData(api.calendar);
  const [params, setParams] = useSearchParams();
  const now = useNow(60_000);
  const next = getNextRace();

  const show = (SHOWS as string[]).includes(params.get('show') ?? '') ? (params.get('show') as Show) : 'all';
  const view: View = params.get('view') === 'timeline' ? 'timeline' : 'posters';
  const set = (key: string, value: string, fallback: string) =>
    setParams(
      (p) => {
        const n = new URLSearchParams(p);
        if (value === fallback) n.delete(key);
        else n.set(key, value);
        return n;
      },
      { replace: true, preventScrollReset: true },
    );

  const all = useMemo(() => data ?? [], [data]);
  const rounds = useMemo(() => all.filter((e) => !e.testing), [all]);
  const count = (s: Show) => all.filter((e) => matches(e, s, next?.round)).length;
  const list = all.filter((e) => matches(e, show, next?.round));
  const groups = groupByMonth(list);
  const nextEvent = rounds.find((e) => e.round === next?.round);

  return (
    <div className="mx-auto max-w-7xl px-4 pb-8 pt-10 md:px-6 md:pt-14">
      <header className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <h1 className="display text-[clamp(3rem,8vw,6rem)] leading-[0.92]">Сезон {SEASON}</h1>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <Segmented<View>
            layoutKey="schedule-view"
            value={view}
            onChange={(v) => set('view', v, 'posters')}
            options={[
              { value: 'posters', label: <><LayoutGrid className="h-4 w-4" aria-hidden /> Афіша</> },
              { value: 'timeline', label: <><Rows3 className="h-4 w-4" aria-hidden /> Вісь</> },
            ]}
          />
        </div>
      </header>

      {error && !data ? (
        <StateBlock kind="error" title="Не вдалося завантажити календар" description="Перевірте з'єднання й повторіть спробу." action={<Button onClick={reload}>Спробувати ще раз</Button>} />
      ) : !data ? (
        <div role="status" aria-busy="true" aria-label="Завантаження">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="mt-8 h-[420px] w-full" />
          <SkeletonCards count={6} className="mt-10" cardClassName="h-[340px]" />
        </div>
      ) : (
        <>
          <SeasonRail rounds={rounds} nextRound={next?.round} />

          {nextEvent && (show === 'all' || show === 'upcoming') && (
            <div className="mt-8">
              <NextRaceFeature event={nextEvent} />
            </div>
          )}

          <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
            <Segmented<Show>
              layoutKey="schedule-show"
              value={show}
              onChange={(v) => set('show', v, 'all')}
              options={[
                { value: 'all', label: <>Усі <span className="tnum text-xs text-muted">{count('all')}</span></> },
                { value: 'done', label: <>Завершені <span className="tnum text-xs text-muted">{count('done')}</span></> },
                { value: 'upcoming', label: <>Попереду <span className="tnum text-xs text-muted">{count('upcoming')}</span></> },
                { value: 'sprint', label: <>Спринти <span className="tnum text-xs text-muted">{count('sprint')}</span></> },
              ]}
            />
          </div>

          {groups.length === 0 ? (
            <div className="mt-8">
              <StateBlock title="Тут поки порожньо" description="За цим фільтром немає етапів. Покажіть усі етапи сезону." action={<Button onClick={() => set('show', 'all', 'all')}>Показати всі етапи</Button>} />
            </div>
          ) : (
            groups.map((g) => {
              const tests = g.events.filter((e) => e.testing);
              const rows = g.events.filter((e) => !e.testing);
              return (
                <section key={`${g.key}-${show}-${view}`} aria-labelledby={`m-${g.key}`} className="mt-12">
                  <div className="mb-5 flex items-baseline justify-between gap-4 border-b-2 border-rule pb-2">
                    <h2 id={`m-${g.key}`} className="headline text-2xl md:text-3xl">
                      {g.label}
                    </h2>
                    <span className="text-sm text-muted tnum">{rows.length ? `${rows.length} ${rows.length === 1 ? 'етап' : rows.length < 5 ? 'етапи' : 'етапів'}` : 'тести'}</span>
                  </div>

                  {tests.length > 0 && (
                    <ul className="mb-5 overflow-hidden rounded-md border border-line bg-surface">
                      {tests.map((e) => (
                        <li key={e.slug} className="flex items-center gap-4 border-b border-line px-4 py-3 last:border-0">
                          <TrackOutline circuitId={e.circuitId} className="h-9 w-14 shrink-0 text-ink opacity-30" strokeWidth={2.5} />
                          <span className="min-w-0 flex-1">
                            <span className="block font-semibold">{placeUa(e.slug, e.country).grandPrix}</span>
                            <span className="block text-sm text-muted">{placeUa(e.slug, e.country).city}, {placeUa(e.slug, e.country).country}</span>
                          </span>
                          <span className="text-sm tnum">{weekendLabel(e, true)}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {rows.length > 0 && (
                    <motion.ul
                      variants={stagger(0.03)}
                      initial="hidden"
                      whileInView="show"
                      viewport={{ once: true, margin: '-60px' }}
                      className={
                        view === 'posters'
                          ? 'grid gap-4 md:grid-cols-2 lg:grid-cols-3'
                          : 'divide-y divide-line overflow-hidden rounded-md border border-line bg-surface'
                      }
                    >
                      {rows.map((e) =>
                        view === 'posters' ? (
                          <RacePoster key={e.slug} event={e} status={statusOf(e, next?.round)} now={now} />
                        ) : (
                          <TimelineRow key={e.slug} event={e} status={statusOf(e, next?.round)} now={now} />
                        ),
                      )}
                    </motion.ul>
                  )}
                </section>
              );
            })
          )}
        </>
      )}
    </div>
  );
}

function matches(e: RaceEvent, show: Show, nextRound: number | undefined) {
  const st = statusOf(e, nextRound);
  if (show === 'all') return true;
  if (show === 'done') return st === 'done' || st === 'testing';
  if (show === 'upcoming') return st === 'next' || st === 'later';
  return !!e.sprint;
}
