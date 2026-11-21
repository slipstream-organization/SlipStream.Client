import type { ReactNode } from 'react';
import { Inbox, TriangleAlert } from 'lucide-react';
import { cn } from '../lib/utils';

/** One layout for empty and error states: what happened, what to do next. */
export function StateBlock({
  kind = 'empty',
  title,
  description,
  action,
  className,
}: {
  kind?: 'empty' | 'error';
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  const Icon = kind === 'error' ? TriangleAlert : Inbox;
  return (
    <div
      role={kind === 'error' ? 'alert' : undefined}
      className={cn('flex flex-col items-center rounded-lg border border-line bg-surface px-6 py-12 text-center', className)}
    >
      <Icon className={cn('h-6 w-6', kind === 'error' ? 'text-accent-ink' : 'text-muted')} aria-hidden />
      <h3 className="mt-3 text-xl font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-[46ch] text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
