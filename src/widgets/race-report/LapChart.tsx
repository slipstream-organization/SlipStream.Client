import { useMemo, useRef, useState, type PointerEvent } from 'react';
import { motion } from 'motion/react';
import type { RaceReport } from '../../shared/model/types';
import { DRIVERS, DRIVER_BY_CODE, TEAM_BY_ID } from '../../shared/mock/season';
import { cn } from '../../shared/lib/utils';
import { dim, useFocus } from './focus';

/** Second driver of each team gets a dashed line, as on TV lap charts. */
const DASHED = new Set<string>();
{
  const teams = new Set<string>();
  for (const d of DRIVERS) {
    if (teams.has(d.teamId)) DASHED.add(d.code);
    else teams.add(d.teamId);
  }
}

/**
 * Positions of every driver lap by lap — the race in one picture.
 * Lines in team colours, the winner (or the focused driver) bold; safety-car laps shaded.
 * Hover picks the driver under the pointer, click pins; the finish labels are buttons for keyboard use.
 */
export function LapChart({ report, order, className }: { report: RaceReport; order: string[]; className?: string }) {
  const { active, pinned, hover, toggle } = useFocus();
  const box = useRef<HTMLDivElement>(null);
  const [cursor, setCursor] = useState<{ lap: number; code: string; pos: number } | null>(null);
  const N = report.laps;
  const P = order.length;
  const winner = order[0];
  const lead = active ?? winner;

  const x = (lap: number) => (lap / N) * 1000;
  const y = (pos: number) => ((pos - 0.5) / P) * 1000;

  const paths = useMemo(
    () =>
      Object.fromEntries(
        order.map((c) => {
          const pos = report.positions[c];
          let d = '';
          let pen = false;
          pos.forEach((p, lap) => {
            if (p === null) return void (pen = false);
            d += `${pen ? 'L' : 'M'}${x(lap).toFixed(1)},${y(p).toFixed(1)}`;
            pen = true;
          });
          return [c, d];
        }),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [report, order],
  );

  // where each line ends: finish position, or the retirement point
  const finish = (c: string) => {
    const pos = report.positions[c];
    const last = pos.length - 1 - [...pos].reverse().findIndex((p) => p !== null);
    return { lap: last, pos: pos[last]!, retired: last < N };
  };

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const r = box.current!.getBoundingClientRect();
    const lap = Math.max(0, Math.min(N, Math.round(((e.clientX - r.left) / r.width) * N)));
    const pos = Math.max(1, Math.min(P, Math.ceil(((e.clientY - r.top) / r.height) * P)));
    const code = order.find((c) => report.positions[c][lap] === pos);
    if (!code) return;
    setCursor({ lap, code, pos });
    hover(code);
  };
  const onLeave = () => {
    setCursor(null);
    hover(null);
  };

  const ticks = Array.from({ length: Math.floor(N / 10) }, (_, i) => (i + 1) * 10);

  return (
    <figure className={cn('select-none', className)} aria-label={`Позиції пілотів по колах, ${N} кіл`}>
      <div className="grid grid-cols-[1fr_4.25rem] gap-x-2 sm:grid-cols-[2.25rem_1fr_4.75rem]">
        {/* grid order */}
        <div className="relative hidden sm:block" aria-hidden>
          {order.map((c) => (
            <span
              key={c}
              className="absolute right-0 -translate-y-1/2 text-[0.75rem] font-semibold tnum transition-opacity duration-150"
              style={{ top: `${(y(report.positions[c][0]!) / 10).toFixed(2)}%`, opacity: dim(active, c, 0.3) }}
            >
              {c}
            </span>
          ))}
        </div>

        {/* the chart */}
        <div
          ref={box}
          className="relative h-[300px] cursor-crosshair touch-none sm:h-[400px] lg:h-[460px]"
          onPointerMove={onMove}
          onPointerLeave={onLeave}
          onClick={() => cursor && toggle(cursor.code)}
        >
          {/* safety car / VSC bands */}
          {report.neutralisations.map((n) => (
            <div
              key={n.fromLap}
              className="absolute inset-y-0 bg-sector-yellow/12"
              style={{ left: `${(x(n.fromLap - 1) / 10).toFixed(2)}%`, width: `${((x(n.toLap) - x(n.fromLap - 1)) / 10).toFixed(2)}%` }}
            >
              <span className="absolute -top-6 left-1 text-xs font-semibold text-muted">{n.kind === 'sc' ? 'SC' : 'VSC'}</span>
            </div>
          ))}
          {/* lap ticks */}
          {ticks.map((t) => (
            <div key={t} className="absolute inset-y-0 w-px bg-line" style={{ left: `${(x(t) / 10).toFixed(2)}%` }} aria-hidden />
          ))}

          <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
            <defs>
              <clipPath id="lapchart-reveal">
                <motion.rect
                  x="-20"
                  y="-20"
                  width="1040"
                  height="1040"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
                  style={{ transformBox: 'fill-box', transformOrigin: 'left center' }}
                />
              </clipPath>
            </defs>
            <g clipPath="url(#lapchart-reveal)">
              {/* quiet lines first, the highlighted one last so it sits on top */}
              {[...order.filter((c) => c !== lead), lead].map((c) => {
                const team = TEAM_BY_ID[DRIVER_BY_CODE[c].teamId];
                const on = c === lead;
                return (
                  <path
                    key={c}
                    d={paths[c]}
                    fill="none"
                    stroke={team.color}
                    strokeWidth={on ? 3.5 : 1.6}
                    strokeDasharray={DASHED.has(c) && !on ? '7 4' : undefined}
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                    style={{ opacity: on ? 1 : active ? 0.12 : 0.45, transition: 'opacity 150ms ease-out' }}
                  />
                );
              })}
              {/* pit stops of the highlighted driver */}
              {report.pitStops
                .filter((p) => p.driverCode === lead)
                .map((p) => {
                  const pos = report.positions[lead][p.lap];
                  return pos ? <path key={p.lap} d={`M${x(p.lap)},${y(pos) - 14}V${y(pos) + 14}`} stroke="var(--c-ink)" strokeWidth={2} vectorEffect="non-scaling-stroke" /> : null;
                })}
            </g>
            {cursor && <path d={`M${x(cursor.lap)},0V1000`} stroke="var(--c-ink)" strokeOpacity={0.35} strokeWidth={1} vectorEffect="non-scaling-stroke" />}
          </svg>

          {/* retirements */}
          {order
            .filter((c) => finish(c).retired)
            .map((c) => {
              const f = finish(c);
              return (
                <span
                  key={c}
                  aria-hidden
                  className="absolute -translate-x-1/2 -translate-y-1/2 text-sm font-bold leading-none text-accent-ink transition-opacity duration-150"
                  style={{ left: `${(x(f.lap) / 10).toFixed(2)}%`, top: `${(y(f.pos) / 10).toFixed(2)}%`, opacity: dim(active, c, 0.3) }}
                >
                  ×
                </span>
              );
            })}

          {/* readout */}
          <div aria-live="polite" className="pointer-events-none absolute right-0 top-0 rounded-sm bg-surface/90 px-2 py-1 text-sm tnum shadow-[0_0_0_1px_var(--c-line)]">
            {cursor ? (
              <>
                Коло {cursor.lap} · <b>{DRIVER_BY_CODE[cursor.code].lastName}</b> P{cursor.pos}
              </>
            ) : (
              <span className="text-muted">Наведіть на лінію</span>
            )}
          </div>
        </div>

        {/* finish order — buttons: hover previews, click pins */}
        <div className="relative">
          {order.map((c, i) => {
            const f = finish(c);
            const team = TEAM_BY_ID[DRIVER_BY_CODE[c].teamId];
            const row = f.retired ? i + 1 : f.pos;
            return (
              <button
                key={c}
                type="button"
                aria-pressed={pinned === c}
                aria-label={`${DRIVER_BY_CODE[c].firstName} ${DRIVER_BY_CODE[c].lastName}, ${f.retired ? 'не фінішував' : `P${f.pos}`}`}
                onMouseEnter={() => hover(c)}
                onMouseLeave={() => hover(null)}
                onFocus={() => hover(c)}
                onBlur={() => hover(null)}
                onClick={() => toggle(c)}
                className={cn(
                  'absolute left-0 flex w-full -translate-y-1/2 items-center gap-1.5 rounded-sm px-1 text-left text-[0.75rem] font-semibold tnum transition-opacity duration-150',
                  pinned === c && 'bg-surface-2',
                )}
                style={{ top: `${(((row - 0.5) / P) * 100).toFixed(2)}%`, opacity: dim(active, c, 0.3) }}
              >
                <span aria-hidden className="h-3 w-1 shrink-0" style={{ background: team.color }} />
                <span>{c}</span>
                <span className="ml-auto text-muted">{f.retired ? 'DNF' : f.pos}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* lap axis */}
      <div className="grid grid-cols-[1fr_4.25rem] gap-x-2 sm:grid-cols-[2.25rem_1fr_4.75rem]">
        <span className="hidden sm:block" />
        <div className="relative mt-1 h-5 text-xs text-muted tnum" aria-hidden>
          <span className="absolute left-0">Старт</span>
          {ticks.map((t) => (
            <span key={t} className="absolute -translate-x-1/2" style={{ left: `${(x(t) / 10).toFixed(2)}%` }}>
              {t}
            </span>
          ))}
        </div>
      </div>
    </figure>
  );
}
