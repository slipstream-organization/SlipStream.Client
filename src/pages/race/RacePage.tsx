import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, Box, Clapperboard, Film, Play, Radio, Target, Timer, Zap } from 'lucide-react';
import { api, isCompleted, raceStart } from '../../shared/api';
import { useData } from '../../shared/lib/useData';
import { DRIVER_BY_CODE, SEASON, TEAM_BY_ID } from '../../shared/mock/season';
import { HIGHLIGHTS } from '../../shared/mock/content';
import type { RaceEvent, RaceWeekendResult, SessionKind } from '../../shared/model/types';
import { DriverBadge, Flag, Loader, Segmented } from '../../shared/ui/atoms';
import { fadeUp, stagger } from '../../shared/ui/motion';
import { TrackOutline } from '../../shared/ui/TrackOutline';
import { CIRCUITS } from '../../shared/data/circuits';
import { LapSimulator } from '../../widgets/lap-simulator';
import { AiPreview } from '../../widgets/ai-preview/AiPreview';
import { LivePredictor } from '../../widgets/ai-preview/LivePredictor';
import { GHOST_POLE, GHOST_RECORD } from '../../widgets/lap-simulator/ghosts';
import { referenceGhosts } from '../../shared/mock/trackRecords';
import { PoleChallengeButton } from '../../features/pole-challenge/PoleChallenge';
import { Countdown } from '../../widgets/countdown/Countdown';
import { cn, formatDateRange } from '../../shared/lib/utils';

export function RacePage() {
  const round = Number(useParams().round);
  const race = useData(() => api.race(round), [round]);
  const result = useData(() => api.result(round), [round]);

  if (race.loading) return <Loader className="py-40" />;
  if (!race.data) return <div className="py-40 text-center text-muted">Етап не знайдено</div>;

  const ev = race.data;
  const done = isCompleted(ev);

  return (
    <div>
      <RaceHero ev={ev} />
      <div className="mx-auto mt-10 flex max-w-7xl flex-col gap-10 px-4 md:px-6">
        {done && result.data ? <CompletedWeekend ev={ev} result={result.data} /> : !done ? <UpcomingWeekend ev={ev} /> : <Loader />}
      </div>
    </div>
  );
}

function RaceHero({ ev }: { ev: RaceEvent }) {
  const c = CIRCUITS[ev.circuitId];
  return (
    <section className="relative overflow-hidden border-b border-line bg-surface">
      <div className="pointer-events-none absolute -right-10 -top-10 h-[130%] w-[50%] opacity-[0.07]">
        <TrackOutline circuitId={ev.circuitId} className="h-full w-full text-ink" strokeWidth={6} />
      </div>
      <div className="relative mx-auto max-w-7xl px-4 py-10 md:px-6">
        <Link to="/races" className="mb-6 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted transition hover:text-f1-red">
          <ArrowLeft className="h-4 w-4" /> Усі Гран-прі
        </Link>
        <motion.div variants={stagger(0.07)} initial="hidden" animate="show" className="grid items-end gap-8 md:grid-cols-[1fr_auto]">
          <div>
            <motion.div variants={fadeUp} className="text-xs font-bold uppercase tracking-[0.25em] text-f1-red">
              Round {ev.round} · {formatDateRange(ev.startDate, ev.endDate)}
            </motion.div>
            <motion.div variants={fadeUp} className="mt-3 flex items-center gap-4">
              <Flag code={ev.countryCode} className="h-10 w-10" />
              <h1 className="display text-5xl md:text-7xl">{ev.country}</h1>
            </motion.div>
            <motion.p variants={fadeUp} className="mt-3 text-sm font-semibold uppercase text-muted">
              {ev.officialName}
            </motion.p>
            <motion.div variants={fadeUp} className="mt-6">
              <PoleChallengeButton ev={ev} />
            </motion.div>
          </div>
          <motion.div variants={fadeUp} className="grid grid-cols-3 gap-6 font-mono text-sm">
            <HeroStat label="Траса" value={c?.name.replace(' Circuit', '') ?? '—'} wide />
            <HeroStat label="Довжина" value={`${((c?.length ?? 0) / 1000).toFixed(3)} km`} />
            <HeroStat label="Кіл" value={String(ev.laps)} />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

function HeroStat({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={cn(wide && 'max-w-[180px]')}>
      <div className="text-[10px] uppercase tracking-widest text-muted">{label}</div>
      <div className="mt-1 font-bold leading-tight">{value}</div>
    </div>
  );
}

/* ---------------------------------------------------------------- media */

type Media = 'sim' | 'video' | 'highlights';

function MediaPanel({ ev, lapTime, driverCode, upcoming }: { ev: RaceEvent; lapTime: number; driverCode?: string; upcoming?: boolean }) {
  const [media, setMedia] = useState<Media>('sim');
  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="display text-3xl">{upcoming ? 'Як виглядає коло' : 'Поул-коло'}</h2>
        <Segmented
          layoutKey="media"
          value={media}
          onChange={setMedia}
          options={[
            { value: 'sim', label: <><Box className="h-3.5 w-3.5" /> 3D</> },
            { value: 'video', label: <><Film className="h-3.5 w-3.5" /> Відео</> },
            { value: 'highlights', label: <><Clapperboard className="h-3.5 w-3.5" /> Хайлайти</> },
          ]}
        />
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={media} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }}>
          {media === 'sim' && (
            <LapSimulator
              circuitId={ev.circuitId}
              title={`${SEASON} ${ev.country} GP · ${upcoming ? 'Reference lap' : 'Qualifying'}`}
              runs={[
                { label: upcoming ? 'Орієнтир поулу' : `Поул ${SEASON}`, detail: driverCode, lapTime, color: '#9a9da2' },
                ...referenceGhosts(ev.circuitId, { pole: GHOST_POLE, record: GHOST_RECORD }),
              ]}
            />
          )}
          {media === 'video' && <VideoPlaceholder title={`${ev.country} GP — ${upcoming ? 'onboard preview' : 'pole lap onboard'}`} circuitId={ev.circuitId} />}
          {media === 'highlights' && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {HIGHLIGHTS.map((h, i) => (
                <motion.div key={h.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <VideoPlaceholder title={h.title} circuitId={ev.circuitId} duration={h.duration} small />
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}

function VideoPlaceholder({ title, circuitId, duration, small }: { title: string; circuitId: string; duration?: string; small?: boolean }) {
  return (
    <div className={cn('group relative grid w-full cursor-pointer place-items-center overflow-hidden rounded-xl bg-[#111116] text-white', small ? 'aspect-video' : 'aspect-[4/5] sm:aspect-video')}>
      <TrackOutline circuitId={circuitId} className="absolute inset-0 m-auto h-[80%] w-[80%] text-white/10 transition-transform duration-700 group-hover:scale-105" strokeWidth={3} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
      <span className={cn('relative grid place-items-center rounded-full bg-f1-red shadow-[0_0_40px_rgba(225,6,0,0.6)] transition-transform group-hover:scale-110', small ? 'h-12 w-12' : 'h-20 w-20')}>
        <Play className={cn('ml-1 fill-white', small ? 'h-5 w-5' : 'h-8 w-8')} />
      </span>
      <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between p-4">
        <div>
          <div className={cn('font-bold', small ? 'text-sm' : 'text-lg')}>{title}</div>
          <div className="text-xs text-white/50">Відео з’явиться після підключення API</div>
        </div>
        {duration && <span className="rounded bg-black/60 px-1.5 py-0.5 font-mono text-xs">{duration}</span>}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- completed */

type ResultTab = 'race' | 'quali' | 'grid';

function CompletedWeekend({ ev, result }: { ev: RaceEvent; result: RaceWeekendResult }) {
  const [tab, setTab] = useState<ResultTab>('race');
  const pole = result.qualifying[0];

  return (
    <>
      <Podium result={result} />
      <MediaPanel ev={ev} lapTime={result.poleTime} driverCode={pole.driverCode} />
      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="display text-3xl">Результати</h2>
          <Segmented
            layoutKey="results"
            value={tab}
            onChange={setTab}
            options={[
              { value: 'race', label: 'Гонка' },
              { value: 'quali', label: 'Кваліфікація' },
              { value: 'grid', label: 'Стартова решітка' },
            ]}
          />
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            {tab === 'race' && <RaceTable result={result} />}
            {tab === 'quali' && <QualiTable result={result} />}
            {tab === 'grid' && <StartingGrid result={result} />}
          </motion.div>
        </AnimatePresence>
      </section>
    </>
  );
}

function Podium({ result }: { result: RaceWeekendResult }) {
  const [p1, p2, p3] = result.race;
  const order = [p2, p1, p3];
  const heights = ['h-28', 'h-40', 'h-20'];
  return (
    <section className="grid grid-cols-3 items-end gap-3 md:mx-auto md:w-[640px]">
      {order.map((r, i) => {
        const d = DRIVER_BY_CODE[r.driverCode];
        const team = TEAM_BY_ID[d.teamId];
        return (
          <motion.div key={r.driverCode} initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: [0.25, 0, 0.45][i], type: 'spring', stiffness: 160, damping: 18 }} className="flex flex-col items-center text-center">
            <Link to={`/drivers/${r.driverCode}`} className="flex flex-col items-center transition hover:-translate-y-1">
            <DriverBadge code={r.driverCode} size={i === 1 ? 72 : 56} />
            <div className="mt-2 text-xs text-muted">{d.firstName}</div>
            <div className="display text-xl md:text-2xl">{d.lastName}</div>
            <div className="font-mono text-xs text-muted">{r.time}</div>
            </Link>
            <div className={cn('mt-3 flex w-full items-start justify-center rounded-t-lg pt-2', heights[i])} style={{ background: `linear-gradient(to bottom, ${team.color}, ${team.color}22)` }}>
              <span className="display text-4xl text-black/70">{r.position}</span>
            </div>
          </motion.div>
        );
      })}
    </section>
  );
}

function DriverCell({ code }: { code: string }) {
  const d = DRIVER_BY_CODE[code];
  const team = TEAM_BY_ID[d.teamId];
  return (
    <Link to={`/drivers/${code}`} className="group/drv flex items-center gap-3">
      <span className="h-8 w-1 rounded-full" style={{ background: team.color }} />
      <DriverBadge code={code} size={28} />
      <div className="leading-tight">
        <div className="font-bold transition-colors group-hover/drv:text-f1-red">
          <span className="hidden sm:inline">{d.firstName} </span>
          <span className="uppercase">{d.lastName}</span>
        </div>
        <div className="text-xs text-muted">{team.name}</div>
      </div>
    </Link>
  );
}

const rowAnim = (i: number) => ({ initial: { opacity: 0, x: -12 }, animate: { opacity: 1, x: 0 }, transition: { delay: i * 0.025 } });

function RaceTable({ result }: { result: RaceWeekendResult }) {
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[620px] text-sm">
        <thead>
          <tr className="border-b border-line text-left text-[11px] uppercase tracking-wider text-muted">
            <th className="w-14 px-4 py-3">Поз</th>
            <th className="px-4 py-3">Пілот</th>
            <th className="px-4 py-3 text-center">Старт</th>
            <th className="px-4 py-3 text-center">Кола</th>
            <th className="px-4 py-3">Час / відрив</th>
            <th className="px-4 py-3 text-right">Очки</th>
          </tr>
        </thead>
        <tbody>
          {result.race.map((r, i) => {
            const gained = r.position ? r.grid - r.position : 0;
            return (
              <motion.tr key={r.driverCode} {...rowAnim(i)} className="border-b border-line/60 transition-colors last:border-0 hover:bg-surface-2">
                <td className="px-4 py-2.5 font-mono font-bold">{r.position ?? <span className="text-f1-red">DNF</span>}</td>
                <td className="px-4 py-2.5">
                  <DriverCell code={r.driverCode} />
                </td>
                <td className="px-4 py-2.5 text-center font-mono">
                  {r.grid}
                  {r.position && gained !== 0 && <span className={cn('ml-1 text-[10px]', gained > 0 ? 'text-emerald-500' : 'text-f1-red')}>{gained > 0 ? `▲${gained}` : `▼${-gained}`}</span>}
                </td>
                <td className="px-4 py-2.5 text-center font-mono">{r.laps}</td>
                <td className="px-4 py-2.5 font-mono">
                  {r.time}
                  {r.fastestLap && (
                    <span className="ml-2 inline-flex items-center gap-1 rounded bg-purple-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      <Zap className="h-3 w-3" /> FL
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right font-mono font-bold">{r.points || ''}</td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function QualiTable({ result }: { result: RaceWeekendResult }) {
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[620px] text-sm">
        <thead>
          <tr className="border-b border-line text-left text-[11px] uppercase tracking-wider text-muted">
            <th className="w-14 px-4 py-3">Поз</th>
            <th className="px-4 py-3">Пілот</th>
            <th className="px-4 py-3">Q1</th>
            <th className="px-4 py-3">Q2</th>
            <th className="px-4 py-3">Q3</th>
          </tr>
        </thead>
        <tbody>
          {result.qualifying.map((q, i) => (
            <motion.tr key={q.driverCode} {...rowAnim(i)} className={cn('border-b border-line/60 transition-colors last:border-0 hover:bg-surface-2', (i === 10 || i === 16) && 'border-t-2 border-t-f1-red/40')}>
              <td className="px-4 py-2.5 font-mono font-bold">{q.position}</td>
              <td className="px-4 py-2.5">
                <DriverCell code={q.driverCode} />
              </td>
              <td className="px-4 py-2.5 font-mono">{q.q1}</td>
              <td className="px-4 py-2.5 font-mono">{q.q2 ?? '—'}</td>
              <td className={cn('px-4 py-2.5 font-mono', i === 0 && 'font-bold text-purple-500')}>{q.q3 ?? '—'}</td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StartingGrid({ result }: { result: RaceWeekendResult }) {
  return (
    <div className="card relative overflow-hidden bg-[#2e3035] p-6 text-white md:p-10">
      <div className="mx-auto mb-6 h-3 max-w-md [background:repeating-conic-gradient(#fff_0_25%,#111_0_50%)_0_0/12px_12px]" />
      <div className="mx-auto grid max-w-md grid-cols-2 gap-x-10">
        {result.qualifying.map((q, i) => (
          <motion.div
            key={q.driverCode}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className={cn('relative mb-6 border-x-2 border-t-2 border-white/80 px-3 pb-2 pt-2', i % 2 ? 'mt-10' : '')}
          >
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-white/60">P{q.position}</span>
              <DriverBadge code={q.driverCode} size={26} />
              <span className="font-black">{q.driverCode}</span>
            </div>
            <div className="mt-1 font-mono text-[10px] text-white/50">{q.q3 ?? q.q2 ?? q.q1}</div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- upcoming */

const SESSION_LABEL: Record<SessionKind, string> = {
  FP1: 'Практика 1',
  FP2: 'Практика 2',
  FP3: 'Практика 3',
  SQ: 'Спринт-кваліфікація',
  SPRINT: 'Спринт',
  QUALI: 'Кваліфікація',
  RACE: 'Гонка',
};

function UpcomingWeekend({ ev }: { ev: RaceEvent }) {
  const [now] = useState(() => Date.now());
  return (
    <>
      <section className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="relative overflow-hidden rounded-[14px] border border-white/10 bg-[#0b0b0f] p-6 text-white md:p-8">
          <div className="pointer-events-none absolute -left-20 -top-20 h-80 w-80 rounded-full bg-f1-red/30 blur-[100px]" />
          <div className="relative">
            <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.25em] text-white/50">
              <Timer className="h-4 w-4" /> До старту гонки
            </div>
            <Countdown target={raceStart(ev)} />
            <Link to="/game" className="mt-8 inline-flex items-center gap-2 rounded-full bg-f1-red px-6 py-3 text-sm font-bold uppercase transition hover:bg-[#ff1a12]">
              <Target className="h-4 w-4" /> Зробити bold prediction
            </Link>
          </div>
        </div>
        <div className="card p-5">
          <h3 className="display mb-4 text-xl">Розклад уікенду</h3>
          <ul className="space-y-1">
            {ev.sessions.map((s) => {
              const d = new Date(s.start);
              const past = d.getTime() < now;
              return (
                <li key={s.kind} className={cn('flex items-center justify-between rounded-lg px-3 py-2.5', s.kind === 'RACE' ? 'bg-f1-red/10' : 'hover:bg-surface-2', past && 'opacity-50')}>
                  <span className={cn('font-bold', s.kind === 'RACE' && 'text-f1-red')}>{SESSION_LABEL[s.kind]}</span>
                  <span className="font-mono text-xs text-muted">{d.toLocaleString('uk-UA', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-[11px] text-muted">Час показано у вашому часовому поясі</p>
        </div>
      </section>
      <AiPreview round={ev.round} laps={ev.laps} />
      <LiveSection ev={ev} />
      <MediaPanel ev={ev} lapTime={ev.poleLapTime} upcoming />
    </>
  );
}

/** Live prediction while the race is running; before that — an opt-in demo. */
function LiveSection({ ev }: { ev: RaceEvent }) {
  const [now] = useState(() => Date.now());
  const start = raceStart(ev);
  const live = now >= start && now < start + 2 * 3600_000;
  const [demo, setDemo] = useState(false);
  if (live || demo) return <LivePredictor round={ev.round} demo={!live} />;
  return (
    <section className="relative overflow-hidden rounded-[14px] border border-line bg-surface p-6 md:p-8">
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-violet-500/15 blur-[80px]" />
      <div className="relative flex flex-wrap items-center gap-6">
        <div className="flex-1">
          <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-violet-500 dark:text-violet-300">
            <Radio className="h-4 w-4" /> Live-прогноз
          </div>
          <h3 className="display text-2xl">Під час гонки тут буде прогноз у реальному часі</h3>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Щокола модель перераховує, хто куди рухається: хто зараз п’ятий, але після піт-стопів суперників за 10 кіл буде першим, і як найімовірніше завершиться гонка.
          </p>
        </div>
        <button type="button" onClick={() => setDemo(true)} className="flex items-center gap-2 rounded-full bg-f1-red px-6 py-3 text-sm font-bold uppercase tracking-wide text-white transition hover:bg-[#ff1a12]">
          <Play className="h-4 w-4" /> Запустити демо
        </button>
      </div>
    </section>
  );
}
