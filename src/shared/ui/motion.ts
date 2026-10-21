export const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } },
};

export const stagger = (s = 0.06) => ({ hidden: {}, show: { transition: { staggerChildren: s } } });

export const panelSection = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };
