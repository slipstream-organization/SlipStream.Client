import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import type { RaceWeekendResult } from '../../shared/model/types';
import { api } from '../../shared/api';
import { useData } from '../../shared/lib/useData';
import { onColor } from '../../shared/lib/color';
import { cn } from '../../shared/lib/utils';
import { DRIVER_BY_CODE, TEAM_BY_ID } from '../../shared/mock/season';
import { useFocus } from './focus';

/**
 * P1–P3. The winner on a field of the team colour with the season cut-out; P2 and P3 quieter,
 * with the gap as the headline number.
 */
export function ReportPodium({ result }: { result: RaceWeekendResult }) {
  const [p1, ...rest] = result.race.slice(0, 3);
  const { hover } = useFocus();
  const media = useData(() => api.driverMedia(p1.driverCode), [p1.driverCode]);
  const d1 = DRIVER_BY_CODE[p1.driverCode];
  const t1 = TEAM_BY_ID[d1.teamId];

  return (
    <section aria-label="Подіум" className="grid grid-cols-2 gap-3 lg:grid-cols-[1.6fr_1fr_1fr]">
      <Link
        to={`/drivers/${p1.driverCode}`}
        onMouseEnter={() => hover(p1.driverCode)}
        onMouseLeave={() => hover(null)}
        className="chamfer group relative isolate col-span-2 flex min-h-[240px] flex-col lg:col-span-1 justify-end overflow-hidden p-6 md:min-h-[280px] md:p-8"
        style={{ background: t1.color, color: onColor(t1.color) } as CSSProperties}
      >
        <span aria-hidden className="digits pointer-events-none absolute left-5 top-3 -z-10 text-[6.5rem] font-bold leading-none opacity-20 md:left-7">
          1
        </span>
        {media.data?.cutout && (
          <div aria-hidden className="pointer-events-none absolute inset-y-0 right-[4%] -z-10 w-[34%] overflow-hidden">
            <img decoding="async" src={media.data.cutout} alt="" className="absolute left-1/2 top-[8%] h-[230%] w-auto max-w-none -translate-x-1/2 motion-safe:transition-transform motion-safe:duration-300 group-hover:-translate-y-1" />
          </div>
        )}
        <div className="max-w-[62%]">
          <p className="text-base font-semibold opacity-90">{d1.firstName}</p>
          <p className="headline text-[clamp(2rem,4vw,3rem)]">{d1.lastName}</p>
          <p className="mt-1 text-sm font-semibold opacity-90">{t1.name}</p>
          <p className="digits mt-4 text-2xl font-bold">{p1.time}</p>
        </div>
      </Link>

      {rest.map((r) => {
        const d = DRIVER_BY_CODE[r.driverCode];
        const t = TEAM_BY_ID[d.teamId];
        return (
          <Link
            key={r.driverCode}
            to={`/drivers/${r.driverCode}`}
            onMouseEnter={() => hover(r.driverCode)}
            onMouseLeave={() => hover(null)}
            className={cn('group relative flex flex-col justify-between overflow-hidden rounded-md border border-line bg-surface p-5 hover:bg-surface-2 md:p-6')}
          >
            <span aria-hidden className="absolute inset-x-0 top-0 h-1" style={{ background: t.color }} />
            <span className="digits text-4xl font-bold leading-none md:text-5xl">{r.position}</span>
            <div className="mt-4 md:mt-6">
              <p className="text-sm font-semibold text-muted">{d.firstName}</p>
              <p className="headline text-2xl">{d.lastName}</p>
              <p className="text-sm text-muted">{t.name}</p>
              <p className="digits mt-3 text-xl font-bold">{r.time}</p>
            </div>
          </Link>
        );
      })}
    </section>
  );
}
