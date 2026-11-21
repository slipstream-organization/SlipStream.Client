import { useEffect, useRef, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'motion/react';
import { cn } from '../lib/utils';
import { EASE_IN, EASE_OUT, MOTION } from './motion';

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

let scrollLocks = 0;
function lockScroll() {
  if (scrollLocks++ > 0) return () => unlock();
  const { body, documentElement } = document;
  const gap = window.innerWidth - documentElement.clientWidth; // keep layout from shifting when the scrollbar disappears
  body.dataset.prevOverflow = body.style.overflow;
  body.dataset.prevPad = body.style.paddingRight;
  body.style.overflow = 'hidden';
  if (gap > 0) body.style.paddingRight = `${gap}px`;
  return () => unlock();
}
function unlock() {
  if (--scrollLocks > 0) return;
  const { body } = document;
  body.style.overflow = body.dataset.prevOverflow ?? '';
  body.style.paddingRight = body.dataset.prevPad ?? '';
}

interface DialogProps {
  onClose: () => void;
  /** Accessible name of the dialog. */
  label: string;
  children: ReactNode;
  /** Classes for the scrim (grid wrapper). */
  className?: string;
  /** Classes for the panel. */
  panelClassName?: string;
  panelStyle?: React.CSSProperties;
  /** Element to focus first; defaults to the first focusable element in the panel. */
  initialFocusRef?: RefObject<HTMLElement | null>;
  /** Render as <form> (keeps submit semantics). */
  onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void;
}

/**
 * Modal surface: portal, scrim, focus trap, Esc, focus restore, scroll lock.
 * Mount it inside <AnimatePresence> so the exit animation plays; Esc closes immediately.
 * Animates only opacity + a small translate.
 */
export function Dialog({ onClose, label, children, className, panelClassName, panelStyle, initialFocusRef, onSubmit }: DialogProps) {
  const panel = useRef<HTMLElement | null>(null);
  const reduce = useReducedMotion();
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const release = lockScroll();
    const el = panel.current;
    const target = initialFocusRef?.current ?? el?.querySelector<HTMLElement>(FOCUSABLE) ?? el;
    target?.focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // an open dropdown inside the dialog handles Esc itself
        if ((e.target as HTMLElement | null)?.closest?.('[aria-expanded="true"]')) return;
        e.stopPropagation();
        closeRef.current();
        return;
      }
      if (e.key !== 'Tab' || !panel.current) return;
      const items = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((n) => n.offsetParent !== null || n === document.activeElement);
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !panel.current.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !panel.current.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      release();
      previous?.focus?.({ preventScroll: true });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shift = reduce ? 0 : 8;
  const Panel = onSubmit ? motion.form : motion.div;

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: MOTION.base, ease: EASE_OUT } }}
      exit={{ opacity: 0, transition: { duration: reduce ? MOTION.instant : MOTION.fast, ease: EASE_IN } }}
      className={cn('fixed inset-0 z-[60] grid place-items-center p-4', className)}
      style={{ background: 'var(--c-scrim)' }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <Panel
        ref={panel as never}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        onSubmit={onSubmit as never}
        initial={{ opacity: 0, y: shift }}
        animate={{ opacity: 1, y: 0, transition: { duration: MOTION.base, ease: EASE_OUT } }}
        exit={{ opacity: 0, y: shift / 2, transition: { duration: reduce ? MOTION.instant : MOTION.fast, ease: EASE_IN } }}
        style={panelStyle}
        className={cn('relative w-full max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-sm border border-line border-t-4 border-t-accent bg-surface text-ink shadow-float outline-none', panelClassName)}
      >
        {children}
      </Panel>
    </motion.div>,
    document.body,
  );
}
