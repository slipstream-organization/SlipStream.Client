import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { api, raceStart } from '../../shared/api';
import { useData } from '../../shared/lib/useData';
import { Countdown, StartLights } from '../../widgets/countdown/Countdown';
import { NewsCard } from '../../widgets/news/NewsCard';
import { StandingsTower } from '../../widgets/standings-tower/StandingsTower';
import { TrackOutline } from '../../shared/ui/TrackOutline';
import { CIRCUITS } from '../../shared/data/circuits';
import { Flag, SectionTitle } from '../../shared/ui/atoms';
import { Skeleton, SkeletonCards, SkeletonRows } from '../../shared/ui/Skeleton';
import { StateBlock } from '../../shared/ui/StateBlock';
import { Button, buttonClass } from '../../shared/ui/Button';
import { Tag } from '../../shared/ui/Tag';
import { EASE_OUT, MOTION, stagger } from '../../shared/ui/motion';
import { DRIVER_BY_CODE, RACES, SEASON, TEAM_BY_ID } from '../../shared/mock/season';
import { BOLD_OPTIONS } from '../../shared/mock/game';
import { generateWeekend } from '../../shared/mock/results';
import type { NewsItem, TeamId } from '../../shared/model/types';
import { formatDateRange } from '../../shared/lib/utils';

/**
 * Home — editorial poster.
 *  1. Next Grand Prix poster (one orchestrated entrance)
 *  2. Last race classification as a timing strip
 *  3. Lead story as a team-colour poster + championship timing tower
 *  4. News rail: two image stories + a headline list
 *  5. Predictions poster on a red field
 */
export function HomePage() {
  const next = useData(api.nextRace);
  const last = useData(api.lastRace);
  const news = useData(api.news);
  const drivers = useData(api.driverStandings);
  const teams = useData(api.constructorStandings);

  return (
    <div className="flex flex-col">
      {next.data ? <NextRacePoster /> : next.loading ? <HeroSkeleton /> : <SeasonOver />}
      {last.data && <TimingStrip round={last.data.round} country={last.data.country} />}

      <section className="mx-auto grid w-full max-w-7xl gap-10 px-4 pt-14 md:px-6 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-8">
          {news.data ? (
            <NewsCard item={news.data[0]} variant="lead" />
          ) : news.error ? (
            <StateBlock kind="error" title="Не вдалося завантажити новини" description="Перевірте з'єднання й спробуйте ще раз." action={<Button onClick={news.reload}>Спробувати ще раз</Button>} />
          ) : (
            <Skeleton className="h-[460px] rounded-none md:h-[540px]" />
          )}
        </div>
        <aside className="flex flex-col gap-10 lg:col-span-4">
          {drivers.data ? (
            <StandingsTower
              title="Пілоти"
              caption={`Після ${drivers.data.history.rounds.length} етапів`}
              rows={drivers.data.table.slice(0, 8).map((r) => {
                const d = DRIVER_BY_CODE[r.id];
                return { id: r.id, code: r.id, name: `${d.firstName[0]}. ${d.lastName}`, color: TEAM_BY_ID[d.teamId].color, points: r.points, href: `/drivers/${r.id}` };
              })}
            />
          ) : (
            <SkeletonRows rows={8} />
          )}
          {teams.data ? (
            <StandingsTower
              title="Конструктори"
              rows={teams.data.table.slice(0, 5).map((r) => {
                const t = TEAM_BY_ID[r.id as TeamId];
                return { id: r.id, name: t.name, color: t.color, points: r.points };
              })}
            />
          ) : (
            <SkeletonRows rows={5} />
          )}
        </aside>
      </section>

      <section id="news" className="mx-auto w-full max-w-7xl scroll-mt-24 px-4 pt-16 md:px-6">
        <SectionTitle title="Новини" kicker={news.data ? `${news.data.length} матеріалів цього тижня` : undefined} />
        {news.data ? <NewsRail items={news.data.slice(1, 7)} /> : !news.error && <SkeletonCards count={3} cardClassName="h-64" />}
      </section>

      <PredictPoster />
    </div>
  );
}

/* ── 1. Next race poster ─────────────────────────────────────────────── */

function NextRacePoster() {
  const { data: race } = useData(api.nextRace);
  if (!race) return null;
  const circuit = CIRCUITS[race.circuitId];
  const start = raceStart(race);
  const quali = race.sessions.find((s) => s.kind === 'QUALI');
  const km = (circuit?.length ?? 0) / 1000;

  return (
    <section className="relative isolate overflow-hidden border-b-2 border-rule">
      <div aria-hidden className="pattern-grid pointer-events-none absolute inset-0 -z-10 opacity-[0.05]" />
      {/* the circuit as the poster's backdrop: large, faint, the red runner still laps it */}
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-[-6%] -z-10 flex w-[78%] items-center opacity-[0.16] md:right-0 md:w-[62%] dark:opacity-[0.2]">
        <TrackOutline circuitId={race.circuitId} className="h-[92%] w-full text-ink" strokeWidth={3} animateDraw runner runnerDuration={14} />
      </div>
      {/* the round number as the poster's background figure */}
      <span aria-hidden className="display-wide pointer-events-none absolute -bottom-[0.12em] -left-[0.04em] -z-10 select-none text-[clamp(6rem,17vw,15rem)] leading-none text-ink/[0.045]">
        {String(race.round).padStart(2, '0')}
      </span>

      <div className="mx-auto grid max-w-7xl gap-10 px-4 pb-12 pt-8 md:px-6 md:pt-12 lg:grid-cols-12 lg:gap-8 lg:pb-16">
        <div className="lg:col-span-7">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: MOTION.base }} className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Tag>Наступне Гран-прі</Tag>
            <span className="tnum text-sm text-muted">
              Етап {race.round} з {RACES.length}
            </span>
          </motion.div>

          {/* sized from the longest word so words never break: font = column width / (letters × glyph width) */}
          <div className="mt-4 [container-type:inline-size]">
            <motion.h1
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: MOTION.slow, ease: EASE_OUT }}
              className="display-wide"
              style={{ fontSize: fitWords(race.country, 7) }}
            >
              {race.country}
            </motion.h1>
          </div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: MOTION.slow, delay: 0.1 }}>
            <p className="serif mt-4 max-w-[52ch] text-lg text-muted">{race.officialName}</p>

            <dl className="mt-8 grid grid-cols-2 border-y-2 border-rule sm:grid-cols-4 sm:divide-x sm:divide-line">
              <Fact label="Траса" value={circuit?.name ?? race.city} wide />
              <Fact label="Дати" value={formatDateRange(race.startDate, race.endDate)} mono />
              <Fact label="Кіл" value={String(race.laps)} mono />
              <Fact label="Коло" value={`${km.toFixed(3)} км`} mono />
            </dl>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/game" className={buttonClass('primary')}>
                Зробити прогноз
              </Link>
              <Link to={`/races/${race.round}`} className={buttonClass('secondary')}>
                Розклад уікенду
              </Link>
            </div>
            {quali && (
              <p className="mt-4 text-sm text-muted">
                Прогнози приймаємо до старту кваліфікації:{' '}
                <span className="tnum font-semibold text-ink">
                  {new Date(quali.start).toLocaleString('uk-UA', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
              </p>
            )}
          </motion.div>
        </div>

        <div className="flex flex-col gap-4 lg:col-span-5 lg:justify-end">
          <div className="flex items-center gap-2 text-sm text-muted lg:mt-auto">
            <Flag code={race.countryCode} className="h-5 w-5 ring-0" />
            {race.city}
          </div>
          {/* the start gantry: inverted block like a TV graphic */}
          <div className="chamfer bg-ink p-5 text-bg md:p-6 dark:bg-surface-2 dark:text-ink">
            <StartLights target={start} />
            <Countdown target={start} className="mt-5" />
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Font size that fits the longest word of `text` on one line of its container (needs an ancestor
 * with container-type: inline-size). Science Gothic at 150% width is ≈1–1.2em per capital (W, M widest), so
 * words wrap between each other but are never split.
 */
function fitWords(text: string, maxRem: number) {
  const longest = Math.max(...text.split(/\s+/).map((w) => w.length), 4);
  return `min(${maxRem}rem, calc(100cqi / ${(longest * 1.2).toFixed(2)}))`;
}

function Fact({ label, value, mono, wide }: { label: string; value: string; mono?: boolean; wide?: boolean }) {
  return (
    <div className={`py-3 pr-3 sm:px-4 sm:first:pl-0 ${wide ? 'col-span-2 sm:col-span-1' : ''}`}>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={`mt-1 font-bold ${mono ? 'tnum text-sm' : 'text-[15px] leading-snug'}`}>{value}</dd>
    </div>
  );
}

function HeroSkeleton() {
  return (
    <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-12 md:px-6 lg:grid-cols-12" role="status" aria-busy="true" aria-label="Завантаження">
      <div className="space-y-4 lg:col-span-7">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-28 w-4/5" />
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-16 w-full" />
      </div>
      <Skeleton className="aspect-[4/3] lg:col-span-5" />
    </div>
  );
}

function SeasonOver() {
  return (
    <section className="border-b-2 border-rule">
      <div className="mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-24">
        <Tag tone="ink">Сезон {SEASON}</Tag>
        <h1 className="display-wide mt-4 text-[clamp(2.5rem,8vw,7rem)]">Сезон завершено</h1>
        <p className="serif mt-4 max-w-[52ch] text-lg text-muted">Підсумкова таблиця, усі результати і рейтинг прогнозистів лишаються доступними до старту наступного сезону.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/standings" className={buttonClass('primary')}>
            Підсумкова таблиця
          </Link>
          <Link to="/races" className={buttonClass('secondary')}>
            Усі Гран-прі
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ── 2. Last race as a timing strip ─────────────────────────────────────── */

function TimingStrip({ round, country }: { round: number; country: string }) {
  const res = generateWeekend(round).race.slice(0, 10);
  const line = (copy: number) => (
    <div className="flex shrink-0 items-stretch" aria-hidden={copy > 0}>
      <span className="display-narrow flex items-center bg-accent px-4 text-sm text-on-accent">
        R{round} {country}
      </span>
      {res.map((r) => {
        const d = DRIVER_BY_CODE[r.driverCode];
        return (
          <span key={r.driverCode} className="flex items-center gap-2 border-r border-bg/15 px-4 py-2.5">
            <span className="tnum grid h-6 w-6 place-items-center bg-bg text-xs font-bold text-ink">{r.position ?? '—'}</span>
            <span aria-hidden className="h-5 w-1" style={{ background: d ? TEAM_BY_ID[d.teamId].color : 'currentColor' }} />
            <span className="font-bold [font-stretch:112%]">{r.driverCode}</span>
            <span className="digits text-xs opacity-75">{r.time}</span>
          </span>
        );
      })}
    </div>
  );
  return (
    <Link to={`/races/${round}`} aria-label={`Результати Гран-прі ${country}`} className="block overflow-hidden bg-ink text-bg">
      <div className="animate-marquee flex w-max hover:[animation-play-state:paused]">
        {line(0)}
        {line(1)}
      </div>
    </Link>
  );
}

/* ── 4. News rail ─────────────────────────────────────────────────────── */

function NewsRail({ items }: { items: NewsItem[] }) {
  const [a, b, ...list] = items;
  return (
    <motion.div variants={stagger(0.03)} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }} className="grid gap-x-8 gap-y-12 md:grid-cols-2 lg:grid-cols-12">
      {a && (
        <div className="lg:col-span-4">
          <NewsCard item={a} />
        </div>
      )}
      {b && (
        <div className="lg:col-span-4">
          <NewsCard item={b} />
        </div>
      )}
      {list.length > 0 && (
        <div className="md:col-span-2 lg:col-span-4">
          {list.map((n) => (
            <NewsCard key={n.id} item={n} variant="line" />
          ))}
        </div>
      )}
    </motion.div>
  );
}

/* ── 5. Predictions poster ───────────────────────────────────────────── */

function PredictPoster() {
  const top = Math.max(...BOLD_OPTIONS.map((o) => o.multiplier));
  return (
    <section className="relative isolate mt-20 overflow-hidden bg-accent text-on-accent">
      <span aria-hidden className="display-wide pointer-events-none absolute -bottom-10 right-2 -z-10 select-none text-[clamp(8rem,26vw,22rem)] leading-none opacity-15">
        ×{top}
      </span>
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 md:grid-cols-12 md:px-6 md:py-20">
        <h2 className="display-wide text-[clamp(2.25rem,6vw,5rem)] md:col-span-7">Прогноз на гонку</h2>
        <div className="md:col-span-5">
          <p className="serif text-lg">
            Назви поул і подіум, додай сміливі прогнози з множником до ×{top} — і піднімайся в рейтингу прогнозистів. Бінго сезону рахується автоматично.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/game" className={buttonClass('inverse')}>
              Зробити прогноз
            </Link>
            <Link to="/game#bingo" className={buttonClass('ghost', 'text-on-accent after:bg-on-accent')}>
              Бінго сезону
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
