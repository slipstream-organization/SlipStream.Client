import { useEffect, useRef } from 'react';
import { animate, motion } from 'motion/react';
import { Award } from 'lucide-react';
import { cn } from '../../shared/lib/utils';

/** Number that counts up from 0 when the panel opens. */
export function CountUp({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const controls = animate(0, value, {
      duration: Math.min(1.2, 0.4 + value / 400),
      ease: 'easeOut',
      onUpdate: (v) => (node.textContent = Math.round(v).toLocaleString('uk-UA')),
    });
    return () => controls.stop();
  }, [value]);
  return (
    <span ref={ref} className={className}>
      0
    </span>
  );
}

export function Stat({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: number; accent?: boolean }) {
  return (
    <div className={cn('rounded-lg border border-line bg-surface p-3', accent && 'border-f1-red/40 bg-f1-red/5')}>
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted">
        <span className="text-f1-red">{icon}</span>
        {label}
      </div>
      <CountUp value={value} className="display mt-1 block text-2xl md:text-3xl" />
    </div>
  );
}

/** Best completed season. position 0 = no completed season yet. */
export function BestYearCard({ year, position, color, label = "Найкращий рік у кар'єрі" }: { year: number; position: number; color: string; label?: string }) {
  return (
    <div className="mt-4 flex items-center gap-4 rounded-lg p-4 text-black" style={{ background: `linear-gradient(110deg, ${color}, ${color}88)` }}>
      <Award className="h-8 w-8 shrink-0 opacity-70" />
      <div className="flex-1">
        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/60">{label}</div>
        <div className="display text-3xl">{position ? year : 'Дебютний сезон'}</div>
      </div>
      {position > 0 && (
        <div className="text-right">
          <div className="display text-3xl">P{position}</div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-black/60">{position === 1 ? 'чемпіон' : 'у чемпіонаті'}</div>
        </div>
      )}
    </div>
  );
}

export function PanelShell({ color, children, bare }: { color: string; children: React.ReactNode; bare?: boolean }) {
  return (
    <div className={bare ? 'relative' : 'relative overflow-hidden border-t border-line bg-surface-2/60 px-4 py-5 md:px-6'}>
      {!bare && <span className="absolute inset-y-0 left-0 w-1" style={{ background: color }} />}
      <motion.div
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } } }}
        className={bare ? 'grid gap-6 lg:grid-cols-2' : 'grid gap-6 lg:grid-cols-[220px_1fr_1fr]'}
      >
        {children}
      </motion.div>
    </div>
  );
}
