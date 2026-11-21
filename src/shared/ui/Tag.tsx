import type { CSSProperties, ReactNode } from 'react';
import { cn } from '../lib/utils';

/**
 * Small label with a slanted marker — categories, sector states, session names.
 * Sector tones: purple = best, green = personal best, yellow = slower.
 * `color` paints the marker with any colour (team colour) and keeps the text in ink.
 */
type Tone = 'accent' | 'ink' | 'purple' | 'green' | 'yellow' | 'onColor';

const MARK: Record<Tone, string> = {
  accent: 'bg-accent',
  ink: 'bg-ink',
  purple: 'bg-sector-purple',
  green: 'bg-sector-green',
  yellow: 'bg-sector-yellow',
  onColor: 'bg-current',
};
const TEXT: Record<Tone, string> = {
  accent: 'text-accent-ink',
  ink: 'text-ink',
  purple: 'text-sector-purple',
  green: 'text-sector-green',
  yellow: 'text-sector-yellow',
  onColor: 'text-current',
};

export function Tag({ children, tone = 'accent', color, className }: { children: ReactNode; tone?: Tone; color?: string; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2 text-sm font-bold [font-stretch:112%]', color ? 'text-ink' : TEXT[tone], className)}>
      <span aria-hidden className={cn('h-3 w-1.5 -skew-x-12', !color && MARK[tone])} style={color ? ({ background: color } as CSSProperties) : undefined} />
      {children}
    </span>
  );
}
