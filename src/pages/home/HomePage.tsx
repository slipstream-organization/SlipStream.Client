import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, Clock, Target, Trophy } from 'lucide-react';
import { api, raceStart } from '../../shared/api';
import { useData } from '../../shared/lib/useData';
import { Countdown } from '../../widgets/countdown/Countdown';
import { NewsCard } from '../../widgets/news/NewsCard';
import { TrackOutline } from '../../shared/ui/TrackOutline';
import { CIRCUITS } from '../../shared/data/circuits';
import { DriverBadge, Flag, Loader, SectionTitle } from '../../shared/ui/atoms';
import { fadeUp, stagger } from '../../shared/ui/motion';
import { DRIVER_BY_CODE, TEAM_BY_ID } from '../../shared/mock/season';
import { generateWeekend } from '../../shared/mock/results';
import type { NewsItem, TeamId } from '../../shared/model/types';
import { formatDateRange } from '../../shared/lib/utils';

export function HomePage() {
  const next = useData(api.nextRace);
  const last = useData(api.lastRace);
  const news = useData(api.news);
  const drivers = useData(api.driverStandings);
  const teams = useData(api.constructorStandings);

  return (
    <div className="flex flex-col gap-16">
      {next.data ? <NextRaceHero /> : next.loading ? <Loader /> : <SeasonOver />}
      {last.data && <ResultsTicker round={last.data.round} country={last.data.country} />}

      <section className="mx-auto grid w-full max-w-7xl gap-10 px-4 md:px-6 lg:grid-cols-[1fr_340px]">
        <div>
          <SectionTitle kicker="Paddock" title="Новини" />
          {news.data ? <NewsGrid items={news.data.slice(0, 7)} /> : <Loader />}
        </div>
        <aside className="flex flex-col gap-6">
          <MiniStandings
            title="Пілоти"
            rows={drivers.data?.table.slice(0, 5).map((r) => {
              const d = DRIVER_BY_CODE[r.id];
              return { id: r.id, name: `${d.firstName[0]}. ${d.lastName}`, team: d.teamId, points: r.points, badge: <DriverBadge code={r.id} size={28} />, href: `/drivers/${r.id}` };
            })}
          />
          <MiniStandings
            title="Конструктори"
            rows={teams.data?.table.slice(0, 5).map((r) => {
              const t = TEAM_BY_ID[r.id as TeamId];
              return { id: r.id, name: t.name, team: t.id, points: r.points, badge: <span className="h-7 w-1.5 rounded-full" style={{ background: t.color }} /> };
            })}
          />
          <PredictCta />
        </aside>
      </section>
    </div>
  );
}

function NextRaceHero() {
  const { data: race } = useData(api.nextRace);
  if (!race) return null;
  const circuit = CIRCUITS[race.circuitId];
  const start = raceStart(race);
  const quali = race.sessions.find((s) => s.kind === 'QUALI');

  return (
    <section className="relative overflow-hidden bg-[#0b0b0f] text-white">
      {/* background decoration */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(255,255,255,.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.5)_1px,transparent_1px)] [background-size:48px_48px]" />
      <div className="pointer-events-none absolute -left-40 top-0 h-[600px] w-[600px] rounded-full bg-f1-red/25 blur-[140px]" />
      <motion.div
        className="speed-stripes pointer-events-none absolute -right-20 bottom-10 h-3 w-[60%] opacity-70"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
      />

      <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 md:px-6 md:py-20 lg:grid-cols-[1.2fr_1fr]">
        <motion.div variants={stagger(0.08)} initial="hidden" animate="show">
          <motion.div variants={fadeUp} className="mb-4 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.25em] text-white/60">
            <span className="flex items-center gap-2 rounded-full bg-f1-red px-3 py-1 text-white">
              <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-white" /> Наступна гонка
            </span>
            Round {race.round}
          </motion.div>
          <motion.div variants={fadeUp} className="flex items-center gap-4">
            <Flag code={race.countryCode} className="h-10 w-10 ring-white/30" />
            <h1 className="display text-5xl sm:text-7xl lg:text-8xl">{race.country}</h1>
          </motion.div>
          <motion.p variants={fadeUp} className="mt-4 max-w-xl text-sm font-semibold uppercase tracking-wide text-white/60">
            {race.officialName}
          </motion.p>
          <motion.div variants={fadeUp} className="mt-2 font-mono text-sm text-white/80">
            {formatDateRange(race.startDate, race.endDate)} · {circuit?.name}
          </motion.div>

          <motion.div variants={fadeUp} className="mt-8">
            <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.25em] text-white/50">До старту гонки</div>
            <Countdown target={start} />
          </motion.div>

          <motion.div variants={fadeUp} className="mt-8 flex flex-wrap gap-3">
            <Link to="/game" className="group flex items-center gap-2 rounded-full bg-f1-red px-6 py-3 text-sm font-bold uppercase tracking-wide transition hover:bg-[#ff1a12]">
              <Target className="h-4 w-4" /> Зробити прогноз
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link to={`/races/${race.round}`} className="flex items-center gap-2 rounded-full border border-white/20 px-6 py-3 text-sm font-bold uppercase tracking-wide transition hover:border-white hover:bg-white hover:text-black">
              Деталі уікенду
            </Link>
          </motion.div>
          {quali && (
            <motion.div variants={fadeUp} className="mt-5 flex items-center gap-2 text-xs text-white/50">
              <Clock className="h-3.5 w-3.5" /> Прийом прогнозів закривається на старті кваліфікації ·{' '}
              {new Date(quali.start).toLocaleString('uk-UA', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </motion.div>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.9, rotate: -6 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }} className="relative mx-auto aspect-square w-full max-w-[460px]">
          <div className="absolute inset-[12%] rounded-full border border-white/10" />
          <div className="absolute inset-[24%] rounded-full border border-dashed border-white/10" />
          <TrackOutline circuitId={race.circuitId} className="absolute inset-0 h-full w-full text-white drop-shadow-[0_0_24px_rgba(225,6,0,0.55)]" strokeWidth={4} animateDraw runner runnerDuration={12} />
          <div className="absolute bottom-0 left-0 grid grid-cols-3 gap-4 font-mono text-xs">
            <Stat label="Довжина" value={`${((circuit?.length ?? 0) / 1000).toFixed(3)} км`} />
            <Stat label="Кіл" value={String(race.laps)} />
            <Stat label="Дистанція" value={`${(((circuit?.length ?? 0) * race.laps) / 1000).toFixed(1)} км`} />
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-white/40">{label}</div>
      <div className="font-bold text-white">{value}</div>
    </div>
  );
}

function SeasonOver() {
  return (
    <section className="bg-[#0b0b0f] py-24 text-center text-white">
      <h1 className="display text-6xl">Сезон завершено</h1>
    </section>
  );
}

function ResultsTicker({ round, country }: { round: number; country: string }) {
  const res = generateWeekend(round).race.slice(0, 10);
  const items = res.map((r) => `P${r.position} ${r.driverCode} ${r.time}`);
  const line = (
    <div className="flex shrink-0 items-center gap-8 pr-8">
      <span className="font-bold uppercase text-f1-red">R{round} · {country}</span>
      {items.map((t) => (
        <span key={t} className="whitespace-nowrap">{t}</span>
      ))}
    </div>
  );
  return (
    <Link to={`/races/${round}`} className="-mt-16 block overflow-hidden border-y border-line bg-surface py-3 font-mono text-xs">
      <div className="animate-marquee flex w-max hover:[animation-play-state:paused]">
        {line}
        {line}
      </div>
    </Link>
  );
}

function NewsGrid({ items }: { items: NewsItem[] }) {
  const [featured, ...rest] = items;
  return (
    <motion.div variants={stagger()} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }} className="grid gap-5 md:grid-cols-2">
      <NewsCard item={featured} featured />
      {rest.map((n) => (
        <NewsCard key={n.id} item={n} />
      ))}
    </motion.div>
  );
}

function MiniStandings({ title, rows }: { title: string; rows?: { id: string; name: string; team: TeamId; points: number; badge: React.ReactNode; href?: string }[] }) {
  const max = rows?.[0]?.points || 1;
  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="display flex items-center gap-2 text-xl">
          <Trophy className="h-4 w-4 text-f1-red" /> {title}
        </h3>
        <Link to="/standings" className="text-xs font-bold uppercase text-muted transition hover:text-f1-red">
          Усі →
        </Link>
      </div>
      {!rows ? (
        <Loader className="py-6" />
      ) : (
        <ul className="space-y-3">
          {rows.map((r, i) => (
            <li key={r.id}>
              <Link to={r.href ?? '/standings'} className="group flex items-center gap-3">
              <span className="w-4 font-mono text-sm font-bold text-muted">{i + 1}</span>
              {r.badge}
              <div className="min-w-0 flex-1">
                <div className="flex justify-between text-sm font-bold">
                  <span className="truncate transition-colors group-hover:text-f1-red">{r.name}</span>
                  <span className="font-mono">{r.points}</span>
                </div>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-surface-2">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: TEAM_BY_ID[r.team].color }}
                    initial={{ width: 0 }}
                    whileInView={{ width: `${(r.points / max) * 100}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, delay: i * 0.08, ease: 'easeOut' }}
                  />
                </div>
              </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PredictCta() {
  return (
    <Link to="/game" className="group relative overflow-hidden rounded-[14px] bg-f1-red p-6 text-white">
      <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full border-[14px] border-white/15 transition-transform duration-700 group-hover:scale-150" />
      <div className="text-xs font-bold uppercase tracking-[0.2em] text-white/70">Гра</div>
      <div className="display mt-2 text-3xl">Bold predictions</div>
      <p className="mt-2 text-sm text-white/80">Зроби сміливий прогноз на наступне Гран-прі та піднімись у рейтингу.</p>
      <div className="mt-4 flex items-center gap-2 text-sm font-bold uppercase">
        Грати <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </div>
    </Link>
  );
}
