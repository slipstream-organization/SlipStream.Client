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

  // HUD nodes updated imperatively every frame (no React re-render)
  const timeEl = useRef<HTMLSpanElement>(null);
  const progressEl = useRef<HTMLDivElement>(null);
  const gapEls = useRef<(HTMLSpanElement | null)[]>([]);
  const toastEl = useRef<HTMLDivElement>(null);
  const prevT = useRef(0);

  const onTick = useCallback(
    (t: number, indices: number[]) => {
      const tm = Math.min(t, main.lapTime);
      if (timeEl.current) timeEl.current.textContent = formatLapTime(tm);
      if (progressEl.current) progressEl.current.style.transform = `scaleX(${tm / main.lapTime})`;

      // live gap: compare times at the main car's current distance
      const i0 = Math.min(main.n - 1, Math.floor(indices[0]));
      for (let k = 1; k < laps.length; k++) {
        const el = gapEls.current[k];
        if (!el) continue;
        const gap = t >= main.lapTime ? main.lapTime - laps[k].lapTime : main.time[i0] - laps[k].time[i0];
        el.textContent = `${gap >= 0 ? '+' : '−'}${Math.abs(gap).toFixed(3)}`;
        el.style.color = gap > 0.0005 ? '#ff6b6b' : '#4ade80';
      }

      if (prevT.current < main.lapTime && t >= main.lapTime && toastEl.current) {
        toastEl.current.animate([{ opacity: 0, transform: 'translate(-50%, 8px)' }, { opacity: 1, transform: 'translate(-50%, 0)' }, { opacity: 1 }, { opacity: 0 }], {
          duration: 2400,
          easing: 'ease-out',
        });
      }
      prevT.current = t;
    },
    [main, laps],
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
    <div ref={root} className={cn('relative isolate aspect-[4/5] w-full overflow-hidden rounded-xl bg-[#cdd0d4] font-mono text-white select-none sm:aspect-video', className)}>
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

      {/* title + legend */}
      <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/55 to-transparent p-3 sm:p-4">
        <div className="flex min-w-0 items-center gap-3 text-[10px] tracking-[0.18em] sm:text-xs">
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-white/50">
            <span className="h-1.5 w-1.5 rounded-full bg-white" />
          </span>
          <span className="font-bold tracking-normal">slipstream</span>
          <span className="truncate uppercase text-white/75">{title}</span>
        </div>
        <ul className={'mt-3 inline-flex flex-col gap-1 rounded-lg bg-black/45 p-2 backdrop-blur-sm sm:mt-4'}>
          {runs.map((r, k) => (
            <li key={k} className="flex items-center gap-2 text-[10px] sm:text-xs">
              <span className={cn('h-2.5 w-2.5 shrink-0 rounded-sm', k === 0 && 'ring-1 ring-white/60')} style={{ background: k === 0 ? '#9a9da2' : r.color }} />
              <span className="font-bold">{r.label}</span>
              {r.detail && <span className="text-white/55">{r.detail}</span>}
              <span className="ml-auto pl-3 tabular-nums text-white/85">{formatLapTime(r.lapTime)}</span>
              {k > 0 && <span ref={(el) => void (gapEls.current[k] = el)} className="w-[58px] text-right tabular-nums">+0.000</span>}
            </li>
          ))}
        </ul>
      </div>

      {/* lap-complete toast */}
      <div ref={toastEl} className="pointer-events-none absolute left-1/2 top-[40%] -translate-x-1/2 rounded-md bg-black/65 px-4 py-2 text-center opacity-0 backdrop-blur">
        <div className="text-[10px] uppercase tracking-[0.2em] text-white/60">{runs[0].label}</div>
        <div className="text-2xl font-bold">{formatLapTime(main.lapTime)}</div>
      </div>

      {/* timer */}
      <div className="pointer-events-none absolute bottom-[96px] left-3 sm:bottom-6 sm:left-4">
        <div className="text-[10px] uppercase tracking-[0.2em] text-white/50">lap time</div>
        <span ref={timeEl} className="text-3xl font-bold leading-none tabular-nums sm:text-5xl">
          0:00.000
        </span>
      </div>

      {/* controls */}
      <div className="absolute bottom-5 right-3 flex flex-col items-end gap-2 sm:bottom-6 sm:right-4">
        <div className="flex gap-1 rounded-full bg-black/50 p-1 backdrop-blur">
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

function IconBtn({ children, label, onClick }: { children: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} className="grid h-7 w-7 place-items-center rounded-full text-white/80 transition hover:bg-white/15 hover:text-white">
      {children}
    </button>
  );
}
