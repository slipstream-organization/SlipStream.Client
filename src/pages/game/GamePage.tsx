import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Crown, Flame, Lock, Sparkles, Trophy } from 'lucide-react';
import { api, getNextRace } from '../../shared/api';
import { useData } from '../../shared/lib/useData';
import { BOLD_OPTIONS, type BingoCell } from '../../shared/mock/game';
import { DRIVERS, DRIVER_BY_CODE, RACES, TEAM_BY_ID } from '../../shared/mock/season';
import { Countdown } from '../../widgets/countdown/Countdown';
import { DriverBadge, Flag, Loader, SectionTitle } from '../../shared/ui/atoms';
import { fadeUp, stagger } from '../../shared/ui/motion';
import { cn } from '../../shared/lib/utils';

type Slot = 'pole' | 'p1' | 'p2' | 'p3';
const SLOTS: { id: Slot; label: string; pts: number }[] = [
  { id: 'pole', label: 'Поул', pts: 10 },
  { id: 'p1', label: 'Переможець', pts: 25 },
  { id: 'p2', label: 'P2', pts: 15 },
  { id: 'p3', label: 'P3', pts: 15 },
];

interface Prediction {
  picks: Partial<Record<Slot, string>>;
  bold: string[];
  custom: string;
  submittedAt?: string;
}

const MAX_BOLD = 3;
const storageKey = (round: number) => `slipstream-prediction-${round}`;

function loadPrediction(round: number): Prediction {
  try {
    const raw = localStorage.getItem(storageKey(round));
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return { picks: {}, bold: [], custom: '' };
}

export function GamePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 pt-10 md:px-6">
      <div className="mb-10">
        <div className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-f1-red">Predict & Bingo</div>
        <h1 className="display text-5xl md:text-7xl">Гра сезону</h1>
      </div>
      <div className="grid gap-10 xl:grid-cols-[1fr_340px]">
        <PredictionForm />
        <PredictionLeaderboard />
      </div>
      <SeasonBingo />
    </div>
  );
}

/* ------------------------------------------------------------ predictions */

function PredictionForm() {
  const race = getNextRace();
  const round = race?.round ?? 0;
  const [pred, setPred] = useState<Prediction>(() => loadPrediction(round));
  const [active, setActive] = useState<Slot>('pole');
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [now] = useState(() => Date.now());

  useEffect(() => {
    try {
      localStorage.setItem(storageKey(round), JSON.stringify(pred));
    } catch {
      /* ignore */
    }
  }, [pred, round]);

  if (!race) return <div className="card p-10 text-center text-muted">Сезон завершено — прогнози відкриються в наступному році.</div>;

  const quali = new Date(race.sessions.find((s) => s.kind === 'QUALI')!.start).getTime();
  const locked = now > quali;
  const submitted = !!pred.submittedAt;
  const editable = !locked && !submitted;

  const pick = (code: string) => {
    if (!editable) return;
    setPred((p) => {
      const picks = { ...p.picks };
      // a driver can't finish in two podium places
      if (active !== 'pole') for (const s of ['p1', 'p2', 'p3'] as Slot[]) if (picks[s] === code) delete picks[s];
      picks[active] = code;
      return { ...p, picks };
    });
    const order: Slot[] = ['pole', 'p1', 'p2', 'p3'];
    const nextSlot = order.find((s, i) => i > order.indexOf(active) && !pred.picks[s]);
    if (nextSlot) setActive(nextSlot);
  };

  const toggleBold = (id: string) => {
    if (!editable) return;
    setPred((p) => ({ ...p, bold: p.bold.includes(id) ? p.bold.filter((x) => x !== id) : p.bold.length < MAX_BOLD ? [...p.bold, id] : p.bold }));
  };

  const complete = SLOTS.every((s) => pred.picks[s.id]);
  const potential =
    SLOTS.reduce((a, s) => a + (pred.picks[s.id] ? s.pts : 0), 0) +
    pred.bold.reduce((a, id) => a + Math.round(10 * (BOLD_OPTIONS.find((b) => b.id === id)?.multiplier ?? 1)), 0);

  return (
    <section>
      {/* header card */}
      <div className="relative mb-6 overflow-hidden rounded-[14px] border border-white/10 bg-[#0b0b0f] p-6 text-white">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-f1-red/30 blur-[90px]" />
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/50">Round {race.round} · Bold predictions</div>
            <div className="mt-2 flex items-center gap-3">
              <Flag code={race.countryCode} className="h-8 w-8" />
              <span className="display text-4xl">{race.country}</span>
            </div>
          </div>
          <div>
            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-white/50">
              <Lock className="h-3 w-3" /> {locked ? 'Прийом закрито' : 'Закриття через'}
            </div>
            {!locked && <Countdown target={quali} size="sm" />}
          </div>
        </div>
      </div>

      {/* slots */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {SLOTS.map((s) => {
          const code = pred.picks[s.id];
          const d = code ? DRIVER_BY_CODE[code] : undefined;
          const isActive = active === s.id && editable;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setActive(s.id)}
              disabled={!editable}
              className={cn('relative overflow-hidden rounded-xl border-2 bg-surface p-4 text-left transition', isActive ? 'border-f1-red' : 'border-line hover:border-f1-red/40')}
            >
              {isActive && <motion.span layoutId="active-slot" className="absolute inset-0 bg-f1-red/5" />}
              <div className="relative flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-muted">
                {s.label}
                <span className="font-mono text-f1-red">+{s.pts}</span>
              </div>
              <div className="relative mt-3 flex h-10 items-center gap-2">
                <AnimatePresence mode="wait">
                  {d ? (
                    <motion.div key={d.code} initial={{ opacity: 0, y: 10, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10 }} className="flex items-center gap-2">
                      <DriverBadge code={d.code} size={36} />
                      <div className="leading-tight">
                        <div className="font-black">{d.code}</div>
                        <div className="text-[11px] text-muted">{TEAM_BY_ID[d.teamId].name}</div>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.span key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-muted">
                      Обери пілота
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </button>
          );
        })}
      </div>

      {/* driver grid */}
      <motion.div variants={stagger(0.015)} initial="hidden" animate="show" className={cn('mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6', !editable && 'pointer-events-none opacity-50')}>
        {DRIVERS.map((d) => {
          const usedIn = SLOTS.filter((s) => pred.picks[s.id] === d.code);
          return (
            <motion.button
              variants={fadeUp}
              key={d.code}
              type="button"
              whileTap={{ scale: 0.94 }}
              onClick={() => pick(d.code)}
              className={cn('group relative flex items-center gap-2 overflow-hidden rounded-lg border bg-surface p-2 text-left transition hover:-translate-y-0.5', usedIn.length ? 'border-f1-red/60' : 'border-line hover:border-ink/30')}
            >
              <span className="absolute inset-y-0 left-0 w-1" style={{ background: TEAM_BY_ID[d.teamId].color }} />
              <DriverBadge code={d.code} size={28} className="ml-1" />
              <div className="min-w-0 leading-tight">
                <div className="text-sm font-black">{d.code}</div>
                <div className="truncate text-[10px] text-muted">{d.lastName}</div>
              </div>
              {usedIn.length > 0 && <span className="absolute right-1.5 top-1.5 rounded bg-f1-red px-1 text-[9px] font-bold uppercase text-white">{usedIn.map((s) => s.label.replace('Переможець', 'P1')).join('/')}</span>}
            </motion.button>
          );
        })}
      </motion.div>

      {/* bold picks */}
      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="display flex items-center gap-2 text-2xl">
            <Flame className="h-5 w-5 text-f1-red" /> Сміливі прогнози
          </h3>
          <span className="font-mono text-xs text-muted">
            {pred.bold.length}/{MAX_BOLD}
          </span>
        </div>
        <div className={cn('grid gap-2 sm:grid-cols-2', !editable && 'pointer-events-none opacity-60')}>
          {BOLD_OPTIONS.map((b) => {
            const on = pred.bold.includes(b.id);
            return (
              <motion.button
                key={b.id}
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={() => toggleBold(b.id)}
                className={cn('flex items-center gap-3 rounded-lg border p-3 text-left text-sm font-semibold transition', on ? 'border-f1-red bg-f1-red/10' : 'border-line bg-surface hover:border-ink/30')}
              >
                <span className={cn('grid h-5 w-5 shrink-0 place-items-center rounded border-2 transition', on ? 'border-f1-red bg-f1-red text-white' : 'border-line')}>{on && <Check className="h-3 w-3" />}</span>
                <span className="flex-1">{b.label}</span>
                <span className={cn('rounded-full px-2 py-0.5 font-mono text-xs font-bold', b.multiplier >= 4 ? 'bg-f1-red text-white' : 'bg-surface-2')}>×{b.multiplier}</span>
              </motion.button>
            );
          })}
        </div>
        <textarea
          value={pred.custom}
          onChange={(e) => setPred((p) => ({ ...p, custom: e.target.value.slice(0, 140) }))}
          disabled={!editable}
          placeholder="Свій bold prediction (оцінюється спільнотою) — напр. «Стролл обжене Алонсо на старті»"
          className="mt-3 h-20 w-full resize-none rounded-lg border border-line bg-surface p-3 text-sm outline-none transition placeholder:text-muted focus:border-f1-red"
        />
      </div>

      {/* submit */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line bg-surface p-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted">Потенційні очки</div>
          <motion.div key={potential} initial={{ scale: 1.25, color: '#e10600' }} animate={{ scale: 1, color: 'var(--c-ink)' }} className="display origin-left text-4xl">
            {potential}
          </motion.div>
        </div>
        {submitted ? (
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2 rounded-full bg-emerald-500/15 px-4 py-2 text-sm font-bold text-emerald-500">
              <Check className="h-4 w-4" /> Прогноз зафіксовано
            </span>
            {!locked && (
              <button type="button" onClick={() => setPred((p) => ({ ...p, submittedAt: undefined }))} className="text-xs font-bold uppercase text-muted hover:text-f1-red">
                Змінити
              </button>
            )}
          </div>
        ) : (
          <button
            type="button"
            disabled={!complete || locked}
            onClick={() => {
              setPred((p) => ({ ...p, submittedAt: new Date().toISOString() }));
              setJustSubmitted(true);
              setTimeout(() => setJustSubmitted(false), 2200);
            }}
            className="rounded-full bg-f1-red px-8 py-3 text-sm font-bold uppercase tracking-wide text-white transition enabled:hover:bg-[#ff1a12] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {complete ? 'Зафіксувати прогноз' : 'Заповни поул і подіум'}
          </button>
        )}
      </div>

      <AnimatePresence>
        {justSubmitted && (
          <motion.div
            initial={{ opacity: 0, scale: 0.6, rotate: -12 }}
            animate={{ opacity: 1, scale: 1, rotate: -6 }}
            exit={{ opacity: 0, scale: 1.2 }}
            className="pointer-events-none fixed inset-0 z-50 grid place-items-center"
          >
            <div className="display rounded-xl border-4 border-f1-red bg-bg/90 px-10 py-6 text-5xl text-f1-red shadow-2xl backdrop-blur">Locked in!</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function PredictionLeaderboard() {
  const { data } = useData(api.predictionLeaderboard);
  return (
    <aside>
      <div className="card sticky top-24 p-5">
        <h3 className="display mb-1 flex items-center gap-2 text-2xl">
          <Trophy className="h-5 w-5 text-f1-red" /> Рейтинг прогнозистів
        </h3>
        <p className="mb-4 text-xs text-muted">Сума очок за всі етапи сезону</p>
        {!data ? (
          <Loader className="py-6" />
        ) : (
          <motion.ol variants={stagger(0.04)} initial="hidden" animate="show" className="space-y-1">
            {data.map((u) => (
              <motion.li
                variants={fadeUp}
                key={u.name}
                className={cn('flex items-center gap-3 rounded-lg px-2 py-2', u.isMe ? 'bg-f1-red/10 ring-1 ring-f1-red/50' : 'hover:bg-surface-2')}
              >
                <span className={cn('grid h-7 w-7 place-items-center rounded-full font-mono text-xs font-bold', u.rank === 1 ? 'bg-amber-400 text-black' : u.rank === 2 ? 'bg-zinc-300 text-black' : u.rank === 3 ? 'bg-amber-700 text-white' : 'bg-surface-2 text-muted')}>
                  {u.rank === 1 ? <Crown className="h-3.5 w-3.5" /> : u.rank}
                </span>
                <span className="flex-1 truncate text-sm font-bold">
                  {u.name}
                  {u.isMe && <span className="ml-1.5 text-[10px] uppercase text-f1-red">ти</span>}
                </span>
                {u.streak >= 3 && (
                  <span className="flex items-center gap-0.5 text-[11px] text-orange-500">
                    <Flame className="h-3 w-3" />
                    {u.streak}
                  </span>
                )}
                <span className="font-mono text-sm font-bold">{u.points}</span>
              </motion.li>
            ))}
          </motion.ol>
        )}
      </div>
    </aside>
  );
}

/* ------------------------------------------------------------ bingo */

const LINES = (() => {
  const l: number[][] = [];
  for (let r = 0; r < 5; r++) l.push([0, 1, 2, 3, 4].map((c) => r * 5 + c));
  for (let c = 0; c < 5; c++) l.push([0, 1, 2, 3, 4].map((r) => r * 5 + c));
  l.push([0, 6, 12, 18, 24], [4, 8, 12, 16, 20]);
  return l;
})();

function SeasonBingo() {
  const { data } = useData(api.bingo);
  const lines = useMemo(() => (data ? LINES.filter((line) => line.every((i) => data[i].done)) : []), [data]);
  const inLine = new Set(lines.flat());
  const doneCount = data?.filter((c) => c.done && !c.free).length ?? 0;

  return (
    <section id="bingo" className="mt-20 scroll-mt-24">
      <SectionTitle
        kicker="Сезонне бінго"
        title="Bingo 2026"
        action={
          <div className="flex gap-4 text-right">
            <div>
              <div className="display text-3xl">{doneCount}/24</div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted">подій</div>
            </div>
            <div>
              <div className="display text-3xl text-f1-red">{lines.length}</div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted">ліній</div>
            </div>
          </div>
        }
      />
      <p className="-mt-3 mb-6 max-w-2xl text-sm text-muted">Картка заповнюється автоматично: щойно подія стається на етапі — клітинка закривається штампом. Збери лінію по горизонталі, вертикалі або діагоналі.</p>
      {!data ? (
        <Loader />
      ) : (
        <motion.div variants={stagger(0.03)} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-100px' }} className="mx-auto grid max-w-4xl grid-cols-5 gap-1.5 sm:gap-3">
          {data.map((cell, i) => (
            <BingoTile key={cell.id} cell={cell} highlight={inLine.has(i)} />
          ))}
        </motion.div>
      )}
    </section>
  );
}

function BingoTile({ cell, highlight }: { cell: BingoCell & { done: boolean }; highlight: boolean }) {
  const race = cell.fulfilledRound ? RACES.find((r) => r.round === cell.fulfilledRound) : undefined;
  return (
    <motion.div
      variants={{ hidden: { opacity: 0, scale: 0.8 }, show: { opacity: 1, scale: 1 } }}
      whileHover={{ y: -3 }}
      className={cn(
        'relative flex aspect-square flex-col items-center justify-center overflow-hidden rounded-lg border p-1.5 text-center sm:rounded-xl sm:p-3',
        cell.free ? 'border-f1-red bg-f1-red text-white' : highlight ? 'border-f1-red bg-f1-red/10' : cell.done ? 'border-line bg-surface-2' : 'border-line bg-surface',
      )}
    >
      {cell.free ? (
        <>
          <Sparkles className="h-5 w-5 sm:h-7 sm:w-7" />
          <span className="display mt-1 text-sm sm:text-xl">Free</span>
        </>
      ) : (
        <>
          <span className={cn('text-[9px] font-bold leading-tight sm:text-sm', cell.done && 'opacity-50')}>{cell.label}</span>
          {cell.done && (
            <motion.div
              variants={{ hidden: { opacity: 0, scale: 2.2, rotate: -30 }, show: { opacity: 1, scale: 1, rotate: -14, transition: { type: 'spring', stiffness: 300, damping: 14, delay: 0.3 } } }}
              className="absolute inset-0 grid place-items-center"
            >
              <div className="flex flex-col items-center rounded-full border-[3px] border-f1-red px-2 py-1 text-f1-red sm:border-4 sm:px-3 sm:py-2">
                <Check className="h-4 w-4 sm:h-6 sm:w-6" strokeWidth={3} />
                {race && <span className="hidden font-mono text-[10px] font-bold uppercase sm:block">R{race.round} {race.countryCode.toUpperCase()}</span>}
              </div>
            </motion.div>
          )}
        </>
      )}
    </motion.div>
  );
}
