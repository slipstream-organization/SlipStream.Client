import { motion } from 'motion/react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../app/providers/ThemeProvider';

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const dark = theme === 'dark';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label={dark ? 'Увімкнути світлу тему' : 'Увімкнути темну тему'}
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        toggle({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
      }}
      className="relative flex h-8 w-[60px] shrink-0 items-center rounded-full border border-line bg-surface-2 px-1 transition-colors hover:border-f1-red/60"
    >
      <Sun className="absolute left-2 h-3.5 w-3.5 text-muted" />
      <Moon className="absolute right-2 h-3.5 w-3.5 text-muted" />
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 600, damping: 32 }}
        className="relative z-10 grid h-6 w-6 place-items-center rounded-full bg-f1-red text-white shadow-md"
        style={{ marginLeft: dark ? 'auto' : 0 }}
      >
        <motion.span key={theme} initial={{ rotate: -90, scale: 0.4 }} animate={{ rotate: 0, scale: 1 }}>
          {dark ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
        </motion.span>
      </motion.span>
    </button>
  );
}
