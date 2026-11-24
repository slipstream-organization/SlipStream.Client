import { useSearchParams } from 'react-router-dom';
import { Lap3D } from '../../widgets/lap-3d/Lap3D';
import type { Quality } from '../../widgets/lap-3d/quality';
import type { CameraMode } from '../../widgets/lap-3d/scene/Rig';

/** Workbench for the 3D lap while it is built stage by stage: /lab/lap-3d?track=vegas&q=medium&cam=chase */
export function Lap3DPage() {
  const [p] = useSearchParams();
  const q = p.get('q');
  const cam = p.get('cam');
  return (
    <Lap3D
      className="h-[calc(100svh-4.5rem)] min-h-[480px] w-full"
      trackId={p.get('track') ?? 'vegas'}
      initialQuality={q === 'low' || q === 'high' ? (q as Quality) : 'medium'}
      initialMode={cam === 'drone' ? ('drone' as CameraMode) : 'chase'}
      startT={Number(p.get('t') ?? 0) || 0}
      startPaused={p.get('paused') === '1'}
    />
  );
}
