import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Gauge, Info, Siren, Sparkles, Timer, Trophy, Zap } from 'lucide-react';
import { COMPOUND, predictRace, type DriverOdds } from './racePrediction';
import { DRIVER_BY_CODE, TEAM_BY_ID } from '../../shared/mock/season';
import { DriverBadge } from '../../shared/ui/atoms';
import { cn } from '../../shared/lib/utils';

const pct = (v: number) => `${Math.round(v * 100)}%`;

export function GeneratedBadge({ note }: { note: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setOpen(false)}
        className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/50 bg-violet-500/10 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-violet-500 dark:text-violet-300"
      >
        <Sparkles className="h-3 w-3" /> Generated <Info className="h-3 w-3 opacity-70" />
      </button>
      {open && (
        <span className="absolute left-0 top-full z-20 mt-2 w-72 rounded-lg border border-line bg-surface p-3 text-xs font-normal normal-case tracking-normal text-ink shadow-xl">
          {note}
        </span>
      )}
    </span>
  );
}

function PickCard({ icon, title, odds, value, delay }: { icon: React.ReactNode; title: string; odds: DriverOdds; value: number; delay: number }) {
  const d = DRIVER_BY_CODE[odds.code];
  const team = TEAM_BY_ID[d.teamId];
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay }}
      className="relative overflow-hidden rounded-xl border border-line bg-surface p-4"
    >
      <span className="absolute inset-x-0 top-0 h-1" style={{ background: team.color }} />
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted">
        <span className="text-f1-red">{icon}</span>
        {title}
      </div>
      <Link to={`/drivers/${odds.code}`} className="mt-3 flex items-center gap-3">
        <DriverBadge code={odds.code} size={48} />
        <div className="min-w-0">
          <div className="text-xs text-muted">{d.firstName}</div>
          <div className="display truncate text-2xl">{d.lastName}</div>
        </div>
        <div className="ml-auto text-right">
          <div className="display text-3xl">{pct(value)}</div>
          <div className="text-[10px] uppercase tracking-wider text-muted">ймовірність</div>
        </div>
      </Link>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2">
        <motion.div className="h-full rounded-full" style={{ background: team.color }} initial={{ width: 0 }} whileInView={{ width: pct(value) }} viewport={{ once: true }} transition={{ duration: 0.9, delay: delay + 0.1 }} />
      </div>
    </motion.div>
  );
}

/** Small inline bar for a probability cell. */
function Cell({ v, color }: { v: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full" style={{ width: `${Math.max(2, v * 100)}%`, background: color }} />
      </div>
      <span className="w-9 text-right font-mono text-xs">{v < 0.005 ? '<1%' : pct(v)}</span>
    </div>
  );
}

export function AiPreview({ round, laps }: { round: number; laps: number }) {
  const p = useMemo(() => predictRace(round), [round]);
  const poleFav = [...p.odds].sort((a, b) => b.pole - a.pole)[0];
  const flFav = [...p.odds].sort((a, b) => b.fastestLap - a.fastestLap)[0];
  const top = p.odds.slice(0, 10);

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <h2 className="display text-3xl">AI-прогноз етапу</h2>
        <GeneratedBadge note={`Згенеровано моделлю: форма останніх 5 етапів, базовий темп пілотів та історія траси. ${p.sims.toLocaleString('uk-UA')} симуляцій кваліфікації й гонки. Не є гарантією результату.`} />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <PickCard icon={<Timer className="h-3.5 w-3.5" />} title="Поул" odds={poleFav} value={poleFav.pole} delay={0} />
        <PickCard icon={<Trophy className="h-3.5 w-3.5" />} title="Переможець" odds={p.odds[0]} value={p.odds[0].win} delay={0.08} />
        <PickCard icon={<Zap className="h-3.5 w-3.5" />} title="Найшвидше коло" odds={flFav} value={flFav.fastestLap} delay={0.16} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        {/* odds table */}
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-[11px] uppercase tracking-wider text-muted">
                <th className="px-4 py-3">Пілот</th>
                <th className="px-2 py-3">Перемога</th>
                <th className="px-2 py-3">Подіум</th>
                <th className="px-2 py-3">Поул</th>
                <th className="px-4 py-3 text-right">Очік. фініш</th>
              </tr>
            </thead>
            <tbody>
              {top.map((o, i) => {
                const d = DRIVER_BY_CODE[o.code];
                const color = TEAM_BY_ID[d.teamId].color;
                return (
                  <motion.tr key={o.code} initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.03 }} className="border-b border-line/60 last:border-0 hover:bg-surface-2">
                    <td className="px-4 py-2">
                      <Link to={`/drivers/${o.code}`} className="flex items-center gap-2 font-bold hover:text-f1-red">
                        <span className="w-4 font-mono text-xs text-muted">{i + 1}</span>
                        <DriverBadge code={o.code} size={24} />
                        {o.code}
                      </Link>
                    </td>
                    <td className="px-2 py-2"><Cell v={o.win} color={color} /></td>
                    <td className="px-2 py-2"><Cell v={o.podium} color={color} /></td>
                    <td className="px-2 py-2"><Cell v={o.pole} color={color} /></td>
                    <td className="px-4 py-2 text-right font-mono font-bold">P{o.expected.toFixed(1)}</td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-4">
          {/* summary */}
          <div className="relative overflow-hidden rounded-xl border border-violet-400/30 bg-gradient-to-br from-violet-500/10 to-transparent p-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-violet-500 dark:text-violet-300">
              <Sparkles className="h-4 w-4" /> Що очікувати
            </div>
            <ul className="space-y-2 text-sm leading-snug">
              {p.summary.map((s, i) => (
                <motion.li key={i} initial={{ opacity: 0, x: -6 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 + i * 0.12 }} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />
                  {s}
                </motion.li>
              ))}
            </ul>
          </div>

          {/* strategy */}
          <div className="card p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted">
                <Gauge className="h-3.5 w-3.5 text-f1-red" /> Ймовірна стратегія · {laps} кіл
              </div>
              <span className="flex items-center gap-1 rounded-full bg-amber-400/15 px-2 py-0.5 text-[11px] font-bold text-amber-600 dark:text-amber-300">
                <Siren className="h-3 w-3" /> SC {pct(p.safetyCar)}
              </span>
            </div>
            <div className="space-y-3">
              {p.strategies.map((s, i) => (
                <div key={s.name} className={cn(i > 0 && 'opacity-70')}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="font-bold">{s.name}</span>
                    <span className="font-mono">{pct(s.probability)}</span>
                  </div>
                  <div className="flex h-5 gap-0.5 overflow-hidden rounded">
                    {s.stints.map((st, k) => (
                      <motion.div
                        key={k}
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: 0.5, delay: i * 0.1 + k * 0.12 }}
                        className="flex origin-left items-center justify-center font-mono text-[10px] font-bold"
                        style={{ width: `${(st.laps / laps) * 100}%`, background: COMPOUND[st.compound].color, color: COMPOUND[st.compound].text }}
                        title={`${COMPOUND[st.compound].label}: ${st.laps} кіл`}
                      >
                        {st.compound} · {st.laps}
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
