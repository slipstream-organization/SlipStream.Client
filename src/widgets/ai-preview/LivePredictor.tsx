import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowDown, ArrowUp, Flag, Pause, Play, RotateCcw, TrendingUp } from 'lucide-react';
import { project, simulateLive } from './liveModel';
import { COMPOUND } from './racePrediction';
import { GeneratedBadge } from './AiPreview';
import { DRIVER_BY_CODE, TEAM_BY_ID } from '../../shared/mock/season';
import { DriverBadge } from '../../shared/ui/atoms';
import { cn } from '../../shared/lib/utils';

const HORIZON = 10;
const PAST = 8;
const SHOW = 10; // positions in the chart

interface Props {
  round: number;
  demo?: boolean;
}

export function LivePredictor({ round, demo }: Props) {
  const race = useMemo(() => simulateLive(round), [round]);
  const [lap, setLap] = useState(Math.min(12, race.laps - 1));
  const [playing, setPlaying] = useState(true);
  const [hover, setHover] = useState<string | null>(null);

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => setLap((l) => (l >= race.laps ? l : l + 1)), 1800);
    return () => window.clearInterval(id);
  }, [playing, race.laps]);

  const proj = useMemo(() => project(race, lap, HORIZON), [race, lap]);
  const order = useMemo(() => [...race.codes].sort((a, b) => race.pos[a][lap] - race.pos[b][lap]), [race, lap]);
  const leaderT = race.cum[order[0]][lap];
  const finished = lap >= race.laps;

  // insights: biggest projected movers within the horizon
  const insights = useMemo(() => {
    const h = Math.min(HORIZON, race.laps - lap);
    if (h <= 0) return [];
    return race.codes
      .map((c) => {
        const now = race.pos[c][lap];
        const then = proj.future[c][h - 1];
        const delta = now - then;
        const avgAge = (list: string[]) => list.reduce((a, x) => a + race.tyreAge[x][lap], 0) / Math.max(1, list.length);
        let reason: string;
        if (delta > 0) {
          // gaining: rivals ahead still have to stop, fresher tyres, or simply faster
          const ahead = order.slice(Math.max(0, then - 1), now - 1);
          const pending = ahead.filter((x) => proj.pendingStops[x] > proj.pendingStops[c]).length;
          const fresher = Math.round(avgAge(ahead) - race.tyreAge[c][lap]);
          reason =
            pending > 0
              ? `${pending} ${pending === 1 ? 'суперник попереду ще має' : 'суперники попереду ще мають'} піт-стоп`
              : fresher >= 5
                ? `шини свіжіші на ~${fresher} кіл — темп вищий`
                : 'швидший темп у поточному відрізку';
        } else {
          // losing: own stop still to come, older tyres, or slower pace
          const behind = order.slice(now, then);
          const older = Math.round(race.tyreAge[c][lap] - avgAge(behind));
          reason =
            proj.pendingStops[c] > 0
              ? 'попереду власний піт-стоп (~21 с втрат)'
              : older >= 5
                ? `шини старші на ~${older} кіл — темп падає`
                : 'суперники позаду швидші';
        }
        return { c, now, then, delta, reason, h };
      })
      .filter((x) => x.delta !== 0 && (x.delta > 0 ? x.then <= 10 : x.now <= 8))
      // risers into the top places first, then the biggest drops from the front
      .sort((a, b) => {
        const rise = Number(b.delta > 0) - Number(a.delta > 0);
        if (rise) return rise;
        // risers: best target position first; fallers: whoever drops from highest up first
        const key = a.delta > 0 ? a.then - b.then : a.now - b.now;
        return key || Math.abs(b.delta) - Math.abs(a.delta);
      })
      .slice(0, 3);
  }, [race, lap, proj, order]);

  const finishPodium = [...race.codes].sort((a, b) => proj.finish[a] - proj.finish[b]).slice(0, 3);
  const confidence = (c: string) => Math.max(0.35, Math.min(0.95, 0.5 + proj.finishGapToNext[c] / 12));

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <h2 className="display text-3xl">Live-прогноз</h2>
        <span className="flex items-center gap-1.5 rounded-full bg-f1-red px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-white">
          <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-white" /> {demo ? 'Демо' : 'Live'}
        </span>
        <GeneratedBadge note="Прогноз оновлюється щокола: очікуваний темп кожного пілота, знос шин і піт-стопи, які ще попереду. У демо-режимі гонка симульована — під час реальної гонки дані йтимуть з live-таймінгу." />
        <div className="ml-auto flex items-center gap-2">
          <div className="font-mono text-sm">
            Коло <b className="text-lg">{Math.min(lap, race.laps)}</b>
            <span className="text-muted">/{race.laps}</span>
          </div>
          <button type="button" onClick={() => setPlaying((p) => !p)} className="grid h-8 w-8 place-items-center rounded-full border border-line hover:border-f1-red" aria-label={playing ? 'Пауза' : 'Відтворити'}>
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <button type="button" onClick={() => setLap(1)} className="grid h-8 w-8 place-items-center rounded-full border border-line hover:border-f1-red" aria-label="Спочатку">
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="mb-4 h-1 overflow-hidden rounded-full bg-surface-2">
        <motion.div className="h-full bg-f1-red" animate={{ width: `${(lap / race.laps) * 100}%` }} transition={{ duration: 0.6 }} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        {/* live order */}
        <div className="card overflow-hidden">
          <div className="grid grid-cols-[28px_1fr_64px_44px_44px] gap-2 border-b border-line px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted">
            <span>Поз</span>
            <span>Пілот</span>
            <span className="text-right">Відрив</span>
            <span className="text-center">Шини</span>
            <span className="text-right">+{HORIZON} кіл</span>
          </div>
          <ul>
            <AnimatePresence initial={false}>
              {order.slice(0, 12).map((c) => {
                const d = DRIVER_BY_CODE[c];
                const p = race.pos[c][lap];
                const h = Math.min(HORIZON, race.laps - lap);
                const then = h > 0 ? proj.future[c][h - 1] : p;
                const delta = p - then;
                const comp = race.compound[c][lap];
                return (
                  <motion.li
                    key={c}
                    layout
                    transition={{ type: 'spring', stiffness: 380, damping: 34 }}
                    onMouseEnter={() => setHover(c)}
                    onMouseLeave={() => setHover(null)}
                    className={cn('grid grid-cols-[28px_1fr_64px_44px_44px] items-center gap-2 border-b border-line/50 px-3 py-1.5 text-sm last:border-0', hover === c && 'bg-surface-2')}
                  >
                    <span className="font-mono font-bold">{p}</span>
                    <Link to={`/drivers/${c}`} className="flex min-w-0 items-center gap-2 font-bold hover:text-f1-red">
                      <span className="h-5 w-1 rounded-full" style={{ background: TEAM_BY_ID[d.teamId].color }} />
                      <DriverBadge code={c} size={22} />
                      {c}
                      {race.pits[c].includes(lap) && <span className="rounded bg-ink px-1 text-[9px] text-bg">PIT</span>}
                    </Link>
                    <span className="text-right font-mono text-xs">{p === 1 ? 'Лідер' : `+${(race.cum[c][lap] - leaderT).toFixed(1)}`}</span>
                    <span className="flex items-center justify-center gap-1">
                      <span className="grid h-5 w-5 place-items-center rounded-full font-mono text-[9px] font-bold ring-1 ring-black/10" style={{ background: COMPOUND[comp].color, color: COMPOUND[comp].text }}>
                        {comp}
                      </span>
                      <span className="font-mono text-[10px] text-muted">{race.tyreAge[c][lap]}</span>
                    </span>
                    <span className={cn('flex items-center justify-end gap-0.5 font-mono text-xs font-bold', delta > 0 ? 'text-emerald-500' : delta < 0 ? 'text-f1-red' : 'text-muted')}>
                      {delta > 0 ? <ArrowUp className="h-3 w-3" /> : delta < 0 ? <ArrowDown className="h-3 w-3" /> : null}
                      {delta === 0 ? '—' : Math.abs(delta)}
                    </span>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <BumpChart race={race} lap={lap} proj={proj} hover={hover} setHover={setHover} />

          <div className="grid gap-3 md:grid-cols-[1.4fr_1fr]">
            {/* insights */}
            <div className="grid gap-2">
              {finished ? (
                <div className="card flex items-center gap-3 p-4">
                  <Flag className="h-5 w-5 text-f1-red" /> Фініш! Переможець — <b>{order[0]}</b>.
                </div>
              ) : (
                insights.map((x) => {
                  const d = DRIVER_BY_CODE[x.c];
                  return (
                    <motion.div key={`${x.c}-${lap}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="card flex items-center gap-3 p-3" onMouseEnter={() => setHover(x.c)} onMouseLeave={() => setHover(null)}>
                      <DriverBadge code={x.c} size={36} />
                      <div className="min-w-0 flex-1 text-sm">
                        <div className="font-bold">
                          {d.lastName}: P{x.now} → <span className={x.delta > 0 ? 'text-emerald-500' : 'text-f1-red'}>P{x.then}</span>
                          <span className="font-normal text-muted"> через ~{x.h} кіл</span>
                        </div>
                        <div className="truncate text-xs text-muted">{x.reason}</div>
                      </div>
                      <TrendingUp className={cn('h-5 w-5 shrink-0', x.delta > 0 ? 'text-emerald-500' : 'rotate-180 text-f1-red')} />
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* projected finish */}
            <div className="card p-4">
              <div className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted">Прогноз фінішу</div>
              <ol className="space-y-2">
                {finishPodium.map((c, i) => (
                  <li key={c} className="flex items-center gap-2">
                    <span className="display w-6 text-xl">{i + 1}</span>
                    <DriverBadge code={c} size={28} />
                    <span className="font-bold">{c}</span>
                    <span className="ml-auto flex items-center gap-2">
                      <span className="h-1.5 w-14 overflow-hidden rounded-full bg-surface-2">
                        <motion.span className="block h-full rounded-full bg-violet-500" animate={{ width: `${confidence(c) * 100}%` }} />
                      </span>
                      <span className="w-9 text-right font-mono text-xs">{Math.round(confidence(c) * 100)}%</span>
                    </span>
                  </li>
                ))}
              </ol>
              <div className="mt-3 text-[10px] text-muted">впевненість = запас часу до наступного суперника</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Positions over laps: solid = what happened, dashed = what the model expects next. */
function BumpChart({
  race,
  lap,
  proj,
  hover,
  setHover,
}: {
  race: ReturnType<typeof simulateLive>;
  lap: number;
  proj: ReturnType<typeof project>;
  hover: string | null;
  setHover: (c: string | null) => void;
}) {
  const W = 720, H = 300, padL = 34, padR = 52, padT = 14, padB = 26;
  const from = Math.max(0, lap - PAST);
  const to = Math.min(race.laps, lap + HORIZON);
  const x = (l: number) => padL + ((l - from) / Math.max(1, to - from)) * (W - padL - padR);
  const y = (p: number) => padT + ((p - 1) / (SHOW - 1)) * (H - padT - padB - 8);

  // drivers in the top 10 now or projected into it
  const shown = race.codes.filter((c) => race.pos[c][lap] <= SHOW || proj.future[c].some((p) => p <= SHOW));

  return (
    <div className="card p-3">
      <div className="mb-1 flex items-center justify-between px-1 text-[11px] text-muted">
        <span className="font-bold uppercase tracking-wider">Позиції: факт і прогноз</span>
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1"><span className="h-0.5 w-5 bg-ink" />факт</span>
          <span className="flex items-center gap-1"><span className="h-0 w-5 border-t-2 border-dashed border-ink" />прогноз</span>
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full">
        <defs>
          <clipPath id={`bump-${race.laps}`}>
            <rect x={padL - 6} y={padT - 8} width={W - padL - padR + 60} height={H - padT - padB + 2} />
          </clipPath>
        </defs>
        {Array.from({ length: SHOW }, (_, i) => (
          <g key={i}>
            <line x1={padL} x2={W - padR} y1={y(i + 1)} y2={y(i + 1)} stroke="currentColor" className="text-line" strokeWidth={1} />
            <text x={padL - 8} y={y(i + 1) + 4} textAnchor="end" className="fill-current font-mono text-muted" fontSize={10}>
              P{i + 1}
            </text>
          </g>
        ))}
        <rect x={x(lap)} y={padT - 6} width={W - padR - x(lap)} height={H - padT - padB + 12} className="fill-violet-500/5" />
        <line x1={x(lap)} x2={x(lap)} y1={padT - 6} y2={H - padB + 6} stroke="#e10600" strokeWidth={1.5} />
        <text x={x(lap)} y={H - 6} textAnchor="middle" fontSize={10} className="fill-current font-mono font-bold">
          зараз · L{lap}
        </text>
        <text x={x(to)} y={H - 6} textAnchor="end" fontSize={10} className="fill-current font-mono text-muted">
          L{to}
        </text>

        {shown.map((c) => {
          const color = TEAM_BY_ID[DRIVER_BY_CODE[c].teamId].color;
          const past: string[] = [];
          for (let l = from; l <= lap; l++) past.push(`${x(l).toFixed(1)},${y(race.pos[c][l]).toFixed(1)}`);
          const fut = [`${x(lap).toFixed(1)},${y(race.pos[c][lap]).toFixed(1)}`];
          proj.future[c].slice(0, to - lap).forEach((p, i) => fut.push(`${x(lap + i + 1).toFixed(1)},${y(p).toFixed(1)}`));
          const dim = hover !== null && hover !== c;
          const endP = proj.future[c][to - lap - 1] ?? race.pos[c][lap];
          return (
            <g key={c} clipPath={`url(#bump-${race.laps})`} opacity={dim ? 0.15 : 1} onMouseEnter={() => setHover(c)} onMouseLeave={() => setHover(null)} className="cursor-pointer transition-opacity">
              <polyline points={past.join(' ')} fill="none" stroke={color} strokeWidth={hover === c ? 3.5 : 2.2} strokeLinejoin="round" />
              <polyline points={fut.join(' ')} fill="none" stroke={color} strokeWidth={hover === c ? 3.5 : 2.2} strokeDasharray="5 4" strokeLinejoin="round" />
              <circle cx={x(lap)} cy={y(race.pos[c][lap])} r={4} fill={color} stroke="white" strokeWidth={1.5} />
              {endP <= SHOW && (
                <text x={W - padR + 6} y={y(endP) + 4} fontSize={11} fontWeight={700} className="fill-current font-mono">
                  {c}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
