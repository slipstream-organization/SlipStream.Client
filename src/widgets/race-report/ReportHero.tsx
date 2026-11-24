import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import type { RaceEvent, RaceReport, RaceWeekendResult } from '../../shared/model/types';
import { CIRCUITS } from '../../shared/data/circuits';
import { UA_NAMES } from '../../shared/mock/articles';
import { Flag } from '../../shared/ui/atoms';
import { TrackOutline } from '../../shared/ui/TrackOutline';
import { PoleChallengeButton } from '../../features/pole-challenge/PoleChallenge';
import { circuitTransition } from '../season/model';
import { LapChart } from './LapChart';

const longDate = (iso: string) => new Date(iso).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' });

/** A journal headline from the result itself — no copywriting needed per race. */
function headline(result: RaceWeekendResult) {
  const w = result.race[0];
  const name = UA_NAMES[w.driverCode]?.[1] ?? w.driverCode;
  if (w.grid === 1) return `${name}: від поула до перемоги`;
  if (w.grid >= 6) return `${name} виграє зі старту з P${w.grid}`;
  return `${name}: від P${w.grid} до перемоги`;
}

/**
 * Variant B — the race in one picture. A headline written from the result, the key facts as a
 * single ruled line, then the lap chart across the full width: every driver's position lap by lap.
 */
export function ReportHero({ ev, result, report }: { ev: RaceEvent; result: RaceWeekendResult; report: RaceReport }) {
  const circuit = CIRCUITS[ev.circuitId];
  const order = result.race.map((r) => r.driverCode);
  const facts: [string, string][] = [
    ['Дата', longDate(ev.endDate)],
    ['Траса', circuit?.name ?? ev.city],
    ['Дистанція', `${ev.laps} кіл`],
    ['Час переможця', report.winnerTime],
    ['Повітря / траса', `${report.weather.air}° / ${report.weather.track}°`],
  ];

  return (
    <section className="border-b border-line">
      <div className="mx-auto max-w-7xl px-4 pb-10 pt-6 md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link to="/races" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted hover:text-ink">
            <ArrowLeft className="h-4 w-4" aria-hidden /> Усі Гран-прі
          </Link>
          <PoleChallengeButton ev={ev} />
        </div>

        <div className="mt-4 grid items-end gap-6 lg:grid-cols-[1fr_auto]">
          <div>
            <p className="flex items-center gap-2.5 text-base font-semibold">
              <Flag code={ev.countryCode} className="h-5 w-5 ring-0" /> Гран-прі {ev.country}, етап {ev.round}
            </p>
            <h1 className="headline mt-3 max-w-[18ch] text-[clamp(2.25rem,5.5vw,4.5rem)] leading-[1.02]">{headline(result)}</h1>
          </div>
          <div className="hidden lg:block" style={circuitTransition(ev.round)}>
            <TrackOutline circuitId={ev.circuitId} className="h-28 w-40 text-ink/55" strokeWidth={4} />
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 border-y border-line py-3 sm:grid-cols-3 lg:grid-cols-5">
          {facts.map(([k, v]) => (
            <div key={k}>
              <dt className="text-sm text-muted">{k}</dt>
              <dd className="mt-0.5 font-semibold tnum">{v}</dd>
            </div>
          ))}
        </dl>

        <LapChart report={report} order={order} className="mt-10" />
      </div>
    </section>
  );
}
