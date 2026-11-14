import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Calculator, Crown, Sparkles } from 'lucide-react';
import { api } from '../../shared/api';
import { useData } from '../../shared/lib/useData';
import { driverPhoto } from '../../shared/lib/media';
import { DRIVER_BY_CODE, SEASON, TEAM_BY_ID } from '../../shared/mock/season';
import type { StandingRow, StandingsHistory } from '../../shared/model/types';
import { DriverBadge, Loader, Segmented } from '../../shared/ui/atoms';
import { cn } from '../../shared/lib/utils';
import { MAX_PER_RACE, titleForecast, titleMaths, type TitleChance, type TitleMaths } from '../../widgets/title-race/titleModel';

type Tab = 'maths' | 'forecast';

const OUT_GREY = '#8a8d94';

export function ChampionshipPage() {
  const [tab, setTab] = useState<Tab>('maths');
  const { data } = useData(api.driverStandings);

  return (
    <div className="mx-auto max-w-7xl px-4 pt-10 md:px-6">
      <div className="mb-8">
        <div className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-f1-red">{SEASON} Title fight</div>
        <h1 className="display text-5xl md:text-7xl">Битва за титул</h1>
      </div>

      <div className="mb-6">
        <Segmented
          layoutKey="title-tab"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'maths', label: <><Calculator className="h-3.5 w-3.5" /> Математичні шанси</> },
            { value: 'forecast', label: <><Sparkles className="h-3.5 w-3.5" /> Прогноз</> },
          ]}
        />
      </div>

      {!data ? (
        <Loader />
      ) : (
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
            {tab === 'maths' ? <MathsView table={data.table} history={data.history} /> : <ForecastView table={data.table} history={data.history} />}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- maths */

function MathsView({ table, history }: { table: StandingRow[]; history: StandingsHistory }) {
  const m = useMemo(() => titleMaths(table, history), [table, history]);
  const alive = m.drivers.filter((d) => d.status !== 'out');
  const out = m.drivers.filter((d) => d.status === 'out');
  const scale = m.leader.points + m.maxRemaining;

  return (
    <>
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Гонок залишилось" value={m.remaining.length} />
        <Stat label="Очок ще в грі" value={m.maxRemaining} hint={`${MAX_PER_RACE} за перемогу`} />
        <Stat label="У боротьбі" value={`${alive.length} / ${m.drivers.length}`} />
        <Stat label="Відрив лідера" value={table[1] ? `+${m.leader.points - table[1].points}` : '—'} hint={table[1] ? `над ${table[1].id}` : undefined} />
      </div>
      <ClinchNote m={m} table={table} />

      <SectionLabel>{m.decided ? 'Чемпіон' : 'Ще можуть стати чемпіоном'}</SectionLabel>
      <div className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {alive.map((d, i) => (
          <ChanceCard key={d.code} d={d} m={m} scale={scale} delay={i * 0.04} />
        ))}
      </div>

      {out.length > 0 && (
        <>
          <SectionLabel>Без математичних шансів</SectionLabel>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {out.map((d, i) => (
              <ChanceCard key={d.code} d={d} m={m} scale={scale} delay={i * 0.02} small />
            ))}
          </div>
        </>
      )}

      <p className="mt-6 text-xs text-muted">
        Пілот у грі, поки перемоги в усіх гонках, що залишились, вистачає, щоб обійти лідера (або зрівнятися з ним і мати більше перемог — перший тай-брейк).
      </p>
    </>
  );
}

function ClinchNote({ m, table }: { m: TitleMaths; table: StandingRow[] }) {
  const next = m.remaining[0];
  let text: string;
  if (m.decided) text = `${DRIVER_BY_CODE[m.leader.id].lastName} — чемпіон світу ${SEASON}! Наздогнати його вже неможливо.`;
  else if (!next || m.clinchLead === undefined || !table[1]) return null;
  else {
    const lead = m.leader.points - table[1].points;
    const need = m.clinchLead - lead;
    const name = DRIVER_BY_CODE[m.leader.id].lastName;
    const rival = table[1].id;
    text =
      need > MAX_PER_RACE
        ? `У ${next.country} титул ще не вирішиться: навіть за ідеального сценарію відрив лідера не перевищить ${MAX_PER_RACE * (m.remaining.length - 1)} очок.`
        : need > 0
          ? `${name} може оформити титул уже в ${next.country}: потрібен відрив ${m.clinchLead}+ очок після гонки — тобто набрати на ${need} більше, ніж ${rival}.`
          : `${name} оформить титул уже в ${next.country}, якщо втратить на ${rival} не більше ${-need} ${-need === 1 ? 'очка' : 'очок'} (потрібен відрив ${m.clinchLead}+ після гонки).`;
  }
  return (
    <div className="mb-8 flex items-start gap-3 rounded-[14px] border border-line bg-surface p-4 text-sm">
      <Crown className="mt-0.5 h-4 w-4 shrink-0 text-f1-red" />
      <span>{text}</span>
    </div>
  );
}

function ChanceCard({ d, m, scale, delay, small }: { d: TitleChance; m: TitleMaths; scale: number; delay: number; small?: boolean }) {
  const driver = DRIVER_BY_CODE[d.code];
  const team = TEAM_BY_ID[driver.teamId];
  const out = d.status === 'out';
  const color = out ? OUT_GREY : team.color;
  const R = m.remaining.length;

  const note =
    d.status === 'champion'
      ? 'Титул оформлено'
      : d.status === 'leader'
        ? `Лідер · максимум ${d.maxPoints}`
        : d.status === 'alive'
          ? R > 0
            ? `−${d.gap} · відігравати ~${(d.gap / R).toFixed(1)} очк./гонку`
            : `−${d.gap}`
          : `Вибув після ${d.outAfter} · максимум ${d.maxPoints}`;

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.35 }}>
      <Link to={`/drivers/${d.code}`} className={cn('card group block overflow-hidden transition', out ? 'opacity-80 hover:opacity-100' : 'hover:-translate-y-0.5')}>
        <div
          className={cn('relative overflow-hidden', small ? 'h-28 sm:h-32' : 'h-40 sm:h-48')}
          style={{ background: `linear-gradient(165deg, ${color}, color-mix(in srgb, ${color} 35%, transparent) 75%, transparent)` }}
        >
          <span className={cn('absolute left-3 top-1 font-sport font-black italic leading-none text-black/15', small ? 'text-5xl' : 'text-7xl')}>{driver.number}</span>
          <img
            src={driverPhoto(d.code, '4col')}
            alt={`${driver.firstName} ${driver.lastName}`}
            loading="lazy"
            onError={(e) => (e.currentTarget.style.display = 'none')}
            className={cn(
              'pointer-events-none absolute bottom-0 left-1/2 h-[105%] -translate-x-1/2 object-contain object-bottom drop-shadow-[0_8px_16px_rgba(0,0,0,0.3)] transition duration-500',
              out ? 'opacity-75 brightness-90 grayscale' : 'group-hover:scale-[1.03]',
            )}
          />
          <span className="absolute right-2 top-2 rounded-full bg-black/55 px-2 py-0.5 font-mono text-[10px] font-bold text-white backdrop-blur">P{d.position}</span>
          {d.status === 'champion' && (
            <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-[#D4AF37] px-2 py-0.5 text-[10px] font-black uppercase text-black">
              <Crown className="h-3 w-3" /> Champion
            </span>
          )}
          {out && <span className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white/80">Out</span>}
        </div>
        <div className={cn('space-y-2', small ? 'p-2.5' : 'p-3')}>
          <div className="flex items-baseline justify-between gap-2">
            <div className="min-w-0">
              <div className={cn('truncate font-bold uppercase', small ? 'text-xs' : 'text-sm', out && 'text-muted')}>{driver.lastName}</div>
              <div className="truncate text-[11px] text-muted">{team.name}</div>
            </div>
            <span className={cn('font-mono font-bold', small ? 'text-base' : 'text-xl', out && 'text-muted')}>{d.points}</span>
          </div>
          <ReachBar points={d.points} max={d.maxPoints} leader={m.leader.points} scale={scale} color={color} out={out} />
          <div className={cn('text-[11px] leading-snug', out ? 'text-muted' : 'text-ink/80')}>{note}</div>
        </div>
      </Link>
    </motion.div>
  );
}

/** Current points (solid) + everything still winnable (striped); the tick is the leader's total. */
function ReachBar({ points, max, leader, scale, color, out }: { points: number; max: number; leader: number; scale: number; color: string; out: boolean }) {
  const share = (v: number) => `${(v / (scale || 1)) * 100}%`;
  return (
    <div className="relative h-2 rounded-full bg-surface-2" title={`${points} очок, максимум ${max}, лідер ${leader}`}>
      <motion.div
        className="absolute inset-y-0 left-0 rounded-full"
        style={{ background: `repeating-linear-gradient(-45deg, ${color}66 0 3px, transparent 3px 6px)` }}
        initial={{ width: 0 }}
        animate={{ width: share(max) }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
      <motion.div className="absolute inset-y-0 left-0 rounded-full" style={{ background: color }} initial={{ width: 0 }} animate={{ width: share(points) }} transition={{ duration: 0.8, ease: 'easeOut' }} />
      <span className={cn('absolute -inset-y-1 w-0.5 rounded-full', out ? 'bg-f1-red' : 'bg-ink')} style={{ left: share(leader) }} />
    </div>
  );
}

/* ---------------------------------------------------------------- forecast */

function ForecastView({ table, history }: { table: StandingRow[]; history: StandingsHistory }) {
  const f = useMemo(() => titleForecast(table), [table]);
  // mathematically alive drivers never show a flat 0% / 100%, however unlikely the simulations make it
  const alive = useMemo(() => new Set(titleMaths(table, history).drivers.filter((d) => d.status !== 'out').map((d) => d.code)), [table, history]);
  const pct = (p: number, code?: string) => formatChance(p, alive.size > 1 && code !== undefined && alive.has(code));
  const current = Object.fromEntries(table.map((r) => [r.id, r]));
  const fav = f.drivers.reduce((a, b) => (b.title > a.title ? b : a));
  const contenders = f.drivers.filter((d) => d.title > 0 || alive.has(d.code)).sort((a, b) => b.title - a.title);

  if (f.decidedAt.length === 0) return <div className="card p-10 text-center text-muted">Сезон завершено — прогнозувати нічого</div>;

  const favDriver = DRIVER_BY_CODE[fav.code];
  const favColor = TEAM_BY_ID[favDriver.teamId].color;
  const maxDecided = Math.max(...f.decidedAt.map((d) => d.p));

  return (
    <>
      <div className="mb-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        {/* favourite */}
        <div className="relative overflow-hidden rounded-[14px] p-6 text-black" style={{ background: `linear-gradient(110deg, ${favColor}, ${favColor}aa 60%, ${favColor}55)` }}>
          <img
            src={driverPhoto(fav.code, '4col')}
            alt=""
            onError={(e) => (e.currentTarget.style.display = 'none')}
            className="pointer-events-none absolute bottom-0 right-4 hidden h-[115%] object-contain object-bottom drop-shadow-[0_10px_20px_rgba(0,0,0,0.35)] sm:block"
          />
          <div className="relative">
            <div className="text-xs font-bold uppercase tracking-[0.25em] text-black/60">Фаворит прогнозу</div>
            <div className="display mt-1 text-4xl md:text-5xl">
              {favDriver.firstName} {favDriver.lastName}
            </div>
            <div className="mt-4 flex items-end gap-6">
              <div>
                <div className="display text-6xl">{pct(fav.title, fav.code)}</div>
                <div className="text-xs font-bold uppercase tracking-widest text-black/60">шанс на титул</div>
              </div>
              <div className="font-mono text-sm text-black/70">
                ~{Math.round(fav.expected)} очок
                <br />
                {Math.round(fav.p10)}–{Math.round(fav.p90)}
              </div>
            </div>
          </div>
        </div>

        {/* when will it be decided */}
        <div className="card p-5">
          <div className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-muted">Де вирішиться титул</div>
          <div className="space-y-3">
            {f.decidedAt.map((d, i) => (
              <div key={d.round} className="flex items-center gap-3 text-sm">
                <span className="w-28 shrink-0 truncate font-bold">{d.label}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                  <motion.div
                    className="h-full rounded-full bg-f1-red"
                    initial={{ width: 0 }}
                    animate={{ width: `${(d.p / (maxDecided || 1)) * 100}%` }}
                    transition={{ duration: 0.7, delay: i * 0.08 }}
                  />
                </div>
                <span className="w-12 text-right font-mono text-xs">{formatChance(d.p)}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[11px] text-muted">Остання гонка включає випадки, коли все вирішується у фіналі.</p>
        </div>
      </div>

      {/* title odds */}
      <SectionLabel>Шанси на титул</SectionLabel>
      <div className="card mb-8 divide-y divide-line/60">
        {contenders.map((d, i) => {
          const driver = DRIVER_BY_CODE[d.code];
          const color = TEAM_BY_ID[driver.teamId].color;
          return (
            <div key={d.code} className="flex items-center gap-3 px-4 py-3 md:gap-5">
              <DriverBadge code={d.code} size={36} />
              <div className="w-28 min-w-0 shrink-0 sm:w-40">
                <div className="truncate font-bold uppercase">{driver.lastName}</div>
                <div className="truncate text-xs text-muted">{TEAM_BY_ID[driver.teamId].name}</div>
              </div>
              <div className="h-3 flex-1 overflow-hidden rounded-full bg-surface-2">
                <motion.div className="h-full rounded-full" style={{ background: color }} initial={{ width: 0 }} animate={{ width: `${Math.max(0.5, d.title * 100)}%` }} transition={{ duration: 0.9, delay: i * 0.06, ease: 'easeOut' }} />
              </div>
              <span className="w-16 text-right font-mono text-lg font-bold">{pct(d.title, d.code)}</span>
            </div>
          );
        })}
      </div>

      {/* projected final table */}
      <SectionLabel>Прогноз підсумкової таблиці</SectionLabel>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-[11px] uppercase tracking-wider text-muted">
              <th className="px-4 py-3 font-bold">Поз</th>
              <th className="px-2 py-3 font-bold">Пілот</th>
              <th className="px-2 py-3 text-right font-bold">Зараз</th>
              <th className="px-2 py-3 text-right font-bold">Прогноз</th>
              <th className="px-2 py-3 text-right font-bold">Діапазон</th>
              <th className="px-4 py-3 text-right font-bold">Титул</th>
            </tr>
          </thead>
          <tbody>
            {f.drivers.map((d, i) => {
              const driver = DRIVER_BY_CODE[d.code];
              const now = current[d.code];
              const move = now.position - (i + 1);
              const out = !alive.has(d.code);
              return (
                <tr key={d.code} className={cn('border-b border-line/60 last:border-0', out && 'text-muted')}>
                  <td className="px-4 py-2.5 font-mono font-bold">
                    {i + 1}
                    {move !== 0 && <span className={cn('ml-1 text-[10px]', move > 0 ? 'text-green-500' : 'text-f1-red')}>{move > 0 ? `▲${move}` : `▼${-move}`}</span>}
                  </td>
                  <td className="px-2 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className="h-6 w-1 rounded-full" style={{ background: TEAM_BY_ID[driver.teamId].color }} />
                      <DriverBadge code={d.code} size={26} className={cn(out && 'grayscale')} />
                      <span className="font-bold uppercase">{driver.lastName}</span>
                    </div>
                  </td>
                  <td className="px-2 py-2.5 text-right font-mono">{now.points}</td>
                  <td className="px-2 py-2.5 text-right font-mono font-bold">{Math.round(d.expected)}</td>
                  <td className="px-2 py-2.5 text-right font-mono text-xs text-muted">
                    {Math.round(d.p10)}–{Math.round(d.p90)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono">{out ? '—' : pct(d.title, d.code)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted">
        {f.sims.toLocaleString('uk-UA')} симуляцій решти сезону: базовий темп пілота, форма за останні 5 гонок, випадковість і сходи (~7% на гонку). Діапазон — від 10-го до 90-го перцентиля очок.
      </p>
    </>
  );
}

/* ---------------------------------------------------------------- bits */

/** `open` = the title is still mathematically undecided for this driver, so never print a hard 0% or 100%. */
function formatChance(p: number, open = false) {
  if (p <= 0 && !open) return '0%';
  if (p < 0.001) return '<0.1%';
  if (p > 0.999 && (p < 1 || open)) return '>99.9%';
  return `${(p * 100).toFixed(p < 0.1 ? 1 : 0)}%`;
}

function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="card p-4">
      <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted">{label}</div>
      <div className="display mt-1 text-3xl">{value}</div>
      {hint && <div className="text-[11px] text-muted">{hint}</div>}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-muted">{children}</h2>;
}
