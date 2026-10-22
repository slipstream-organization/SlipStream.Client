import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { CloudRain, Droplets, Gauge, MousePointerClick, Pause, Play, RotateCcw, Thermometer, Timer, Wind } from 'lucide-react';
import { simulateLive } from '../ai-preview/liveModel';
import { COMPOUND } from '../ai-preview/racePrediction';
import { GeneratedBadge } from '../ai-preview/AiPreview';
import { getProLap } from '../lap-simulator/lapModel';
import { CIRCUITS } from '../../shared/data/circuits';
import { DRIVER_BY_CODE, TEAM_BY_ID } from '../../shared/mock/season';
import type { RaceEvent } from '../../shared/model/types';
import { DriverBadge, Segmented } from '../../shared/ui/atoms';
import { cn, formatLapTime } from '../../shared/lib/utils';
import { leaderFinishTime, mockWeather, raceDuration, telemetry, timingAt, type CarState } from './timingModel';
import { TrackMap } from './TrackMap';
import { TimingTower, type GapMode } from './TimingTower';

type Speed = '1' | '4' | '16' | '60';

/** Live race centre: track map with every car, broadcast timing tower and key metrics. */
export function LiveTiming({ ev, demo }: { ev: RaceEvent; demo?: boolean }) {
  const race = useMemo(() => simulateLive(ev.round), [ev.round]);
  const end = useMemo(() => raceDuration(race) + 3, [race]);
  const startT = useMemo(() => Math.min(...race.codes.map((c) => race.cum[c][Math.min(10, race.laps)])) + 25, [race]);
  const [t, setT] = useState(startT);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState<Speed>('4');
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [gapMode, setGapMode] = useState<GapMode>('interval');
  const last = useRef<number | null>(null);

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const tick = (now: number) => {
      const dt = last.current === null ? 0 : Math.min(0.1, (now - last.current) / 1000);
      last.current = now;
      setT((v) => Math.min(end, v + dt * Number(speed)));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      last.current = null;
    };
  }, [playing, speed, end]);

  const timing = useMemo(() => timingAt(race, t), [race, t]);
  // the tower updates a few times a second, like a real timing screen
  const tq = Math.floor(t * 4) / 4;
  const towerTiming = useMemo(() => timingAt(race, tq), [race, tq]);

  const circuit = CIRCUITS[ev.circuitId];
  const lapModel = useMemo(() => (circuit ? getProLap(circuit.points, ev.poleLapTime, circuit.length) : null), [circuit, ev.poleLapTime]);
  const weather = useMemo(() => mockWeather(ev.round), [ev.round]);
  const focus = timing.cars.find((c) => c.code === selected);
  const winnerT = leaderFinishTime(race);
  const stops = towerTiming.cars.reduce((a, c) => a + c.pitStops, 0);

  const restart = () => {
    setT(0);
    setPlaying(true);
  };

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <h2 className="display text-3xl">Live Timing</h2>
        <span className="flex items-center gap-1.5 rounded-full bg-f1-red px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-white">
          <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-white" /> {demo ? 'Демо' : 'Live'}
        </span>
        <GeneratedBadge note="Позиції, відриви, шини й піт-стопи — з симуляції гонки. Під час реальної гонки сюди підуть дані live-таймінгу; перепад висот траси поки приблизний." />
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Segmented
            layoutKey="live-speed"
            size="sm"
            value={speed}
            onChange={setSpeed}
            options={(['1', '4', '16', '60'] as Speed[]).map((s) => ({ value: s, label: `${s}×` }))}
          />
          <button type="button" onClick={() => setPlaying((p) => !p)} className="grid h-8 w-8 place-items-center rounded-full border border-line hover:border-f1-red" aria-label={playing ? 'Пауза' : 'Відтворити'}>
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <button type="button" onClick={restart} className="grid h-8 w-8 place-items-center rounded-full border border-line hover:border-f1-red" aria-label="Зі старту">
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_390px]">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="card overflow-hidden p-1.5">
            <TrackMap
              circuitId={ev.circuitId}
              lapTime={ev.poleLapTime}
              timing={timing}
              selected={selected}
              hovered={hovered}
              onSelect={setSelected}
              onHover={setHovered}
            />
            {/* race clock scrubber */}
            <div className="flex items-center gap-3 px-2 pb-1.5 pt-2">
              <span className="w-16 font-mono text-[11px] text-muted">{clock(Math.min(t, winnerT))}</span>
              <input
                type="range"
                min={0}
                max={end}
                step={0.5}
                value={t}
                onChange={(e) => setT(Number(e.target.value))}
                className="h-1 flex-1 cursor-pointer accent-f1-red"
                aria-label="Час гонки"
              />
              <span className="w-16 text-right font-mono text-[11px] text-muted">{clock(winnerT)}</span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="sm:col-span-2">
              {focus && lapModel ? <DriverFocus car={focus} tele={telemetry(lapModel, focus)} /> : <FocusHint />}
            </div>
            <FastestLapCard timing={towerTiming} />
            <div className="card flex flex-col justify-between gap-2 p-4">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted">Погода · траса</div>
              <div className="grid gap-1 text-sm">
                <Metric icon={<Thermometer className="h-3.5 w-3.5" />} label="Повітря" value={`${weather.air}°`} />
                <Metric icon={<Gauge className="h-3.5 w-3.5" />} label="Траса" value={`${weather.track}°`} />
                <Metric icon={<Droplets className="h-3.5 w-3.5" />} label="Волог." value={`${weather.humidity}%`} />
                <Metric icon={<Wind className="h-3.5 w-3.5" />} label="Вітер" value={`${weather.wind} м/с`} />
              </div>
              <div className="flex items-center justify-between border-t border-line pt-2 text-[11px] text-muted">
                <span className="flex items-center gap-1"><CloudRain className="h-3.5 w-3.5" /> дощ {weather.rainChance}%</span>
                <span>піт-стопів: <b className="text-ink">{stops}</b></span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:min-h-0">
          <TimingTower
            timing={towerTiming}
            laps={race.laps}
            gapMode={gapMode}
            onGapMode={setGapMode}
            selected={selected}
            hovered={hovered}
            onSelect={setSelected}
            onHover={setHovered}
          />
        </div>
      </div>
    </section>
  );
}

function clock(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-muted">{icon}</span>
      <span className="text-[11px] text-muted">{label}</span>
      <span className="ml-auto font-mono font-bold">{value}</span>
    </div>
  );
}

function FocusHint() {
  return (
    <div className="card flex h-full items-center gap-3 p-4 text-sm text-muted">
      <MousePointerClick className="h-5 w-5 shrink-0 text-f1-red" />
      Натисни на болід на карті або на рядок у таблиці, щоб бачити швидкість, передачу й шини пілота.
    </div>
  );
}

function DriverFocus({ car, tele }: { car: CarState; tele: ReturnType<typeof telemetry> }) {
  const d = DRIVER_BY_CODE[car.code];
  const team = TEAM_BY_ID[d.teamId];
  const comp = COMPOUND[car.compound];
  return (
    <div className="card relative h-full overflow-hidden p-4">
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full blur-[60px]" style={{ background: `${team.color}55` }} />
      <div className="relative flex items-center gap-3">
        <DriverBadge code={car.code} size={48} />
        <div className="min-w-0 flex-1">
          <Link to={`/drivers/${car.code}`} className="block truncate font-bold hover:text-f1-red">
            {d.firstName} <span className="uppercase">{d.lastName}</span>
          </Link>
          <div className="text-xs text-muted">{team.name}</div>
        </div>
        <div className="text-right">
          <div className="display text-3xl">P{car.position}</div>
          <div className="font-mono text-[11px] text-muted">{car.position === 1 ? 'лідер' : car.gap}</div>
        </div>
      </div>
      <div className="relative mt-4 grid grid-cols-[auto_auto_1fr] items-center gap-x-5 gap-y-2">
        <div>
          <div className="font-mono text-3xl font-black tabular-nums leading-none">{tele.speed}</div>
          <div className="text-[10px] uppercase tracking-wider text-muted">км/год</div>
        </div>
        <div>
          <div className="font-mono text-3xl font-black leading-none">{tele.gear || 'N'}</div>
          <div className="text-[10px] uppercase tracking-wider text-muted">передача</div>
        </div>
        <div className="grid gap-1.5">
          <Bar label="Газ" value={tele.throttle} color="bg-emerald-500" />
          <Bar label="Гальмо" value={tele.brake ? 100 : 0} color="bg-f1-red" />
        </div>
      </div>
      <div className="relative mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line pt-3 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="grid h-5 w-5 place-items-center rounded-full border-2 font-mono text-[9px] font-black" style={{ borderColor: comp.color }}>
            {car.compound}
          </span>
          {comp.label} · {car.tyreAge} кіл
        </span>
        <span className="text-muted">Коло <b className="text-ink">{car.lap}</b></span>
        <span className="text-muted">Ост. <b className="font-mono text-ink">{car.lastLap ? formatLapTime(car.lastLap) : '—'}</b></span>
        <span className="text-muted">Найкр. <b className="font-mono text-ink">{car.bestLap ? formatLapTime(car.bestLap) : '—'}</b></span>
        {car.drs && <span className="rounded bg-emerald-500 px-1.5 text-[10px] font-black text-black">DRS</span>}
      </div>
    </div>
  );
}

function Bar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-12 text-[10px] uppercase tracking-wider text-muted">{label}</span>
      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
        <span className={cn('block h-full rounded-full transition-[width] duration-150', color)} style={{ width: `${value}%` }} />
      </span>
    </div>
  );
}

function FastestLapCard({ timing }: { timing: ReturnType<typeof timingAt> }) {
  const fl = timing.fastest;
  const d = fl ? DRIVER_BY_CODE[fl.code] : undefined;
  return (
    <div className="relative flex flex-col justify-between overflow-hidden rounded-[14px] bg-gradient-to-br from-purple-600 to-violet-800 p-4 text-white">
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-white/70">
        <Timer className="h-3.5 w-3.5" /> Найшвидше коло
      </div>
      {fl && d ? (
        <>
          <div className="mt-2 flex items-center gap-2">
            <DriverBadge code={fl.code} size={32} />
            <div className="leading-tight">
              <div className="font-black uppercase">{d.lastName}</div>
              <div className="text-[11px] text-white/60">коло {fl.lap}</div>
            </div>
          </div>
          <div className="mt-2 font-mono text-2xl font-black tabular-nums">{formatLapTime(fl.time)}</div>
        </>
      ) : (
        <div className="mt-2 text-sm text-white/70">Ще ніхто не завершив коло</div>
      )}
    </div>
  );
}
