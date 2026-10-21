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
import { DriverBadge, Flag, Loader, Segmented } from '../../shared/ui/atoms';
import { StandingsChart, type ChartSeries } from '../../widgets/standings-chart/StandingsChart';
import { cn } from '../../shared/lib/utils';

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
        <div className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-f1-red">{SEASON} Standings</div>
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
        <Loader />
      ) : (
        <AnimatePresence mode="wait">
          <motion.div key={`${kind}-${view}`} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
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

function Leader({ row, kind }: { row: StandingRow; kind: Kind }) {
  const color = kind === 'drivers' ? TEAM_BY_ID[DRIVER_BY_CODE[row.id].teamId].color : TEAM_BY_ID[row.id as TeamId].color;
  const name = kind === 'drivers' ? `${DRIVER_BY_CODE[row.id].firstName} ${DRIVER_BY_CODE[row.id].lastName}` : TEAM_BY_ID[row.id as TeamId].fullName;
  return (
    <div className="relative mb-4 overflow-hidden rounded-[14px] p-6 text-black" style={{ background: `linear-gradient(110deg, ${color}, ${color}aa 60%, ${color}55)` }}>
      <div className="absolute -right-4 -top-8 font-sport text-[180px] font-black italic leading-none text-black/10">1</div>
      <motion.img
        src={kind === 'drivers' ? driverPhoto(row.id, '4col') : teamCar(row.id as TeamId, 320)}
        alt=""
        onError={(e) => (e.currentTarget.style.display = 'none')}
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          'pointer-events-none absolute hidden drop-shadow-[0_10px_20px_rgba(0,0,0,0.35)] md:block',
          kind === 'drivers' ? 'bottom-0 right-44 h-[115%] object-contain object-bottom' : 'right-40 top-1/2 h-[85%] -translate-y-1/2',
        )}
      />
      <div className="relative flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.25em] text-black/60">Лідер чемпіонату</div>
          <div className="display mt-1 text-4xl md:text-5xl">{name}</div>
          <div className="mt-2 flex gap-4 font-mono text-sm text-black/70">
            <span>{row.wins} перемог</span>
            <span>{row.podiums} подіумів</span>
          </div>
        </div>
        <div className="text-right">
          <div className="display text-6xl">{row.points}</div>
          <div className="text-xs font-bold uppercase tracking-widest text-black/60">очок</div>
        </div>
      </div>
    </div>
  );
}

function PointsBar({ value, max, color, delay }: { value: number; max: number; color: string; delay: number }) {
  return (
    <div className="hidden h-1.5 w-40 overflow-hidden rounded-full bg-surface-2 md:block">
      <motion.div className="h-full rounded-full" style={{ background: color }} initial={{ width: 0 }} animate={{ width: `${(value / (max || 1)) * 100}%` }} transition={{ duration: 0.9, delay, ease: 'easeOut' }} />
    </div>
  );
}

function DriversTable({ rows }: { rows: StandingRow[] }) {
  const max = rows[0]?.points ?? 1;
  return (
    <>
      {rows[0] && <Leader row={rows[0]} kind="drivers" />}
      <p className="mb-2 text-xs text-muted">Натисни на пілота, щоб відкрити його сторінку: статистика, біографія, новини</p>
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
                    <span className="uppercase transition-colors group-hover:text-f1-red">{d.lastName}</span>
                    <Flag code={d.country} className="h-4 w-4 ring-1" />
                    {d.rookie && <span className="rounded bg-surface-2 px-1.5 text-[10px] font-bold uppercase text-muted">rookie</span>}
                  </div>
                  <div className="text-xs text-muted">{team.name}</div>
                </div>
                <div className="hidden w-24 text-center font-mono text-xs text-muted sm:block">
                  {r.wins}W · {r.podiums}P
                </div>
                <PointsBar value={r.points} max={max} color={team.color} delay={i * 0.03} />
                <span className="w-14 text-right font-mono text-lg font-bold">{r.points}</span>
                <ChevronRight className="h-4 w-4 text-muted transition group-hover:translate-x-0.5 group-hover:text-f1-red" />
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
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
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
        <button type="button" onClick={() => setSelected([])} className="px-2 text-xs font-bold uppercase text-muted hover:text-f1-red">
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
