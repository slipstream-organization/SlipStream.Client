import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../app/providers/ThemeProvider';
import { cn } from '../lib/utils';

/**
 * Paper / night switch: two squares with a red block under the active one (slides on transform).
 * The theme itself changes behind a kerb wipe that starts from this control (ThemeProvider).
 */
export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const dark = theme === 'dark';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label={dark ? 'Увімкнути світлу тему' : 'Увімкнути темну тему'}
      title={dark ? 'Папір' : 'Ніч'}
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        toggle({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
      }}
      className="relative grid h-11 w-[80px] shrink-0 grid-cols-2 rounded-md border border-line bg-surface-2 p-[3px]"
    >
      <span
        aria-hidden
        className={cn('absolute inset-y-[3px] left-[3px] w-[calc(50%-3px)] rounded-[3px] bg-accent motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out', dark && 'translate-x-full')}
      />
      <span className={cn('relative grid place-items-center', dark ? 'text-muted' : 'text-on-accent')}>
        <Sun className="h-4 w-4" aria-hidden />
      </span>
      <span className={cn('relative grid place-items-center', dark ? 'text-on-accent' : 'text-muted')}>
        <Moon className="h-4 w-4" aria-hidden />
      </span>
    </button>
  );
}
