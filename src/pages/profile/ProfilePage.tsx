import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Activity, Award, Box, CheckCircle2, Play, Target, TrendingUp, X } from 'lucide-react';
import { api, isCompleted } from '../../shared/api';
import { useData } from '../../shared/lib/useData';
import type { UserLap, UserProfile } from '../../shared/mock/profile';
import { DRIVER_BY_CODE, RACES, SEASON, TEAM_BY_ID } from '../../shared/mock/season';
import type { TeamId } from '../../shared/model/types';
import { Flag, Loader, SectionTitle, Segmented } from '../../shared/ui/atoms';
import { fadeUp, stagger } from '../../shared/ui/motion';
import { TrackOutline } from '../../shared/ui/TrackOutline';
import { CIRCUITS } from '../../shared/data/circuits';
import { LapSimulator } from '../../widgets/lap-simulator';
import { LapAnalysisPanel } from '../../widgets/lap-simulator/LapAnalysisPanel';
import { getLap, getProLap } from '../../widgets/lap-simulator/lapModel';
import { GHOST_POLE, GHOST_RECORD } from '../../widgets/lap-simulator/ghosts';
import { REAL_LAPS, referenceGhosts } from '../../shared/mock/trackRecords';
import { generateWeekend } from '../../shared/mock/results';
import { cn, formatLapTime } from '../../shared/lib/utils';
import { useMyLaps } from '../../shared/lib/lapStore';

export function ProfilePage() {
  const { data: me } = useData(api.me);
  if (!me) return <Loader className="py-40" />;
  return (
    <div className="mx-auto max-w-7xl px-4 pt-10 md:px-6">
      <ProfileHeader me={me} />
      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_380px]">
        <div className="flex flex-col gap-12">
          <PredictionStats me={me} />
          <MyLaps me={me} />
        </div>
        <Tasks me={me} />
      </div>
    </div>
  );
}

function ProfileHeader({ me }: { me: UserProfile }) {
  const team = TEAM_BY_ID[me.favouriteTeam as TeamId];
  const driver = DRIVER_BY_CODE[me.favouriteDriver];
  const pct = me.xp / me.xpNext;
  return (
    <motion.section variants={stagger(0.08)} initial="hidden" animate="show" className="relative overflow-hidden rounded-[18px] border border-white/10 bg-[#0b0b0f] p-6 text-white md:p-10">
      <div className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(circle at 85% 20%, ${team.color}55, transparent 50%)` }} />
      <div className="speed-stripes pointer-events-none absolute -left-10 bottom-6 h-2 w-1/3 opacity-60" />
      <div className="relative grid items-center gap-8 md:grid-cols-[auto_1fr_auto]">
        <motion.div variants={fadeUp} className="relative h-28 w-28 md:h-32 md:w-32">
          <svg viewBox="0 0 120 120" className="h-28 w-28 -rotate-90 md:h-32 md:w-32">
            <circle cx="60" cy="60" r="54" stroke="rgba(255,255,255,.1)" strokeWidth="6" fill="none" />
            <motion.circle cx="60" cy="60" r="54" stroke="#e10600" strokeWidth="6" fill="none" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: pct }} transition={{ duration: 1.4, ease: 'easeOut', delay: 0.3 }} />
          </svg>
          <div className="absolute inset-3 grid place-items-center rounded-full bg-gradient-to-br from-f1-red to-orange-500 text-4xl font-black">{me.name[0]}</div>
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-white px-2 py-0.5 font-mono text-[11px] font-bold text-black">LVL {me.level}</div>
        </motion.div>

        <motion.div variants={fadeUp}>
          <div className="text-xs font-bold uppercase tracking-[0.25em] text-white/50">@{me.handle}</div>
          <h1 className="display mt-1 text-5xl md:text-6xl">{me.name}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full px-3 py-1 font-bold text-black" style={{ background: team.color }}>
              {team.name}
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 font-bold">
              <Flag code={driver.country} className="h-4 w-4 ring-0" /> {driver.firstName} {driver.lastName}
            </span>
          </div>
          <div className="mt-4 max-w-sm">
            <div className="mb-1 flex justify-between font-mono text-[11px] text-white/60">
              <span>XP</span>
              <span>
                {me.xp} / {me.xpNext}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <motion.div className="h-full bg-f1-red" initial={{ width: 0 }} animate={{ width: `${pct * 100}%` }} transition={{ duration: 1.2, delay: 0.4 }} />
            </div>
          </div>
        </motion.div>

        <motion.div variants={fadeUp} className="grid grid-cols-3 gap-3 md:grid-cols-1 md:text-right">
          <BigStat label="Рейтинг" value={String(me.rating)} extra={<span className="text-emerald-400">▲{me.ratingDelta}</span>} />
          <BigStat label="Ліга" value={me.tier} />
          <BigStat label="Глобально" value={`#${me.globalRank}`} extra={<span className="text-white/40">з {me.totalPlayers.toLocaleString('uk-UA')}</span>} />
        </motion.div>
      </div>
    </motion.section>
  );
}

function BigStat({ label, value, extra }: { label: string; value: string; extra?: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">{label}</div>
      <div className="display text-2xl md:text-3xl">{value}</div>
      {extra && <div className="font-mono text-[11px]">{extra}</div>}
    </div>
  );
}

function PredictionStats({ me }: { me: UserProfile }) {
  const max = Math.max(...me.predictionHistory.map((p) => p.points));
  const avg = Math.round(me.predictionHistory.reduce((a, p) => a + p.points, 0) / me.predictionHistory.length);
  return (
    <section>
      <SectionTitle
        kicker="Bold predictions"
        title="Мої прогнози"
        action={
          <Link to="/game" className="flex items-center gap-1.5 text-xs font-bold uppercase text-muted transition hover:text-f1-red">
            <Target className="h-4 w-4" /> Зробити прогноз
          </Link>
        }
      />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi icon={<Award className="h-4 w-4" />} label="Місце в рейтингу" value={`#${me.predictionRank}`} />
        <Kpi icon={<TrendingUp className="h-4 w-4" />} label="Очки сезону" value={String(me.predictionPoints)} />
        <Kpi icon={<Target className="h-4 w-4" />} label="Точність" value={`${Math.round(me.accuracy * 100)}%`} />
        <Kpi icon={<CheckCircle2 className="h-4 w-4" />} label="Середнє за етап" value={String(avg)} />
      </div>
      <div className="card p-5">
        <div className="mb-4 text-xs font-bold uppercase tracking-wider text-muted">Очки за етап</div>
        <div className="flex h-40 items-end gap-1 sm:gap-1.5">
          {me.predictionHistory.map((p, i) => {
            const race = RACES.find((r) => r.round === p.round);
            const best = p.points === max;
            return (
              <div key={p.round} className="group relative flex h-full flex-1 flex-col justify-end">
                <span className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-ink px-1.5 py-0.5 font-mono text-[10px] text-bg opacity-0 transition group-hover:opacity-100">
                  {race?.country}: {p.points}
                </span>
                <motion.div
                  className={cn('w-full rounded-t', best ? 'bg-f1-red' : 'bg-ink/20 group-hover:bg-ink/40')}
                  initial={{ height: 0 }}
                  whileInView={{ height: `${(p.points / max) * 100}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, delay: i * 0.03, ease: 'easeOut' }}
                />
                <span className="mt-1 text-center font-mono text-[9px] text-muted">{race?.countryCode.toUpperCase()}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted">
        <span className="text-f1-red">{icon}</span>
        {label}
      </div>
      <div className="display mt-2 text-3xl">{value}</div>
    </div>
  );
}

const lapStyle = (lap: UserLap) => lap.round * 97 + 13; // stable "driving style" per lap

/** Pre-computes the user's laps in idle time so opening one is instant. */
function useWarmLaps(laps: UserLap[]) {
  useEffect(() => {
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 50));
    const cancel = window.cancelIdleCallback ?? window.clearTimeout;
    const jobs = laps.flatMap((l) => {
      const c = CIRCUITS[l.circuitId];
      const real = REAL_LAPS[l.circuitId];
      return [
        () => getLap(c.points, l.lapTime, c.length, lapStyle(l)),
        ...(real ? [() => getProLap(c.points, real.pole.lapTime, c.length), () => getProLap(c.points, real.record.lapTime, c.length)] : []),
      ];
    });
    let id = 0;
    const next = () => {
      const job = jobs.shift();
      if (!job) return;
      job();
      id = idle(next);
    };
    id = idle(next);
    return () => cancel(id);
  }, [laps]);
}

function MyLaps({ me }: { me: UserProfile }) {
  const [open, setOpen] = useState<UserLap | null>(null);
  const laps = useMyLaps(me.laps);
  useWarmLaps(laps);
  return (
    <section>
      <SectionTitle kicker="Hot laps" title="Мої кола" />
      <motion.div variants={stagger(0.05)} initial="hidden" whileInView="show" viewport={{ once: true }} className="grid gap-3 sm:grid-cols-2">
        {laps.map((l) => {
          const race = RACES.find((r) => r.round === l.round)!;
          const realPole = REAL_LAPS[l.circuitId]?.pole;
          const poleTime = realPole?.lapTime ?? race.poleLapTime;
          const delta = l.lapTime - poleTime;
          const pct = (delta / poleTime) * 100;
          return (
            <motion.button variants={fadeUp} key={l.circuitId} type="button" onClick={() => setOpen(l)} className="group card relative flex items-center gap-4 overflow-hidden p-4 text-left transition hover:-translate-y-0.5 hover:border-f1-red/50">
              <TrackOutline circuitId={l.circuitId} className="h-12 w-20 shrink-0 text-ink/60 transition group-hover:text-f1-red" strokeWidth={2.5} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Flag code={race.countryCode} className="h-4 w-4 ring-0" />
                  <span className="truncate font-bold">{CIRCUITS[l.circuitId].name}</span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="font-mono text-2xl font-bold">{formatLapTime(l.lapTime)}</span>
                  {l.isNew && <span className="shrink-0 rounded bg-violet-500 px-1.5 py-0.5 text-[9px] font-black uppercase text-white">PB</span>}
                  {l.source && <span className="shrink-0 rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-muted">{l.source === 'steam' ? 'Steam' : 'exe'}{l.attempts ? ` · ${l.attempts} спр.` : ''}</span>}
                </div>
                <div className="font-mono text-xs text-muted">
                  поул {realPole ? `${realPole.year} ${realPole.code}` : ''} {formatLapTime(poleTime)} · <span className={pct < 3 ? 'text-emerald-500' : 'text-orange-500'}>{delta < 0 ? '−' : '+'}{Math.abs(delta).toFixed(3)} ({pct.toFixed(1)}%)</span>
                </div>
              </div>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface-2 transition group-hover:bg-f1-red group-hover:text-white">
                <Play className="ml-0.5 h-4 w-4" />
              </span>
            </motion.button>
          );
        })}
      </motion.div>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] grid place-items-center bg-black/80 p-2 backdrop-blur-md sm:p-4" onClick={() => setOpen(null)}>
            <motion.div
              initial={{ scale: 0.94, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0 }}
              // as wide as the screen allows while the 16:9 scene still fits in height
              style={{ maxWidth: 'min(1440px, calc((100dvh - 8rem) * 16 / 9))' }}
              className="flex max-h-[calc(100dvh-1rem)] w-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d12] shadow-[0_30px_80px_rgba(0,0,0,0.6)] sm:max-h-[calc(100dvh-2rem)]"
              onClick={(e) => e.stopPropagation()}
            >
              <MyLapViewer lap={open} handle={me.handle} onClose={() => setOpen(null)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function Tasks({ me }: { me: UserProfile }) {
  return (
    <aside>
      <div className="card sticky top-24 p-5">
        <h3 className="display mb-1 text-2xl">Завдання</h3>
        <p className="mb-5 text-xs text-muted">Виконуй — отримуй XP та підвищуй рейтинг</p>
        <motion.ul variants={stagger(0.06)} initial="hidden" animate="show" className="space-y-3">
          {me.tasks.map((t) => {
            const done = t.progress >= t.goal;
            return (
              <motion.li variants={fadeUp} key={t.id} className={cn('rounded-xl border p-4 transition', done ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-line hover:border-ink/20')}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-muted">{t.period}</div>
                    <div className="mt-0.5 font-bold">{t.title}</div>
                  </div>
                  <span className={cn('shrink-0 rounded-full px-2 py-0.5 font-mono text-[11px] font-bold', done ? 'bg-emerald-500 text-white' : 'bg-f1-red/10 text-f1-red')}>+{t.xp} XP</span>
                </div>
                <p className="mt-1 text-xs text-muted">{t.description}</p>
                <div className="mt-3 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                    <motion.div className={cn('h-full rounded-full', done ? 'bg-emerald-500' : 'bg-f1-red')} initial={{ width: 0 }} animate={{ width: `${Math.min(1, t.progress / t.goal) * 100}%` }} transition={{ duration: 1, delay: 0.3 }} />
                  </div>
                  <span className="font-mono text-[11px] text-muted">
                    {t.progress}/{t.goal}
                  </span>
                </div>
              </motion.li>
            );
          })}
        </motion.ul>
      </div>
    </aside>
  );
}

type LapView = '3d' | 'analysis';

function MyLapViewer({ lap, handle, onClose }: { lap: UserLap; handle: string; onClose: () => void }) {
  const [view, setView] = useState<LapView>('3d');
  const race = RACES.find((r) => r.round === lap.round)!;
  const style = lapStyle(lap);
  // benchmark = the latest real pole at this venue; mock 2026 pole only if no real data exists
  const real = REAL_LAPS[lap.circuitId];
  const weekend = isCompleted(race) ? generateWeekend(race.round) : undefined;
  const ref = real
    ? { label: `Поул ${real.pole.year}`, code: real.pole.code, lapTime: real.pole.lapTime }
    : { label: `Поул ${SEASON}`, code: weekend?.qualifying[0].driverCode, lapTime: race.poleLapTime };
  const ghosts = real
    ? referenceGhosts(lap.circuitId, { pole: GHOST_POLE, record: GHOST_RECORD })
    : [{ label: ref.label, detail: ref.code, lapTime: ref.lapTime, color: GHOST_POLE }];

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 border-b border-white/10 bg-gradient-to-r from-f1-red/15 via-transparent to-transparent px-4 py-3 sm:px-5">
        <div className="mr-auto min-w-0 text-white">
          <div className="truncate text-[11px] font-bold uppercase tracking-[0.2em] text-white/50">Hot lap · {CIRCUITS[lap.circuitId].name}</div>
          <div className="display text-3xl">{formatLapTime(lap.lapTime)}</div>
        </div>
        <Segmented
          layoutKey="my-lap-view"
          value={view}
          onChange={setView}
          options={[
            { value: '3d', label: <><Box className="h-3.5 w-3.5" /> 3D-коло</> },
            { value: 'analysis', label: <><Activity className="h-3.5 w-3.5" /> Аналіз</> },
          ]}
        />
        <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white/80 transition hover:bg-f1-red hover:text-white" aria-label="Закрити">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2 sm:p-3">
      <AnimatePresence mode="wait">
        <motion.div key={view} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
          {view === '3d' ? (
            <LapSimulator
              circuitId={lap.circuitId}
              title={`${SEASON} ${CIRCUITS[lap.circuitId].location} · My hot lap`}
              runs={[
                { label: 'Твоє коло', detail: handle, lapTime: lap.lapTime, color: '#9a9da2', style },
                ...ghosts,
              ]}
            />
          ) : (
            <LapAnalysisPanel
              circuitId={lap.circuitId}
              myLapTime={lap.lapTime}
              myStyle={style}
              refLapTime={ref.lapTime}
              refLabel={`${ref.label}${ref.code ? ` · ${ref.code}` : ''} · ${formatLapTime(ref.lapTime)}`}
            />
          )}
        </motion.div>
      </AnimatePresence>
      </div>
    </>
  );
}
