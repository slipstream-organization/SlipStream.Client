import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown, ChevronRight, LineChart, Table2 } from 'lucide-react';
import { driverPhoto, teamCar } from '../../shared/lib/media';
import { TeamStatsPanel } from '../../widgets/driver-stats/TeamStatsPanel';
import { api } from '../../shared/api';
import { useData } from '../../shared/lib/useData';
import { DRIVERS, DRIVER_BY_CODE, SEASON, TEAMS, TEAM_BY_ID } from '../../shared/mock/season';
import type { StandingRow, StandingsHistory, TeamId } from '../../shared/model/types';
import { DriverBadge, Flag, Segmented } from '../../shared/ui/atoms';
import { SkeletonRows } from '../../shared/ui/Skeleton';
import { StateBlock } from '../../shared/ui/StateBlock';
import { Button } from '../../shared/ui/Button';
import { StandingsChart, type ChartSeries } from '../../widgets/standings-chart/StandingsChart';
import { cn } from '../../shared/lib/utils';
import { onColor } from '../../shared/lib/color';
import { RollingNumber } from '../../shared/ui/RollingNumber';

type Kind = 'drivers' | 'constructors';
type View = 'table' | 'chart';
type Mode = 'points' | 'positions';

export function StandingsPage() {
  const [kind, setKind] = useState<Kind>('drivers');
  const [view, setView] = useState<View>('table');
  const [mode, setMode] = useState<Mode>('points');
  const drivers = useData(api.driverStandings);
  const teams = useData(api.constructorStandings);
  const current = kind === 'drivers' ? drivers.data : teams.data;

  return (
    <div className="mx-auto max-w-7xl px-4 pt-10 md:px-6">
      <div className="mb-8">
        <div className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-accent-ink">{SEASON} Standings</div>
        <h1 className="display text-5xl md:text-7xl">Таблиця лідерів</h1>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Segmented
          layoutKey="st-kind"
          value={kind}
          onChange={setKind}
          options={[
            { value: 'drivers', label: 'Пілоти' },
            { value: 'constructors', label: 'Конструктори' },
          ]}
        />
        <Segmented
          layoutKey="st-view"
          value={view}
          onChange={setView}
          options={[
            { value: 'table', label: <><Table2 className="h-3.5 w-3.5" /> Таблиця</> },
            { value: 'chart', label: <><LineChart className="h-3.5 w-3.5" /> Графік</> },
          ]}
        />
        <AnimatePresence>
          {view === 'chart' && (
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
              <Segmented
                layoutKey="st-mode"
                size="sm"
                value={mode}
                onChange={setMode}
                options={[
                  { value: 'points', label: 'Очки' },
                  { value: 'positions', label: 'Позиції' },
                ]}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {!current ? (
        (kind === 'drivers' ? drivers : teams).error ? (
          <StateBlock
            kind="error"
            title="Не вдалося завантажити таблицю"
            description="Перевірте з'єднання й повторіть спробу."
            action={<Button onClick={(kind === 'drivers' ? drivers : teams).reload}>Спробувати ще раз</Button>}
          />
        ) : (
          <div className="card p-4 md:p-6">
            <SkeletonRows rows={10} />
          </div>
        )
      ) : (
        <AnimatePresence mode="wait">
          <motion.div key={`${kind}-${view}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            {view === 'table' ? (
              kind === 'drivers' ? <DriversTable rows={current.table} /> : <TeamsTable rows={current.table} />
            ) : (
              <ChartView kind={kind} history={current.history} table={current.table} mode={mode} />
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}

/**
 * Leader poster: the team colour is the field. Drivers: the portrait on the left, number behind it.
 * Constructors: the car is part of the background — it drives in
 * from the left edge under a colour wash, so the name and the points always sit on clean colour.
 */
function Leader({ row, kind }: { row: StandingRow; kind: Kind }) {
  const teamId = kind === 'drivers' ? DRIVER_BY_CODE[row.id].teamId : (row.id as TeamId);
  const color = TEAM_BY_ID[teamId].color;
  const fg = onColor(color);
  const name = kind === 'drivers' ? `${DRIVER_BY_CODE[row.id].firstName} ${DRIVER_BY_CODE[row.id].lastName}` : TEAM_BY_ID[teamId].fullName;
  const driver = kind === 'drivers' ? DRIVER_BY_CODE[row.id] : undefined;
  return (
    <div className="relative isolate mb-6 overflow-hidden" style={{ background: color, color: fg }}>
      {driver ? (
        <>
          {/* drivers: the leader's racing number big behind an untinted portrait on the left */}
          <span aria-hidden className="display-wide pointer-events-none absolute -top-[0.12em] left-0 -z-10 select-none text-[clamp(9rem,22vw,17rem)] leading-none opacity-[0.16]">
            {driver.number}
          </span>
          <motion.img decoding="async"
            src={driverPhoto(driver.code, '4col')}
            alt=""
            aria-hidden
            onError={(e) => (e.currentTarget.style.display = 'none')}
            initial={{ opacity: 0, x: '-8%' }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-none absolute bottom-0 left-[2%] -z-10 h-[78%] object-contain object-bottom sm:left-[6%] sm:h-[104%] lg:left-[12%]"
          />
          {/* legibility only: on phones the colour rises under the text; wider, the text has its own clean half */}
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 sm:hidden" style={{ background: `linear-gradient(to top, ${color} 42%, transparent 72%)` }} />
        </>
      ) : (
        <>
          {/* constructors: the car as backdrop, anchored to the left edge and partly out of frame, driving in */}
          <motion.img decoding="async"
            src={teamCar(teamId, 400)}
            alt=""
            aria-hidden
            onError={(e) => (e.currentTarget.style.display = 'none')}
            initial={{ opacity: 0, x: '-18%' }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-none absolute -left-[22%] top-1/2 -z-10 w-[95%] max-w-none -translate-y-1/2 sm:-left-[14%] sm:w-[78%] lg:-left-[8%] lg:w-[64%]"
          />
          {/* colour mask: tints the car, then becomes solid colour under the text */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10"
            style={{ background: `linear-gradient(90deg, color-mix(in srgb, ${color} 35%, transparent) 0%, color-mix(in srgb, ${color} 60%, transparent) 32%, ${color} 58%)` }}
          />
          <span aria-hidden className="display-wide pointer-events-none absolute -bottom-[0.18em] right-2 -z-10 select-none text-[clamp(8rem,20vw,15rem)] leading-none opacity-[0.12]">
            1
          </span>
        </>
      )}

      <div className="relative ml-auto flex min-h-[240px] w-full flex-col justify-end gap-4 p-6 sm:w-[62%] md:p-8 lg:w-[48%]">
        <div>
          <p className="text-sm font-semibold opacity-80">Лідер чемпіонату {kind === 'drivers' ? 'пілотів' : 'конструкторів'}</p>
          <h2 className="display mt-1 text-3xl md:text-4xl">{name}</h2>
          <p className="tnum mt-2 flex flex-wrap gap-x-4 text-sm font-semibold opacity-85">
            <span>{row.wins} перемог</span>
            <span>{row.podiums} подіумів</span>
          </p>
        </div>
        <div className="flex items-baseline gap-3 border-t border-current/25 pt-3">
          <RollingNumber value={row.points} className="text-5xl font-bold md:text-6xl" />
          <span className="text-sm font-semibold opacity-80">очок</span>
        </div>
      </div>
    </div>
  );
}

function PointsBar({ value, max, color, delay }: { value: number; max: number; color: string; delay: number }) {
  return (
    <div className="hidden h-1.5 w-40 overflow-hidden rounded-full bg-surface-2 md:block">
      <motion.div className="h-full rounded-full" style={{ background: color, width: `${(value / (max || 1)) * 100}%`, transformOrigin: 'left' }} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.9, delay, ease: 'easeOut' }} />
    </div>
  );
}

function DriversTable({ rows }: { rows: StandingRow[] }) {
  const max = rows[0]?.points ?? 1;
  return (
    <>
      {rows[0] && <Leader row={rows[0]} kind="drivers" />}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted">Натисни на пілота, щоб відкрити його сторінку: статистика, біографія, новини</p>
        <Link to="/championship" className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-accent-ink hover:underline">
          Хто ще може стати чемпіоном <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="card overflow-hidden">
        {rows.map((r, i) => {
          const d = DRIVER_BY_CODE[r.id];
          const team = TEAM_BY_ID[d.teamId];
          return (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.025 }}
              className="border-b border-line/60 last:border-0"
            >
              <Link to={`/drivers/${r.id}`} className="group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2 md:gap-5">
                <span className={cn('w-7 font-mono text-lg font-bold', i < 3 ? 'text-ink' : 'text-muted')}>{r.position}</span>
                <span className="h-9 w-1 rounded-full transition-all group-hover:w-1.5" style={{ background: team.color }} />
                <DriverBadge code={r.id} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 font-bold">
                    <span className="hidden sm:inline">{d.firstName}</span>
                    <span className="uppercase transition-colors group-hover:text-accent-ink">{d.lastName}</span>
                    <Flag code={d.country} className="h-4 w-4 ring-1" />
                    {d.rookie && <span className="rounded bg-surface-2 px-1.5 text-xs font-bold uppercase text-muted">rookie</span>}
                  </div>
                  <div className="text-xs text-muted">{team.name}</div>
                </div>
                <div className="hidden w-24 text-center font-mono text-xs text-muted sm:block">
                  {r.wins}W · {r.podiums}P
                </div>
                <PointsBar value={r.points} max={max} color={team.color} delay={i * 0.03} />
                <span className="w-14 text-right font-mono text-lg font-bold">{r.points}</span>
                <ChevronRight className="h-4 w-4 text-muted transition group-hover:translate-x-0.5 group-hover:text-accent-ink" />
              </Link>
            </motion.div>
          );
        })}
      </div>
    </>
  );
}

function TeamsTable({ rows }: { rows: StandingRow[] }) {
  const max = rows[0]?.points ?? 1;
  const [open, setOpen] = useState<string | null>(null);
  return (
    <>
      {rows[0] && <Leader row={rows[0]} kind="constructors" />}
      <p className="mb-2 text-xs text-muted">Натисни на команду, щоб побачити статистику сезону та історію</p>
      <div className="card overflow-hidden">
        {rows.map((r, i) => {
          const t = TEAM_BY_ID[r.id as TeamId];
          const pair = DRIVERS.filter((d) => d.teamId === t.id);
          const isOpen = open === r.id;
          return (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className="border-b border-line/60 last:border-0"
            >
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : r.id)}
                className={cn('group flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-surface-2 md:gap-5', isOpen && 'bg-surface-2')}
              >
                <span className={cn('w-7 font-mono text-lg font-bold', i < 3 ? 'text-ink' : 'text-muted')}>{r.position}</span>
                <span className="h-10 w-1 rounded-full transition-all group-hover:w-1.5" style={{ background: t.color }} />
                <div className="min-w-0 flex-1">
                  <div className="font-bold">{t.name}</div>
                  <div className="truncate text-xs text-muted">{pair.map((d) => d.lastName).join(' · ')}</div>
                </div>
                <div className="hidden -space-x-2 sm:flex">
                  {pair.map((d) => (
                    <DriverBadge key={d.code} code={d.code} size={30} className="ring-2 ring-surface" />
                  ))}
                </div>
                <PointsBar value={r.points} max={max} color={t.color} delay={i * 0.04} />
                <span className="w-14 text-right font-mono text-lg font-bold">{r.points}</span>
                <motion.span animate={{ rotate: isOpen ? 180 : 0 }} className="text-muted group-hover:text-ink">
                  <ChevronDown className="h-4 w-4" />
                </motion.span>
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    key="stats"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, transition: { duration: 0.15 } }}
                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <TeamStatsPanel id={t.id} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </>
  );
}

function ChartView({ kind, history, table, mode }: { kind: Kind; history: StandingsHistory; table: StandingRow[]; mode: Mode }) {
  const allSeries: ChartSeries[] = useMemo(() => {
    if (kind === 'constructors') return TEAMS.map((t) => ({ id: t.id, label: t.name, color: t.color }));
    const seen = new Set<TeamId>();
    return DRIVERS.map((d) => {
      const dashed = seen.has(d.teamId); // second driver of a team gets a dashed line
      seen.add(d.teamId);
      return { id: d.code, label: d.code, color: TEAM_BY_ID[d.teamId].color, dashed };
    });
  }, [kind]);

  const [selected, setSelected] = useState<string[]>(() => table.slice(0, kind === 'drivers' ? 6 : 5).map((r) => r.id));
  const shown = allSeries.filter((s) => selected.includes(s.id));
  const toggle = (id: string) => setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  if (history.rounds.length === 0) return <div className="card p-10 text-center text-muted">Ще не було жодної гонки</div>;

  return (
    <div className="card p-4 md:p-6">
      <div className="mb-4 flex flex-wrap gap-1.5">
        {table.map((r) => {
          const s = allSeries.find((x) => x.id === r.id)!;
          const on = selected.includes(r.id);
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => toggle(r.id)}
              className={cn('flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold transition', on ? 'border-transparent bg-surface-2 text-ink' : 'border-line text-muted hover:text-ink')}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: on ? s.color : 'transparent', boxShadow: `inset 0 0 0 1.5px ${s.color}` }} />
              {kind === 'drivers' ? r.id : TEAM_BY_ID[r.id as TeamId].name}
            </button>
          );
        })}
        <button type="button" onClick={() => setSelected([])} className="px-2 text-xs font-bold uppercase text-muted hover:text-accent-ink">
          Очистити
        </button>
      </div>
      <StandingsChart history={history} series={shown} mode={mode} maxPosition={allSeries.length} />
      <p className="mt-3 text-xs text-muted">
        {mode === 'points' ? 'Накопичені очки після кожного етапу.' : 'Позиція в чемпіонаті після кожного етапу.'} Другий пілот команди — пунктирна лінія.
      </p>
    </div>
  );
}
