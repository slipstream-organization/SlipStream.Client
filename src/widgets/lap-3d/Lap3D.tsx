import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Pause, Play } from 'lucide-react';
import { useData } from '../../shared/lib/useData';
import { Segmented } from '../../shared/ui/atoms';
import { Skeleton } from '../../shared/ui/Skeleton';
import { StateBlock } from '../../shared/ui/StateBlock';
import { Button } from '../../shared/ui/Button';
import { cn } from '../../shared/lib/utils';
import { loadTrack } from './data/loadTrack';
import { QUALITY, QUALITY_LABEL, type Quality } from './quality';
import { Rig, type CameraMode, type Stats } from './scene/Rig';
import { Cars } from './scene/Cars';
import { Clock } from './scene/Clock';
import { Playback } from './scene/playback';
import { TrackWorld } from './scene/TrackWorld';
import { getTrack } from './tracks';

/**
 * Night lap on a real circuit. Stage 2: the track itself (asphalt, kerbs, neon barriers, lamps,
 * ground) on the centre line measured from OpenF1 data, with one real lap playing on it.
 */
export function Lap3D({ trackId, initialQuality = 'medium', initialMode = 'chase', startT = 0, startPaused = false, className }: { trackId: string; initialQuality?: Quality; initialMode?: CameraMode; startT?: number; startPaused?: boolean; className?: string }) {
  const config = getTrack(trackId);
  const track = useData(() => (config ? loadTrack(config) : Promise.reject(new Error('Невідома траса'))), [trackId]);
  const [quality, setQuality] = useState<Quality>(initialQuality);
  const [mode, setMode] = useState<CameraMode>(initialMode);
  const [playing, setPlaying] = useState(!startPaused);
  const q = QUALITY[quality];
  const playback = useRef(new Playback(startT, !startPaused));
  useEffect(() => {
    playback.current.setPlaying(playing);
  }, [playing]);
  const statsEl = useRef<HTMLParagraphElement>(null);

  const onStats = useMemo(
    () => (s: Stats) => {
      if (statsEl.current) statsEl.current.textContent = `${s.fps.toFixed(0)} fps · ${s.calls} викликів · ${(s.triangles / 1000).toFixed(0)}k трик. · DPR ${s.dpr.toFixed(2)}`;
    },
    [],
  );

  if (!config) return <StateBlock kind="error" title="Траси немає" description="Для цієї траси ще не підготовлено сцену." />;
  if (track.error && !track.data) return <StateBlock kind="error" title="Не вдалося завантажити коло" description="Перевірте з'єднання й повторіть спробу." action={<Button onClick={track.reload}>Спробувати ще раз</Button>} />;
  if (!track.data) return <Skeleton className={cn('min-h-[420px] w-full rounded-none', className)} />;

  const bundle = track.data;
  const lap = bundle.laps[config.laps[0].label];
  const ghost = bundle.laps[config.laps[1].label];

  return (
    <div className={cn('relative isolate overflow-hidden bg-[#05060d] text-white', className)}>
      <Canvas
        key={quality}
        dpr={[1, q.dpr]}
        gl={{ antialias: q.antialias, powerPreference: 'high-performance' }}
        camera={{ fov: 60, near: 0.4, far: 9000 }}
        style={{ position: 'absolute', inset: 0 }}
      >
        <color attach="background" args={[config.sky]} />
        <fogExp2 attach="fog" args={[config.fog, 0.00062]} />
        <hemisphereLight args={['#6f7dff', '#12141f', 0.9]} />
        <directionalLight position={[-300, 500, 200]} intensity={0.35} color="#9fb2ff" />
        <TrackWorld bundle={bundle} quality={q} />
        <Clock playback={playback} lapTime={lap.lapTime} />
        <Cars bundle={bundle} main={lap} ghost={ghost} playback={playback} teamId={config.team} accent={config.neon[2]} />
        <Rig bundle={bundle} lap={lap} mode={mode} playback={playback} onStats={onStats} />
      </Canvas>

      <div className="dark pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-start justify-between gap-3 p-3 md:p-4">
        <div className="pointer-events-auto rounded-sm bg-black/55 px-3 py-2">
          <p className="headline text-lg">{config.name}</p>
          <p ref={statsEl} className="tnum text-sm text-white/80" aria-live="off">
            …
          </p>
        </div>
        <div className="pointer-events-auto flex flex-wrap items-center gap-3 rounded-sm bg-black/55 px-2 py-1">
          <Segmented<CameraMode>
            layoutKey="lap3d-cam"
            size="sm"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'chase', label: 'Позаду' },
              { value: 'drone', label: 'Дрон' },
            ]}
          />
          <Segmented<Quality>
            layoutKey="lap3d-q"
            size="sm"
            value={quality}
            onChange={setQuality}
            options={(Object.keys(QUALITY) as Quality[]).map((k) => ({ value: k, label: QUALITY_LABEL[k] }))}
          />
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? 'Пауза' : 'Грати'}
            title={playing ? 'Пауза' : 'Грати'}
            className="grid h-11 w-11 place-items-center rounded-sm hover:bg-white/15"
          >
            {playing ? <Pause className="h-5 w-5" aria-hidden /> : <Play className="h-5 w-5" aria-hidden />}
          </button>
        </div>
      </div>
      <p className="pointer-events-none absolute bottom-2 right-3 text-xs text-white/60">Дані: OpenF1, © OpenStreetMap contributors</p>
    </div>
  );
}
