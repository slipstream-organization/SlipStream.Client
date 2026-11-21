import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { flushSync } from 'react-dom';

type Theme = 'light' | 'dark';

const ThemeContext = createContext<{ theme: Theme; toggle: (origin?: { x: number; y: number }) => void }>({
  theme: 'light',
  toggle: () => {},
});

const STORAGE_KEY = 'slipstream-theme';
/** Whole sweep, ms — slow enough to read as one smooth pass. */
const SWEEP = 1000;
const EASE = 'cubic-bezier(0.65, 0, 0.35, 1)';
const SLANT = Math.tan((8 * Math.PI) / 180); // the kerb leans like the speed stripes
const KERB_W = 28;

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => (document.documentElement.classList.contains('dark') ? 'dark' : 'light'));
  const busy = useRef(false);

  const apply = useCallback((next: Theme) => {
    document.documentElement.classList.toggle('dark', next === 'dark');
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* storage unavailable */
    }
    setTheme(next);
  }, []);

  /**
   * Theme switch as a kerb pass:
   *  - With View Transitions: the new theme is revealed behind a slanted edge that travels across
   *    the screen from the toggle's side, and a red/white kerb rides on that edge. No full-screen
   *    flash — the old page stays visible until the edge passes it.
   *  - Without them: a band in the new theme's colour sweeps across in one continuous move.
   *  - Reduced motion: instant.
   */
  const toggle = useCallback(
    (origin?: { x: number; y: number }) => {
      if (busy.current) return;
      const next: Theme = theme === 'dark' ? 'light' : 'dark';
      const root = document.documentElement;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !document.body.animate) {
        apply(next);
        return;
      }
      busy.current = true;
      const W = window.innerWidth;
      const H = window.innerHeight;
      const fromRight = (origin?.x ?? W) > W / 2;

      if (document.startViewTransition) {
        const k = (H / 2) * SLANT;
        const off = KERB_W / 2 + k + 40;
        const c0 = fromRight ? W + off : -off; // kerb centre: start just off-screen on the toggle's side
        const c1 = fromRight ? -off : W + off; // … and finish off-screen on the other side
        const pad = 60;
        // the part of the screen that already shows the new theme
        const reveal = (c: number) =>
          fromRight
            ? `polygon(${c + k}px 0px, ${W + pad}px 0px, ${W + pad}px ${H}px, ${c - k}px ${H}px)`
            : `polygon(${-pad}px 0px, ${c + k}px 0px, ${c - k}px ${H}px, ${-pad}px ${H}px)`;

        const kerb = document.createElement('div');
        kerb.className = 'theme-kerb';
        kerb.setAttribute('aria-hidden', 'true');
        kerb.style.left = `${c0 - KERB_W / 2}px`;
        document.body.appendChild(kerb);
        root.classList.add('theme-switching');

        const t = document.startViewTransition(() => {
          flushSync(() => apply(next));
          // the kerb's own snapshot group travels from its old box to this new one
          kerb.style.left = `${c1 - KERB_W / 2}px`;
        });
        t.ready
          .then(() => {
            root.animate({ clipPath: [reveal(c0), reveal(c1)] }, { duration: SWEEP, easing: EASE, pseudoElement: '::view-transition-new(root)' });
          })
          .catch(() => {});
        t.finished.finally(() => {
          kerb.remove();
          root.classList.remove('theme-switching');
          busy.current = false;
        });
        return;
      }

      // Fallback: one continuous sweep of a 260vw band; it covers the viewport mid-way, the theme flips then.
      const start = fromRight ? '120vw' : '-280vw';
      const end = fromRight ? '-280vw' : '120vw';
      const band = document.createElement('div');
      band.className = 'theme-wipe';
      band.dataset.to = next;
      band.setAttribute('aria-hidden', 'true');
      document.body.appendChild(band);
      const sweep = band.animate([{ transform: `translateX(${start}) skewX(-8deg)` }, { transform: `translateX(${end}) skewX(-8deg)` }], {
        duration: SWEEP,
        easing: EASE,
        fill: 'forwards',
      });
      const flip = window.setTimeout(() => apply(next), SWEEP / 2);
      const done = () => {
        window.clearTimeout(flip);
        if (root.classList.contains('dark') !== (next === 'dark')) apply(next);
        band.remove();
        busy.current = false;
      };
      sweep.onfinish = done;
      sweep.oncancel = done;
    },
    [theme, apply],
  );

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => useContext(ThemeContext);
