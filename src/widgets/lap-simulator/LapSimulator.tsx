import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Maximize2, Pause, Play, RotateCcw } from 'lucide-react';
import { getLap, getProLap } from './lapModel';
import { TrackScene, type CameraMode } from './TrackScene';
import { SimClock } from './simClock';
import { CIRCUITS } from '../../shared/data/circuits';
import { cn, formatLapTime } from '../../shared/lib/utils';

/** One car on track. The first run is the main (grey) car, the rest are coloured ghosts. */
export interface SimRun {
  label: string; // e.g. "Твоє коло", "Поул 2026"
  detail?: string; // e.g. "RUS", "HAM · 2020"
  lapTime: number;
  color: string;
  /** amateur driving-style seed; omit for pro laps (they get a subtle style of their own) */
  style?: number;
}

export interface LapSimulatorProps {
  circuitId: string;
  title: string; // e.g. "2026 UNITED STATES GP · QUALIFYING"
  runs: SimRun[];
  autoPlay?: boolean;
  className?: string;
}

const RATES = [0.5, 1, 2, 4];
const CAMS: { id: CameraMode; label: string }[] = [
  { id: 'chase', label: 'Onboard' },
  { id: 'heli', label: 'Heli' },
  { id: 'top', label: 'Карта' },
];

export default function LapSimulator({ circuitId, title, runs, autoPlay = true, className }: LapSimulatorProps) {
  const circuit = CIRCUITS[circuitId];
  const runsKey = runs.map((r) => `${r.lapTime}:${r.style ?? ''}`).join('|');
  const laps = useMemo(
    () => runs.map((r) => (r.style !== undefined ? getLap(circuit.points, r.lapTime, circuit.length, r.style) : getProLap(circuit.points, r.lapTime, circuit.length))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [circuit, runsKey],
  );
  const sceneRuns = useMemo(() => laps.map((lap, k) => ({ lap, color: runs[k].color, ghost: k > 0 })), [laps, runs]);
  const main = laps[0];
  const period = Math.max(...laps.map((l) => l.lapTime)) + 1.5;

  const root = useRef<HTMLDivElement>(null);
  const clock = useRef(new SimClock(autoPlay));
  const [playing, setPlaying] = useState(autoPlay);
  const [rate, setRate] = useState(1);
  const [cam, setCam] = useState<CameraMode>('heli');
  const [visible, setVisible] = useState(true);

  // gap ruler: 0 on the right, the biggest gap that occurs during the lap on the left
  const ruler = useMemo(() => {
    let max = 0;
    for (let i = 0; i < main.n; i += 4) {
      let lo = Infinity, hi = -Infinity;
      for (const l of laps) {
        lo = Math.min(lo, l.time[i]);
        hi = Math.max(hi, l.time[i]);
      }
      max = Math.max(max, hi - lo);
    }
    const lapTimes = laps.map((l) => l.lapTime);
    max = Math.max(max, Math.max(...lapTimes) - Math.min(...lapTimes));
    const step = [0.1, 0.2, 0.5, 1, 2, 5, 10].find((s) => max / s <= 24) ?? 20;
    const count = Math.max(10, Math.ceil(max / step));
    return { step, range: count * step, ticks: Array.from({ length: count + 1 }, (_, i) => i) };
  }, [laps, main]);

  // HUD nodes updated imperatively every frame (no React re-render)
  const timeEls = useRef<(HTMLSpanElement | null)[]>([]);
  const progressEl = useRef<HTMLDivElement>(null);
  const gapEls = useRef<(HTMLSpanElement | null)[]>([]);
  const bigGapEl = useRef<HTMLSpanElement>(null);
  const markerEls = useRef<(HTMLDivElement | null)[]>([]);
  const toastEl = useRef<HTMLDivElement>(null);
  const prevT = useRef(0);

  const onTick = useCallback(
    (t: number, indices: number[]) => {
      const tm = Math.min(t, main.lapTime);
      if (progressEl.current) progressEl.current.style.transform = `scaleX(${tm / main.lapTime})`;
      laps.forEach((l, k) => {
        const el = timeEls.current[k];
        if (el) el.textContent = formatLapTime(Math.min(t, l.lapTime));
      });

      // live gap: compare times at the main car's current distance
      const i0 = Math.min(main.n - 1, Math.floor(indices[0]));
      const passed = laps.map((l) => (t >= main.lapTime ? l.lapTime : l.time[i0]));
      for (let k = 1; k < laps.length; k++) {
        const gap = passed[0] - passed[k];
        const text = `${gap >= 0 ? '+' : '−'}${Math.abs(gap).toFixed(3)}`;
        const el = gapEls.current[k];
        if (el) {
          el.textContent = text;
          el.style.color = gap > 0.0005 ? '#ff6b6b' : '#4ade80';
        }
        if (k === 1 && bigGapEl.current) bigGapEl.current.textContent = text;
      }
      const lead = Math.min(...passed);
      passed.forEach((p, k) => {
        const el = markerEls.current[k];
        if (el) el.style.right = `${Math.min(1, (p - lead) / ruler.range) * 100}%`;
      });

      if (prevT.current < main.lapTime && t >= main.lapTime && toastEl.current) {
        toastEl.current.animate([{ opacity: 0, transform: 'translate(-50%, 8px)' }, { opacity: 1, transform: 'translate(-50%, 0)' }, { opacity: 1 }, { opacity: 0 }], {
          duration: 2400,
          easing: 'ease-out',
        });
      }
      prevT.current = t;
    },
    [main, laps, ruler],
  );

  // pause rendering while off-screen
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    clock.current.playing = playing;
    clock.current.rate = rate;
  }, [playing, rate]);

  useEffect(() => {
    clock.current.t = 0;
    prevT.current = 0;
  }, [laps]);

  const seek = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const f = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    clock.current.t = f * main.lapTime;
    prevT.current = clock.current.t;
  };

  return (
    <div ref={root} className={cn('relative isolate aspect-[4/5] w-full overflow-hidden rounded-xl bg-[#050507] font-mono text-white select-none sm:aspect-video', className)}>
      <Canvas
        shadows="soft"
        dpr={[1, 1.5]}
        resize={{ offsetSize: true }}
        frameloop={visible ? 'always' : 'never'}
        camera={{ fov: 45, near: 0.5, far: 30000, position: [0, 600, 600] }}
        gl={{ antialias: true, logarithmicDepthBuffer: true }}
        onCreated={({ gl }) => {
          // the scene is static apart from the cars → render shadows on demand only
          gl.shadowMap.autoUpdate = false;
        }}
      >
        <TrackScene runs={sceneRuns} period={period} clock={clock} cameraMode={cam} onTick={onTick} />
      </Canvas>

      {/* side vignette so the HUD reads over the scene */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-black/70 to-transparent sm:w-[38%]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent" />

      {/* title + camera */}
      <div className="absolute inset-x-0 top-0 flex items-center gap-3 bg-gradient-to-b from-black/70 to-transparent p-3 sm:p-4">
        <div className="pointer-events-none flex min-w-0 items-center gap-3 text-[10px] tracking-[0.18em] sm:text-xs">
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-white/50">
            <span className="h-1.5 w-1.5 rounded-full bg-white" />
          </span>
          <span className="font-bold tracking-normal">slipstream</span>
          <span className="truncate uppercase text-white/75">{title}</span>
        </div>
        <div className="ml-auto flex shrink-0 gap-1 rounded-full bg-black/50 p-1 backdrop-blur">
          {CAMS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCam(c.id)}
              className={cn('rounded-full px-2.5 py-1 text-[10px] uppercase tracking-wider transition sm:text-xs', cam === c.id ? 'bg-white text-black' : 'text-white/70 hover:text-white')}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* driver cards */}
      <ul className="pointer-events-none absolute left-3 top-12 flex flex-col gap-2.5 sm:left-5 sm:top-16 sm:gap-4">
        {runs.map((r, k) => (
          <li key={k} className="flex items-center gap-2.5 sm:gap-3.5">
            <div
              className="grid h-11 w-11 shrink-0 place-items-center rounded-md shadow-[0_0_24px_-6px_var(--glow)] sm:h-16 sm:w-16"
              style={{ background: `linear-gradient(155deg, ${r.color}, color-mix(in srgb, ${r.color} 45%, #000))`, '--glow': r.color } as React.CSSProperties}
            >
              <span className="font-sport text-sm font-black tracking-wide text-black/80 sm:text-xl">{runCode(r)}</span>
            </div>
            <div className="min-w-0">
              <div className="truncate font-sport text-xs font-bold uppercase leading-tight sm:text-base">{r.label}</div>
              {r.detail && <div className="truncate text-[9px] uppercase tracking-[0.22em] text-white/55 sm:text-[10px]">{r.detail}</div>}
              <div className="flex items-baseline gap-2">
                <span ref={(el) => void (timeEls.current[k] = el)} className="font-sport text-lg font-bold leading-tight tabular-nums sm:text-[28px]">
                  0:00.000
                </span>
                {k > 0 && <span ref={(el) => void (gapEls.current[k] = el)} className="text-[10px] tabular-nums sm:text-xs">+0.000</span>}
              </div>
            </div>
          </li>
        ))}
      </ul>

      {/* big gap + gap ruler */}
      {runs.length > 1 && (
        <div className="pointer-events-none absolute inset-x-3 bottom-14 sm:bottom-6 sm:left-auto sm:right-5 sm:w-[56%]">
          <div className="mb-2 text-right">
            <div className="text-[9px] uppercase tracking-[0.22em] text-white/50 sm:text-[10px]">vs {runs[1].label}</div>
            <span ref={bigGapEl} className="font-sport text-4xl font-bold leading-none tabular-nums sm:text-6xl">
              +0.000
            </span>
          </div>
          <div className="relative h-3.5 text-[8px] text-white/60 sm:text-[9px]">
            {ruler.ticks.map((i) => (
              <span key={i} className={cn('absolute translate-x-1/2 tabular-nums', i % 5 && 'hidden sm:block')} style={{ right: `${(i / (ruler.ticks.length - 1)) * 100}%` }}>
                {(i * ruler.step).toFixed(ruler.step < 1 ? 1 : 0)}
              </span>
            ))}
          </div>
          {runs.map((r, k) => (
            <div key={k} className="relative h-6 sm:h-7">
              {ruler.ticks.map((i) => (
                <span
                  key={i}
                  className={cn('absolute top-1/2 w-px -translate-y-1/2', i % 5 ? 'h-2 bg-white/25' : 'h-4 bg-white/50')}
                  style={{ right: `${(i / (ruler.ticks.length - 1)) * 100}%` }}
                />
              ))}
              <div
                ref={(el) => void (markerEls.current[k] = el)}
                className="absolute top-1/2 -translate-y-1/2 rounded-sm px-1.5 py-0.5 font-sport text-[10px] font-black text-black/85 sm:text-xs"
                style={{ right: 0, background: r.color, boxShadow: `0 0 14px ${r.color}` }}
              >
                {runCode(r)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* lap-complete toast */}
      <div ref={toastEl} className="pointer-events-none absolute left-1/2 top-[40%] -translate-x-1/2 rounded-md bg-black/65 px-4 py-2 text-center opacity-0 backdrop-blur">
        <div className="text-[10px] uppercase tracking-[0.2em] text-white/60">{runs[0].label}</div>
        <div className="text-2xl font-bold">{formatLapTime(main.lapTime)}</div>
      </div>

      {/* controls */}
      <div className="absolute bottom-4 left-3 sm:left-5">
        <div className="flex items-center gap-1 rounded-full bg-black/50 p-1 backdrop-blur">
          <IconBtn label={playing ? 'Пауза' : 'Відтворити'} onClick={() => setPlaying((p) => !p)}>
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </IconBtn>
          <IconBtn
            label="Спочатку"
            onClick={() => {
              clock.current.t = 0;
              prevT.current = 0;
            }}
          >
            <RotateCcw className="h-4 w-4" />
          </IconBtn>
          {RATES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRate(r)}
              className={cn('rounded-full px-2 py-1 text-[10px] transition sm:text-xs', rate === r ? 'bg-white text-black' : 'text-white/70 hover:text-white')}
            >
              {r}×
            </button>
          ))}
          <IconBtn label="На весь екран" onClick={() => (document.fullscreenElement ? document.exitFullscreen() : root.current?.requestFullscreen())}>
            <Maximize2 className="h-4 w-4" />
          </IconBtn>
        </div>
      </div>

      {/* progress line — click / drag to seek */}
      <div
        className="group absolute inset-x-0 bottom-0 h-3 cursor-pointer"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          seek(e);
        }}
        onPointerMove={(e) => e.buttons === 1 && seek(e)}
        title="Клікни, щоб перемотати"
      >
        <div className="absolute inset-x-0 bottom-0 h-[3px] bg-white/15 transition-all group-hover:h-[6px]">
          <div ref={progressEl} className="h-full origin-left bg-f1-red" style={{ transform: 'scaleX(0)' }} />
        </div>
      </div>
    </div>
  );
}

/** Three-letter tag for cards and the gap ruler: "HAM · 2020" → HAM, "Поул 2026" → ПОУ. */
function runCode(r: SimRun) {
  return (r.detail || r.label).split(/[\s·]+/)[0].slice(0, 3).toUpperCase();
}

function IconBtn({ children, label, onClick }: { children: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} className="grid h-7 w-7 place-items-center rounded-full text-white/80 transition hover:bg-white/15 hover:text-white">
      {children}
    </button>
  );
}
