/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

/**
 * One driver in focus across the whole race report: hover previews, click pins.
 * Every block (lap chart, classification, tyres, gaps) reads the same value, so the page reads
 * as one story about that driver.
 */
interface Focus {
  /** the driver to highlight: hovered one, else the pinned one */
  active: string | null;
  pinned: string | null;
  hover: (code: string | null) => void;
  toggle: (code: string) => void;
}

const Ctx = createContext<Focus>({ active: null, pinned: null, hover: () => {}, toggle: () => {} });

export function FocusProvider({ children }: { children: ReactNode }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const value = useMemo<Focus>(
    () => ({
      active: hovered ?? pinned,
      pinned,
      hover: setHovered,
      toggle: (code) => setPinned((p) => (p === code ? null : code)),
    }),
    [hovered, pinned],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useFocus = () => useContext(Ctx);

/** Opacity of a driver's mark: full when focused (or nothing is), dimmed otherwise. */
export const dim = (active: string | null, code: string, rest = 0.14) => (!active || active === code ? 1 : rest);
