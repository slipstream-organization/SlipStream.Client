import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Copy, Download, Gamepad2, Swords, X } from 'lucide-react';
import type { RaceEvent } from '../../shared/model/types';
import { CIRCUITS } from '../../shared/data/circuits';
import { REAL_LAPS } from '../../shared/mock/trackRecords';
import { ME } from '../../shared/mock/profile';
import { GAME, challengeCode, steamUri } from '../../shared/config/game';
import { EASE_OUT, MOTION, fadeUp, stagger } from '../../shared/ui/motion';
import { Dialog } from '../../shared/ui/Dialog';
import { buttonClass } from '../../shared/ui/Button';
import { Tag } from '../../shared/ui/Tag';
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
  return real ? { time: real.lapTime, label: `Поул ${real.year}, ${real.code}` } : { time: ev.poleLapTime, label: 'Орієнтир поулу' };
}

export function PoleChallengeButton({ ev, className }: { ev: RaceEvent; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={buttonClass('primary', className)}>
        <Swords className="h-4 w-4" aria-hidden />
        Кинути виклик поулу
      </button>
      <AnimatePresence>
        {open && (
          <Dialog label="Виклик поулу" onClose={() => setOpen(false)} panelClassName="max-w-2xl">
            <ChallengeFlow ev={ev} onClose={() => setOpen(false)} />
          </Dialog>
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
      {/* header: a small poster — circuit as backdrop, the time to beat in big digits */}
      <header className="relative isolate overflow-hidden border-b border-line px-6 pb-5 pt-6 md:px-8">
        <TrackOutline circuitId={ev.circuitId} className="pointer-events-none absolute -right-8 -top-6 -z-10 h-48 w-80 text-ink opacity-[0.08]" strokeWidth={5} />
        <button type="button" onClick={onClose} className="absolute right-3 top-3 grid h-11 w-11 place-items-center rounded-md text-muted hover:bg-surface-2 hover:text-ink" aria-label="Закрити">
          <X className="h-5 w-5" aria-hidden />
        </button>
        <Tag>Виклик поулу</Tag>
        <h2 className="display mt-2 pr-10 text-3xl md:text-4xl">{circuit?.name ?? ev.country}</h2>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <div>
            <p className="text-sm text-muted">{target.label}</p>
            <p className="digits text-4xl font-bold leading-none md:text-5xl">{formatLapTime(target.time)}</p>
          </div>
          <Stepper step={step} />
        </div>
      </header>

      <div className="px-6 py-6 md:px-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0, transition: { duration: MOTION.base, ease: EASE_OUT } }}
            exit={{ opacity: 0, x: -12, transition: { duration: MOTION.fast } }}
          >
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

/** Three-stage rail: done stages fill red (scaleX), the current one is labelled in ink. */
function Stepper({ step }: { step: Step }) {
  const at = STEPS.indexOf(step);
  return (
    <ol className="flex gap-2" aria-label="Етапи виклику">
      {STEPS.map((s, i) => (
        <li key={s} className="w-24" aria-current={i === at ? 'step' : undefined}>
          <span className="relative block h-1 overflow-hidden bg-line">
            <span className={cn('absolute inset-0 origin-left bg-accent motion-safe:transition-transform motion-safe:duration-300', i <= at ? 'scale-x-100' : 'scale-x-0')} />
          </span>
          <span className={cn('mt-1.5 flex items-baseline gap-1.5 text-sm', i === at ? 'font-semibold text-ink' : 'text-muted')}>
            <span className="digits text-xs">{i + 1}</span>
            {STEP_LABEL[s]}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** A numbered step — the content really is a sequence, so the numbers carry meaning. */
function GuideStep({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <motion.li variants={fadeUp} className="grid grid-cols-[2.75rem_1fr] gap-x-4 border-b border-line py-4 first:pt-0 last:border-0">
      <span aria-hidden className="display-wide text-3xl leading-none text-accent-ink">
        {n}
      </span>
      <div className="min-w-0">
        <h3 className="headline text-lg">{title}</h3>
        <div className="mt-1 text-[15px] leading-relaxed text-muted">{children}</div>
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
      <motion.ol variants={stagger(0.03)} initial="hidden" animate="show">
        <GuideStep n={1} title={`Завантаж ${t.name}`}>
          Невелика програма для Windows: читає телеметрію гри й надсилає твоє коло на SlipStream. Ставиться один раз.
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {t.downloadUrl ? (
              <a href={t.downloadUrl} className={buttonClass('secondary', 'min-h-10 px-4 text-xs')}>
                <Download className="h-4 w-4" aria-hidden /> Завантажити .exe
              </a>
            ) : (
              <span aria-disabled className={buttonClass('secondary', 'pointer-events-none min-h-10 px-4 text-xs opacity-50')} title="Інсталятор ще готується">
                <Download className="h-4 w-4" aria-hidden /> Завантажити .exe
              </span>
            )}
            <span className="tnum text-xs text-ink">
              v{t.version}, Windows, {t.size}
            </span>
          </div>
        </GuideStep>
        <GuideStep n={2} title="Запусти програму і введи код виклику">
          За кодом програма зрозуміє, до якого виклику прив&apos;язати коло.
          <button
            type="button"
            onClick={copy}
            className="mt-3 flex min-h-11 items-center gap-3 rounded-md border border-line bg-surface-2 px-4 text-ink hover:border-rule"
            aria-label={`Скопіювати код ${code}`}
          >
            <span className="digits text-xl font-bold tracking-[0.12em]">{code}</span>
            <span className={cn('flex items-center gap-1 text-xs font-semibold', copied ? 'text-sector-green' : 'text-muted')}>
              {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
              {copied ? 'Скопійовано' : 'Копіювати'}
            </span>
          </button>
        </GuideStep>
        <GuideStep n={3} title={`Steam відкриє ${GAME.gameName}`}>
          Натисни кнопку нижче, і гра запуститься сама. Один раз увімкни в налаштуваннях гри <b className="font-semibold text-ink">Telemetry → UDP: On</b>, порт{' '}
          <b className="digits font-semibold text-ink">{GAME.udpPort}</b>.
        </GuideStep>
        <GuideStep n={4} title="Проїдь коло">
          Режим <b className="font-semibold text-ink">Time Trial</b>, траса <b className="font-semibold text-ink">{circuitName}</b>. Чисте коло автоматично потрапить у профіль.
        </GuideStep>
      </motion.ol>

      <button type="button" onClick={onLaunch} className={buttonClass('primary', 'mt-6 w-full')}>
        <Gamepad2 className="h-4 w-4" aria-hidden /> Запустити гру в Steam
      </button>
      {!GAME.launchEnabled && <p className="mt-3 text-center text-sm text-muted">Steam поки не відкривається: гру ще не підʼєднали. Можна пройти демо-заїзд.</p>}
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
    <div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <Tag tone={demo ? 'green' : 'yellow'}>{demo ? 'Телеметрія: є сигнал' : 'Телеметрія: чекаємо на сигнал'}</Tag>
        <span className="tnum text-sm text-muted">
          Код виклику <span className="digits font-semibold text-ink">{code}</span>
        </span>
      </div>
      <h3 className="headline mt-4 text-2xl" aria-live="polite">
        {demo ? 'Коло в процесі' : 'Чекаємо на твоє коло'}
      </h3>
      <p className="mt-1 text-[15px] text-muted">Після фінішу SlipStream Telemetry надішле час, і він запишеться в профіль.</p>

      <p className="digits mt-6 text-6xl font-bold leading-none" role="timer">
        {formatLapTime(clock)}
      </p>
      <div className="mt-4 h-1 overflow-hidden bg-line">
        <div className="h-full origin-left bg-accent" style={{ transform: `scaleX(${demo ? clock / demo.lapTime : 0})` }} />
      </div>
      {!demo && (
        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" onClick={runDemo} className={buttonClass('secondary')}>
            Демо: симулювати заїзд
          </button>
          <button type="button" onClick={onBack} className={buttonClass('ghost')}>
            До інструкції
          </button>
        </div>
      )}
    </div>
  );
}

function Result({ outcome, target, onRetry, onClose }: { outcome: Outcome; target: number; onRetry: () => void; onClose: () => void }) {
  const delta = outcome.lapTime - target;
  const pct = (delta / target) * 100;
  const beat = delta < 0;
  // sector logic: purple = faster than pole, green = within 3 %, yellow = slower
  const tone = beat ? 'text-sector-purple' : pct < 3 ? 'text-sector-green' : 'text-sector-yellow';
  const at = Math.min(1, Math.max(0, pct / 5)); // marker position on the 0…5 % scale
  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {outcome.pb && <Tag tone="purple">Особистий рекорд</Tag>}
        <Tag tone="green">{outcome.pb ? 'Збережено в профіль' : 'Спробу зараховано'}</Tag>
      </div>
      <dl className="mt-5 grid grid-cols-2 divide-x divide-line border-y border-line">
        <div className="py-4 pr-4">
          <dt className="text-sm text-muted">Твоє коло</dt>
          <dd className="digits mt-1 text-4xl font-bold leading-none">{formatLapTime(outcome.lapTime)}</dd>
          {outcome.previous && !outcome.pb && <dd className="tnum mt-2 text-sm text-muted">Рекорд {formatLapTime(outcome.previous)}</dd>}
          {outcome.previous && outcome.pb && <dd className="tnum mt-2 text-sm text-sector-green">−{(outcome.previous - outcome.lapTime).toFixed(3)} до попереднього</dd>}
        </div>
        <div className="py-4 pl-4">
          <dt className="text-sm text-muted">До поулу</dt>
          <dd className={cn('digits mt-1 text-4xl font-bold leading-none', tone)}>
            {beat ? '−' : '+'}
            {Math.abs(delta).toFixed(3)}
          </dd>
          <dd className="tnum mt-2 text-sm text-muted">{pct.toFixed(2)}%</dd>
        </div>
      </dl>

      {/* gap scale in sector colours: pole → 3 % (green) → 5 % (yellow); the marker slides on transform */}
      <div className="mt-6">
        <div className="relative h-2">
          <div className="absolute inset-0 flex">
            <span className="h-full w-[60%] bg-sector-green" />
            <span className="h-full w-[40%] bg-sector-yellow" />
          </div>
          <motion.span
            aria-hidden
            className="absolute inset-y-0 left-0 w-full"
            initial={{ x: '0%' }}
            animate={{ x: `${at * 100}%` }}
            transition={{ duration: MOTION.slow, ease: EASE_OUT }}
          >
            <span className="absolute -top-1 h-4 w-1 -translate-x-1/2 bg-ink" />
          </motion.span>
        </div>
        <div className="tnum relative mt-1.5 h-4 text-xs text-muted">
          <span className="absolute left-0">поул</span>
          <span className="absolute left-[60%] -translate-x-1/2">+3%</span>
          <span className="absolute right-0">+5%</span>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link to="/profile" onClick={onClose} className={buttonClass('primary', 'flex-1')}>
          Дивитись у профілі
        </Link>
        <button type="button" onClick={onRetry} className={buttonClass('secondary')}>
          Ще спроба
        </button>
      </div>
    </div>
  );
}
