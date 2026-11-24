import { Fragment, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import type { RaceReport, RaceWeekendResult } from '../../shared/model/types';
import { DRIVER_BY_CODE, TEAM_BY_ID } from '../../shared/mock/season';
import { cn, formatLapTime } from '../../shared/lib/utils';
import { StintBar } from './tyres';
import { dim, useFocus } from './focus';

const COLS = 'grid-cols-[2rem_1fr_auto_2rem_1.25rem] md:grid-cols-[2.5rem_2.75rem_minmax(0,1fr)_6.5rem_8rem_3rem_3rem_3rem_1.25rem]';

/** Position trace of one driver over the race, for the classification rows. */
function Spark({ positions, total, color }: { positions: (number | null)[]; total: number; color: string }) {
  const pts = positions.map((p, i) => (p === null ? null : [(i / (positions.length - 1)) * 100, ((p - 0.5) / total) * 100] as const));
  let d = '';
  let pen = false;
  for (const p of pts) {
    if (!p) {
      pen = false;
      continue;
    }
    d += `${pen ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`;
    pen = true;
  }
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-6 w-full" aria-hidden>
      <path d={d} fill="none" stroke={color} strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * The classification as a timing tower: position, places gained, team colour, driver, the race in
 * a sparkline, time or gap, laps, stops, points. Rows expand into the driver's race — strategy,
 * best lap, speed trap, stops — and hovering a row highlights the driver across the page.
 */
export function Classification({ result, report }: { result: RaceWeekendResult; report: RaceReport }) {
  const [open, setOpen] = useState<string | null>(null);
  const { active, hover } = useFocus();
  const fastest = report.fastestLaps[0];

  return (
    <div className="overflow-hidden rounded-md border border-line bg-surface">
      <div className={cn('grid items-center gap-x-3 border-b border-line px-3 py-2 text-sm text-muted md:px-4', COLS)}>
        <span>Поз.</span>
        <span className="hidden md:block">±</span>
        <span>Пілот</span>
        <span className="hidden md:block">Гонка</span>
        <span className="text-right">Час</span>
        <span className="hidden text-right md:block">Кола</span>
        <span className="hidden text-right md:block">Піти</span>
        <span className="text-right">Очки</span>
        <span />
      </div>
      <ol>
        {result.race.map((r) => {
          const d = DRIVER_BY_CODE[r.driverCode];
          const team = TEAM_BY_ID[d.teamId];
          const gained = r.position ? r.grid - r.position : 0;
          const stops = report.pitStops.filter((p) => p.driverCode === r.driverCode);
          const isOpen = open === r.driverCode;
          const best = report.fastestLaps.find((f) => f.driverCode === r.driverCode);
          const speed = report.speedTrap.find((s) => s.driverCode === r.driverCode);
          const panel = `row-${r.driverCode}`;
          return (
            <li key={r.driverCode} className="border-b border-line last:border-0" style={{ opacity: dim(active, r.driverCode, 0.55), transition: 'opacity 150ms ease-out' }}>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={panel}
                onClick={() => setOpen(isOpen ? null : r.driverCode)}
                onMouseEnter={() => hover(r.driverCode)}
                onMouseLeave={() => hover(null)}
                onFocus={() => hover(r.driverCode)}
                onBlur={() => hover(null)}
                className={cn('grid min-h-12 w-full items-center gap-x-3 px-3 py-2 text-left hover:bg-surface-2 md:px-4', COLS, isOpen && 'bg-surface-2')}
              >
                <span className={cn('digits text-lg font-bold', r.position === null && 'text-base text-accent-ink')}>{r.position ?? 'DNF'}</span>
                <span className={cn('hidden text-sm font-semibold tnum md:block', gained > 0 ? 'text-positive' : gained < 0 ? 'text-accent-ink' : 'text-muted')}>
                  {r.position === null ? '' : gained > 0 ? `▲${gained}` : gained < 0 ? `▼${-gained}` : '—'}
                </span>
                <span className="flex min-w-0 items-center gap-3">
                  <span aria-hidden className="h-7 w-1 shrink-0" style={{ background: team.color }} />
                  <span className="min-w-0 leading-tight">
                    <span className="block truncate font-semibold">
                      <span className="hidden sm:inline">{d.firstName} </span>
                      {d.lastName}
                      {r.fastestLap && (
                        <span className="ml-2 inline-flex items-center rounded-sm bg-fastest px-1.5 align-[1px] text-xs font-bold text-white">
                          FL<span className="sr-only"> — найшвидше коло</span>
                        </span>
                      )}
                    </span>
                    <span className="block truncate text-sm text-muted">{team.name}</span>
                  </span>
                </span>
                <span className="hidden md:block">
                  <Spark positions={report.positions[r.driverCode]} total={result.race.length} color={team.color} />
                </span>
                <span className="text-right leading-tight">
                  <span className="block digits font-semibold">{r.position === null ? `Коло ${r.laps}` : r.time}</span>
                  {r.position === null && <span className="block text-sm text-muted">{report.dnfReasons[r.driverCode]}</span>}
                </span>
                <span className="hidden text-right tnum md:block">{r.laps}</span>
                <span className="hidden text-right tnum md:block">{stops.length}</span>
                <span className="text-right digits font-bold">{r.points || ''}</span>
                <ChevronDown aria-hidden className={cn('h-4 w-4 text-muted motion-safe:transition-transform motion-safe:duration-200', isOpen && 'rotate-180')} />
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    id={panel}
                    role="region"
                    aria-label={`Гонка: ${d.firstName} ${d.lastName}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="grid gap-5 bg-surface-2 px-3 pb-5 pt-2 md:grid-cols-[2fr_1fr_1fr_1fr] md:px-4"
                  >
                    <div>
                      <p className="text-sm text-muted">Стратегія</p>
                      <StintBar className="mt-2" stints={report.stints.filter((s) => s.driverCode === r.driverCode)} laps={report.laps} />
                      <p className="mt-2 text-sm text-muted">
                        Старт з P{r.grid}
                        {r.position === null ? `, зійшов на колі ${r.laps}` : `, фініш P${r.position}`}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted">Найкраще коло</p>
                      {best ? (
                        <p className={cn('digits mt-1 text-lg font-bold', fastest?.driverCode === r.driverCode && 'text-fastest')}>
                          {formatLapTime(best.time)} <span className="text-sm font-normal text-muted">коло {best.lap}</span>
                        </p>
                      ) : (
                        <p className="mt-1">—</p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-muted">Спідтрап</p>
                      <p className="digits mt-1 text-lg font-bold">{speed ? `${speed.kmh} км/год` : '—'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted">Піт-стопи</p>
                      {stops.length ? (
                        <ul className="mt-1 space-y-0.5 text-sm tnum">
                          {stops.map((p) => (
                            <Fragment key={p.lap}>
                              <li>
                                Коло {p.lap}: <b>{p.stationary.toFixed(1)} с</b>
                              </li>
                            </Fragment>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-1 text-sm">Без зупинок</p>
                      )}
                      <Link to={`/drivers/${r.driverCode}`} className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold underline decoration-accent decoration-2 underline-offset-4">
                        Відкрити профіль пілота
                      </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
