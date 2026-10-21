import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Check, CheckCircle2, Copy, Download, Flag as FlagIcon, Gamepad2, Loader2, MonitorCheck, Swords, Trophy, X } from 'lucide-react';
import type { RaceEvent } from '../../shared/model/types';
import { CIRCUITS } from '../../shared/data/circuits';
import { REAL_LAPS } from '../../shared/mock/trackRecords';
import { ME } from '../../shared/mock/profile';
import { GAME, challengeCode, steamUri } from '../../shared/config/game';
import { fadeUp, stagger } from '../../shared/ui/motion';
import { saveLap } from '../../shared/lib/lapStore';
import { TrackOutline } from '../../shared/ui/TrackOutline';
import { cn, formatLapTime } from '../../shared/lib/utils';

type Step = 'guide' | 'driving' | 'result';
interface Outcome {
  lapTime: number;
  pb: boolean;
  previous?: number;
}

/** Pole the user races against: latest real pole on this circuit, else the season reference. */
function challengeTarget(ev: RaceEvent) {
  const real = REAL_LAPS[ev.circuitId]?.pole;
  return real ? { time: real.lapTime, label: `Поул ${real.year} · ${real.code}` } : { time: ev.poleLapTime, label: 'Орієнтир поулу' };
}

export function PoleChallengeButton({ ev, className }: { ev: RaceEvent; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <motion.button
        type="button"
        onClick={() => setOpen(true)}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        className={cn('group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-f1-red px-5 py-3 text-sm font-black uppercase tracking-wider text-white shadow-lg shadow-f1-red/30', className)}
      >
        <span className="speed-stripes pointer-events-none absolute inset-0 opacity-30" />
        <Swords className="relative h-4 w-4 transition group-hover:rotate-12" />
        <span className="relative">Кинути виклик поулу</span>
      </motion.button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] grid place-items-center bg-black/85 p-4" onClick={() => setOpen(false)}>
            <motion.div
              initial={{ scale: 0.94, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="relative max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-2xl border border-line bg-surface"
              onClick={(e) => e.stopPropagation()}
            >
              <ChallengeFlow ev={ev} onClose={() => setOpen(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function ChallengeFlow({ ev, onClose }: { ev: RaceEvent; onClose: () => void }) {
  const [step, setStep] = useState<Step>('guide');
  const [code] = useState(challengeCode);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const target = challengeTarget(ev);
  const circuit = CIRCUITS[ev.circuitId];

  const launch = () => {
    if (GAME.launchEnabled) window.location.href = steamUri();
    setStep('driving');
  };

  /** Called when SlipStream Telemetry uploads the lap (API / websocket); the demo calls it directly. */
  const receiveLap = (lapTime: number) => {
    const res = saveLap(
      { circuitId: ev.circuitId, round: ev.round, lapTime, setOn: new Date().toLocaleDateString('sv-SE') /* local YYYY-MM-DD */, source: 'steam' },
      ME.laps,
    );
    setOutcome({ lapTime, ...res });
    setStep('result');
  };

  return (
    <div>
      {/* header */}
      <div className="relative overflow-hidden border-b border-line bg-surface-2 p-6">
        <TrackOutline circuitId={ev.circuitId} className="pointer-events-none absolute -right-6 -top-4 h-40 w-64 text-ink/10" strokeWidth={5} />
        <button type="button" onClick={onClose} className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-surface text-muted hover:text-ink" aria-label="Закрити">
          <X className="h-4 w-4" />
        </button>
        <div className="relative text-xs font-bold uppercase tracking-[0.25em] text-f1-red">Pole challenge</div>
        <h2 className="display relative mt-1 text-3xl">{circuit?.name ?? ev.country}</h2>
        <div className="relative mt-4 flex items-end gap-6">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted">{target.label}</div>
            <div className="font-mono text-3xl font-bold">{formatLapTime(target.time)}</div>
          </div>
          <Stepper step={step} />
        </div>
      </div>

      <div className="p-6">
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
            {step === 'guide' && <Guide code={code} circuitName={circuit?.name ?? ev.country} onLaunch={launch} />}
            {step === 'driving' && <Driving target={target.time} code={code} onLap={receiveLap} onBack={() => setStep('guide')} />}
            {step === 'result' && outcome && <Result outcome={outcome} target={target.time} onRetry={() => setStep('driving')} onClose={onClose} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

const STEPS: Step[] = ['guide', 'driving', 'result'];
const STEP_LABEL: Record<Step, string> = { guide: 'Підготовка', driving: 'Заїзд', result: 'Результат' };

function Stepper({ step }: { step: Step }) {
  const at = STEPS.indexOf(step);
  return (
    <div className="ml-auto hidden gap-1.5 sm:flex">
      {STEPS.map((s, i) => (
        <div key={s} className="flex flex-col items-center gap-1">
          <span className={cn('h-1 w-14 rounded-full transition-colors', i <= at ? 'bg-f1-red' : 'bg-line')} />
          <span className={cn('text-[10px] font-bold uppercase', i === at ? 'text-ink' : 'text-muted')}>{STEP_LABEL[s]}</span>
        </div>
      ))}
    </div>
  );
}

function GuideStep({ n, icon, title, last, children }: { n: number; icon: React.ReactNode; title: string; last?: boolean; children: React.ReactNode }) {
  return (
    <motion.li variants={fadeUp} className={cn('relative flex gap-4', !last && 'pb-5')}>
      {!last && <span className="absolute bottom-0 left-5 top-11 w-px bg-line" />}
      <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line bg-surface-2 text-f1-red">
        {icon}
        <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-f1-red font-mono text-[9px] font-bold text-white">{n}</span>
      </span>
      <div className="min-w-0 flex-1 pt-1">
        <div className="font-bold">{title}</div>
        <div className="mt-1 text-sm text-muted">{children}</div>
      </div>
    </motion.li>
  );
}

function Guide({ code, circuitName, onLaunch }: { code: string; circuitName: string; onLaunch: () => void }) {
  const [copied, setCopied] = useState(false);
  const t = GAME.telemetry;
  const copy = () => {
    navigator.clipboard?.writeText(code).catch(() => {});
    setCopied(true);
  };
  return (
    <>
      <motion.ol variants={stagger(0.06)} initial="hidden" animate="show">
        <GuideStep n={1} icon={<Download className="h-4 w-4" />} title={`Завантаж ${t.name}`}>
          Невелика програма для Windows: читає телеметрію гри й надсилає твоє коло на SlipStream. Ставиться один раз.
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {t.downloadUrl ? (
              <a href={t.downloadUrl} className="inline-flex items-center gap-2 rounded-lg bg-ink px-3 py-2 text-xs font-bold text-bg hover:opacity-90">
                <Download className="h-3.5 w-3.5" /> Завантажити .exe
              </a>
            ) : (
              <span title="Інсталятор ще готується" className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg bg-ink/40 px-3 py-2 text-xs font-bold text-bg">
                <Download className="h-3.5 w-3.5" /> Завантажити .exe
              </span>
            )}
            <span className="font-mono text-[11px]">
              v{t.version} · Windows · {t.size}
            </span>
          </div>
        </GuideStep>
        <GuideStep n={2} icon={<MonitorCheck className="h-4 w-4" />} title="Запусти програму і введи код виклику">
          За кодом програма зрозуміє, до якого виклику прив&apos;язати коло.
          <button type="button" onClick={copy} className="mt-2 flex items-center gap-2 rounded-lg border border-dashed border-line bg-surface-2 px-3 py-2 font-mono text-lg font-bold tracking-widest text-ink transition hover:border-f1-red">
            {code}
            {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4 text-muted" />}
          </button>
        </GuideStep>
        <GuideStep n={3} icon={<Gamepad2 className="h-4 w-4" />} title={`Steam відкриє ${GAME.gameName}`}>
          Натисни кнопку нижче, і гра запуститься сама. Один раз увімкни в налаштуваннях гри <b className="text-ink">Telemetry → UDP: On</b>, порт <b className="font-mono text-ink">{GAME.udpPort}</b>.
        </GuideStep>
        <GuideStep n={4} icon={<FlagIcon className="h-4 w-4" />} title="Проїдь коло" last>
          Режим <b className="text-ink">Time Trial</b>, траса <b className="text-ink">{circuitName}</b>. Чисте коло автоматично потрапить у профіль.
        </GuideStep>
      </motion.ol>

      <button type="button" onClick={onLaunch} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-f1-red py-3.5 font-black uppercase tracking-wider text-white transition hover:brightness-110">
        <Gamepad2 className="h-4 w-4" /> Запустити гру в Steam
      </button>
      {!GAME.launchEnabled && <p className="mt-2 text-center text-xs text-muted">Поки що Steam не відкривається, бо гру ще не під&apos;єднали. Можна пройти демо-заїзд.</p>}
    </>
  );
}

/** Waits for the lap from SlipStream Telemetry. Demo mode drives a lap on fast-forward. */
function Driving({ target, code, onLap, onBack }: { target: number; code: string; onLap: (t: number) => void; onBack: () => void }) {
  const [demo, setDemo] = useState<{ lapTime: number; start: number } | null>(null);
  const [clock, setClock] = useState(0);

  useEffect(() => {
    if (!demo) return;
    const DURATION = 3200; // ms of real time for the whole lap
    let raf = 0;
    const tick = (now: number) => {
      const k = Math.min(1, (now - demo.start) / DURATION);
      setClock(k * demo.lapTime);
      if (k < 1) raf = requestAnimationFrame(tick);
      else onLap(demo.lapTime);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [demo, onLap]);

  const runDemo = () => {
    // a decent amateur: 1–5 % off the pole
    const lapTime = Math.round(target * (1.01 + Math.random() * 0.04) * 1000) / 1000;
    setDemo({ lapTime, start: performance.now() });
  };

  return (
    <div className="text-center">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-f1-red/10 text-f1-red">
        {demo ? <span className="pulse-dot h-3 w-3 rounded-full bg-f1-red" /> : <Loader2 className="h-7 w-7 animate-spin" />}
      </div>
      <div className="mt-3 font-bold">{demo ? 'Коло в процесі…' : 'Чекаємо на коло'}</div>
      <div className="mt-1 text-sm text-muted">Після фінішу SlipStream Telemetry надішле час, і він запишеться в профіль.</div>

      <div className="mx-auto mt-4 flex max-w-sm justify-center gap-2 font-mono text-[11px]">
        <Status ok={!!demo} label={demo ? 'Телеметрія: є сигнал' : 'Телеметрія: очікування'} />
        <span className="rounded-full bg-surface-2 px-2.5 py-1 text-muted">код {code}</span>
      </div>

      <div className="mt-5 font-mono text-5xl font-bold tabular-nums">{formatLapTime(clock)}</div>
      <div className="mx-auto mt-3 h-1.5 max-w-sm overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-f1-red" style={{ width: `${demo ? (clock / demo.lapTime) * 100 : 0}%` }} />
      </div>
      {!demo && (
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button type="button" onClick={runDemo} className="rounded-xl border border-dashed border-line px-5 py-2.5 text-sm font-bold text-muted transition hover:border-f1-red hover:text-f1-red">
            Демо: симулювати заїзд
          </button>
          <button type="button" onClick={onBack} className="rounded-xl px-4 py-2.5 text-sm font-bold text-muted hover:text-ink">
            До інструкції
          </button>
        </div>
      )}
    </div>
  );
}

function Status({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1', ok ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-amber-400/15 text-amber-700 dark:text-amber-300')}>
      <span className={cn('h-1.5 w-1.5 rounded-full', ok ? 'bg-emerald-500' : 'animate-pulse bg-amber-400')} />
      {label}
    </span>
  );
}

function Result({ outcome, target, onRetry, onClose }: { outcome: Outcome; target: number; onRetry: () => void; onClose: () => void }) {
  const delta = outcome.lapTime - target;
  const pct = (delta / target) * 100;
  const beat = delta < 0;
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {outcome.pb && (
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="inline-flex items-center gap-1 rounded-full bg-violet-500 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-white">
            <Trophy className="h-3 w-3" /> Особистий рекорд
          </motion.span>
        )}
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-3 w-3" /> {outcome.pb ? 'Збережено в профіль' : 'Спробу зараховано'}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted">Твоє коло</div>
          <div className="font-mono text-4xl font-bold">{formatLapTime(outcome.lapTime)}</div>
          {outcome.previous && !outcome.pb && <div className="font-mono text-xs text-muted">рекорд {formatLapTime(outcome.previous)}</div>}
          {outcome.previous && outcome.pb && <div className="font-mono text-xs text-emerald-500">−{(outcome.previous - outcome.lapTime).toFixed(3)} до попереднього</div>}
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted">До поулу</div>
          <div className={cn('font-mono text-4xl font-bold', beat ? 'text-emerald-500' : pct < 3 ? 'text-amber-500' : 'text-orange-500')}>
            {beat ? '−' : '+'}
            {Math.abs(delta).toFixed(3)}
          </div>
          <div className="font-mono text-xs text-muted">{pct.toFixed(2)}%</div>
        </div>
      </div>
      {/* gap bar: 0 % = pole, 5 % = right edge */}
      <div className="relative mt-5 h-2 rounded-full bg-gradient-to-r from-emerald-500 via-amber-400 to-orange-500">
        <motion.span
          initial={{ left: 0 }}
          animate={{ left: `${Math.min(100, Math.max(0, (pct / 5) * 100))}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-ink"
        />
      </div>
      <div className="mt-1 flex justify-between font-mono text-[10px] text-muted">
        <span>поул</span>
        <span>+5%</span>
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        <Link to="/profile" onClick={onClose} className="flex-1 rounded-xl bg-f1-red py-3 text-center font-black uppercase tracking-wider text-white hover:brightness-110">
          Дивитись у профілі
        </Link>
        <button type="button" onClick={onRetry} className="rounded-xl border border-line px-4 py-3 text-sm font-bold hover:bg-surface-2">
          Ще спроба
        </button>
      </div>
    </div>
  );
}
