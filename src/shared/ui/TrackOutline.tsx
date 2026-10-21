import { useId, useMemo } from 'react';
import { motion } from 'motion/react';
import { CIRCUITS } from '../data/circuits';
import { fitShape, shapePath } from '../lib/trackShape';

function buildOutline(points: [number, number][]) {
  const shape = fitShape(points);
  return { d: shapePath(points, shape.project), viewBox: shape.viewBox };
}

interface Props {
  circuitId: string;
  className?: string;
  /** stroke width in screen pixels */
  strokeWidth?: number;
  /** draw-in animation when it enters the viewport */
  animateDraw?: boolean;
  /** a dot running around the lap */
  runner?: boolean;
  runnerDuration?: number;
}

export function TrackOutline({ circuitId, className, strokeWidth = 2.5, animateDraw, runner, runnerDuration = 9 }: Props) {
  const id = useId().replace(/:/g, '');
  const outline = useMemo(() => {
    const c = CIRCUITS[circuitId];
    return c ? buildOutline(c.points) : null;
  }, [circuitId]);
  if (!outline) return null;

  const common = {
    d: outline.d,
    stroke: 'currentColor',
    strokeWidth,
    strokeLinejoin: 'round' as const,
    strokeLinecap: 'round' as const,
    vectorEffect: 'non-scaling-stroke',
  };

  return (
    <svg viewBox={outline.viewBox} className={className} fill="none" aria-hidden>
      {/* the base path stays non-animated so the outline is always complete */}
      <path id={`trk-${id}`} {...common} opacity={animateDraw ? 0.25 : 1} />
      {animateDraw && (
        // draw-in via clip reveal — avoids the pathLength + non-scaling-stroke glitch
        <motion.path
          {...common}
          strokeDasharray="1 1"
          pathLength={1}
          vectorEffect="none"
          style={{ strokeWidth: strokeWidth * 0.3 }}
          initial={{ strokeDashoffset: 1 }}
          whileInView={{ strokeDashoffset: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 2.4, ease: 'easeInOut' }}
        />
      )}
      {runner && (
        <circle r="2.2" fill="#e10600">
          <animateMotion dur={`${runnerDuration}s`} repeatCount="indefinite" rotate="auto">
            <mpath href={`#trk-${id}`} />
          </animateMotion>
        </circle>
      )}
    </svg>
  );
}
