import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { flushSync } from 'react-dom';

type Theme = 'light' | 'dark';

const ThemeContext = createContext<{ theme: Theme; toggle: (origin?: { x: number; y: number }) => void }>({
  theme: 'dark',
  toggle: () => {},
});

const STORAGE_KEY = 'slipstream-theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() =>
    document.documentElement.classList.contains('dark') ? 'dark' : 'light',
  );

  const apply = useCallback((next: Theme) => {
    document.documentElement.classList.toggle('dark', next === 'dark');
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* storage unavailable */
    }
    setTheme(next);
  }, []);

  const toggle = useCallback(
    (origin?: { x: number; y: number }) => {
      const next: Theme = theme === 'dark' ? 'light' : 'dark';
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!document.startViewTransition || reduce) {
        apply(next);
        return;
      }
      const x = origin?.x ?? window.innerWidth - 40;
      const y = origin?.y ?? 40;
      const r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
      const transition = document.startViewTransition(() => flushSync(() => apply(next)));
      transition.ready.then(() => {
        document.documentElement.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
          { duration: 650, easing: 'cubic-bezier(.65,0,.35,1)', pseudoElement: '::view-transition-new(root)' },
        );
      });
    },
    [theme, apply],
  );

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => useContext(ThemeContext);
