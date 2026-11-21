import { useEffect, useState } from 'react';
import { cn } from '../lib/utils';

/** Static block; shimmer comes from `.skeleton` (disabled under prefers-reduced-motion). */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('skeleton', className)} />;
}

/** Text-line stubs. */
export function SkeletonLines({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div aria-hidden className={cn('space-y-2', className)}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={cn('h-4', i === lines - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  );
}

/** Rows that mirror a table / list (avatar + two stubs). */
export function SkeletonRows({ rows = 6, className }: { rows?: number; className?: string }) {
  return (
    <div role="status" aria-busy="true" aria-label="Завантаження" className={cn('divide-y divide-line', className)}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 py-3">
          <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-12" />
        </div>
      ))}
    </div>
  );
}

/** Grid of card placeholders. */
export function SkeletonCards({ count = 3, className, cardClassName = 'h-40' }: { count?: number; className?: string; cardClassName?: string }) {
  return (
    <div role="status" aria-busy="true" aria-label="Завантаження" className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-3', className)}>
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className={cn('rounded-lg', cardClassName)} />
      ))}
    </div>
  );
}

/** Renders children only after `delay` ms so fast loads never flash a skeleton. */
export function DelayedFallback({ delay = 100, children }: { delay?: number; children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return show ? <>{children}</> : <div style={{ minHeight: 1 }} />;
}
