import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles, TrendingDown, TrendingUp } from 'lucide-react';
import { getLap, getProLap } from './lapModel';
import { analyseLap, type SegmentDelta, type Verdict } from './lapAnalysis';
import { CIRCUITS } from '../../shared/data/circuits';
import { fitShape } from '../../shared/lib/trackShape';
import { cn, formatLapTime } from '../../shared/lib/utils';

const VERDICT: Record<Verdict, { color: string; label: string }> = {
  gain: { color: '#22c55e', label: 'виграєш' },
  ok: { color: '#eab308', label: 'в темпі' },
  loss: { color: '#ef4444', label: 'втрачаєш' },
};

interface Props {
  circuitId: string;
  myLapTime: number;
  myStyle: number;
  refLapTime: number;
  refLabel: string; // e.g. "Поул 2026 · RUS"
}

const fmtDelta = (d: number) => `${d > 0 ? '+' : d < 0 ? '−' : ''}${Math.abs(d).toFixed(3)}`;

export function LapAnalysisPanel({ circuitId, myLapTime, myStyle, refLapTime, refLabel }: Props) {
  const circuit = CIRCUITS[circuitId];
  const { analysis, mine } = useMemo(() => {
    const mine = getLap(circuit.points, myLapTime, circuit.length, myStyle);
    const ref = getProLap(circuit.points, refLapTime, circuit.length);
    return { analysis: analyseLap(mine, ref), mine };
  }, [circuit, myLapTime, myStyle, refLapTime]);
  const [hover, setHover] = useState<number | null>(null);

  // map: one path per corner segment, coloured by verdict
  const map = useMemo(() => {
    const pts: [number, number][] = [];
    for (let i = 0; i < mine.n; i += 3) pts.push([mine.x[i], mine.y[i]]);
    const shape = fitShape(pts, 100, 8);
    const segPath = (s: SegmentDelta) => {
      let d = '';
      for (let i = s.start; i <= s.end; i += 2) {
        const [x, y] = shape.project(mine.x[i], mine.y[i]);
        d += `${d ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`;
      }
      return d;
    };
    return {
      viewBox: shape.viewBox,
      segments: analysis.segments.map((s) => ({ s, d: segPath(s), label: shape.project(mine.x[s.corner.apex], mine.y[s.corner.apex]) })),
      start: shape.project(mine.x[0], mine.y[0]),
    };
  }, [mine, analysis]);

  const maxAbs = Math.max(0.05, ...analysis.segments.map((s) => Math.abs(s.delta)));

  return (
    <div className="grid gap-4 rounded-xl border border-white/10 bg-[#15151e] p-4 text-white md:p-5 lg:grid-cols-[1.1fr_1fr]">
      {/* map + sectors */}
      <div>
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <h4 className="display text-xl">Де ти виграєш і програєш</h4>
          <span className="font-mono text-xs text-white/60">vs {refLabel}</span>
        </div>
        <div className="relative rounded-lg bg-black/30">
          <svg viewBox={map.viewBox} className="h-auto w-full">
            {map.segments.map(({ s, d }, i) => (
              <path
                key={i}
                d={d}
                fill="none"
                stroke={VERDICT[s.verdict].color}
                strokeWidth={hover === i ? 7 : 4.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                opacity={hover === null || hover === i ? 1 : 0.35}
                className="cursor-pointer transition-all"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              />
            ))}
            {map.segments.map(({ s, label }, i) => (
              <text key={`t${i}`} x={label[0]} y={label[1] - 3} textAnchor="middle" className="pointer-events-none fill-white font-mono" fontSize="3.2" fontWeight="700">
                T{s.corner.number}
              </text>
            ))}
            <rect x={map.start[0] - 1.5} y={map.start[1] - 1.5} width="3" height="3" fill="#fff" />
          </svg>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px]">
          {(Object.keys(VERDICT) as Verdict[]).map((v) => (
            <span key={v} className="flex items-center gap-1.5 text-white/70">
              <span className="h-2 w-4 rounded-full" style={{ background: VERDICT[v].color }} />
              {VERDICT[v].label}
            </span>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-4 gap-2">
          {analysis.sectors.map((d, i) => (
            <div key={i} className="rounded-lg bg-white/5 p-2.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-white/50">Сектор {i + 1}</div>
              <div className={cn('font-mono text-lg font-bold', d > 0 ? 'text-red-400' : 'text-green-400')}>{fmtDelta(d)}</div>
            </div>
          ))}
          <div className="rounded-lg bg-white/10 p-2.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-white/50">Коло</div>
            <div className={cn('font-mono text-lg font-bold', analysis.total > 0 ? 'text-red-400' : 'text-green-400')}>{fmtDelta(analysis.total)}</div>
          </div>
        </div>
      </div>

      {/* corner list + coach */}
      <div className="flex min-w-0 flex-col gap-4">
        <div className="max-h-[260px] overflow-y-auto pr-1">
          <ul className="space-y-1">
            {analysis.segments.map((s, i) => (
              <li
                key={i}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                className={cn('grid grid-cols-[44px_1fr_64px] items-center gap-2 rounded-md px-2 py-1 text-xs transition', hover === i && 'bg-white/10')}
              >
                <span className="font-mono font-bold">
                  T{s.corner.number}
                  <span className="ml-0.5 text-[9px] text-white/40">{s.corner.dir}</span>
                </span>
                {/* diverging bar: left = gain, right = loss */}
                <span className="relative h-2 rounded-full bg-white/5">
                  <span className="absolute inset-y-0 left-1/2 w-px bg-white/30" />
                  <motion.span
                    initial={{ width: 0 }}
                    animate={{ width: `${(Math.abs(s.delta) / maxAbs) * 50}%` }}
                    transition={{ duration: 0.6, delay: i * 0.03 }}
                    className="absolute inset-y-0 rounded-full"
                    style={{ background: VERDICT[s.verdict].color, [s.delta >= 0 ? 'left' : 'right']: '50%' }}
                  />
                </span>
                <span className={cn('text-right font-mono font-bold', s.delta > 0 ? 'text-red-400' : 'text-green-400')}>{fmtDelta(s.delta)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative overflow-hidden rounded-lg border border-violet-400/30 bg-gradient-to-br from-violet-500/15 to-transparent p-4">
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-violet-300">
            <Sparkles className="h-4 w-4" /> AI-тренер
          </div>
          <ul className="space-y-2 text-sm leading-snug text-white/90">
            {analysis.tips.map((tip, i) => (
              <motion.li key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.25 }} className="flex gap-2">
                {tip.startsWith('Сильне') ? (
                  <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-green-400" />
                ) : (
                  <TrendingDown className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                )}
                <span>{tip}</span>
              </motion.li>
            ))}
          </ul>
          <div className="mt-3 font-mono text-[10px] text-white/40">Твоє коло {formatLapTime(myLapTime)} · порівняння по поворотах</div>
        </div>
      </div>
    </div>
  );
}
