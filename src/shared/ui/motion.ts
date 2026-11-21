/** Motion tokens (seconds) — mirror --motion-* in index.css. */
export const MOTION = { instant: 0.1, fast: 0.15, base: 0.2, slow: 0.3 } as const;
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;
export const EASE_IN = [0.7, 0, 0.84, 0] as const;

const enter = { duration: MOTION.base, ease: EASE_OUT };

export const fadeUp = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: enter },
};

/** Stagger is capped at 30ms per child. */
export const stagger = (s = 0.03) => ({ hidden: {}, show: { transition: { staggerChildren: Math.min(s, 0.03) } } });

export const panelSection = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: enter } };
