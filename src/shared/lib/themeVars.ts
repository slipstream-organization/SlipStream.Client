import { useMemo } from 'react';
import { useTheme } from '../../app/providers/ThemeProvider';

/** Read one CSS custom property from <html> (the theme tokens live there, see index.css). */
export function readVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/**
 * Resolve a map of CSS custom properties to their current values and re-resolve on theme change.
 * Use for SVG attributes, canvas, WebGL and chart libraries that can't take `var(--x)` directly.
 * `spec` must be a module-level constant (it is not a dependency).
 *
 *   const SPEC = { ink: '--c-ink', grid: '--c-line' } as const;
 *   const c = useThemeVars(SPEC); // { ink: '#15151e', grid: 'rgba(…)' }
 */
export function useThemeVars<const T extends Record<string, `--${string}`>>(spec: T): { [K in keyof T]: string } {
  const { theme } = useTheme();
  // `theme` is passed in so it is a real dependency (also for the React Compiler):
  // the class on <html> has already changed when it updates.
  return useMemo(() => resolve(spec, theme), [spec, theme]);
}

function resolve<T extends Record<string, string>>(spec: T, _theme: string): { [K in keyof T]: string } {
  void _theme;
  const cs = getComputedStyle(document.documentElement);
  const out = {} as { [K in keyof T]: string };
  for (const key in spec) out[key] = cs.getPropertyValue(spec[key]).trim();
  return out;
}
