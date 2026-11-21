/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { EASE_IN, EASE_OUT, MOTION } from './motion';

type Tone = 'success' | 'info' | 'error';
interface ToastItem {
  id: number;
  message: ReactNode;
  tone: Tone;
}
type Push = (message: ReactNode, opts?: { tone?: Tone; duration?: number }) => void;

const ToastContext = createContext<Push>(() => {});
export const useToast = () => useContext(ToastContext);

const ICON = { success: CheckCircle2, info: Info, error: TriangleAlert } as const;
const TONE_CLASS: Record<Tone, string> = {
  success: 'text-positive',
  info: 'text-muted',
  error: 'text-accent-ink',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, number>());

  const dismiss = useCallback((id: number) => {
    window.clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setItems((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback<Push>(
    (message, opts) => {
      const id = nextId.current++;
      setItems((list) => [...list.slice(-2), { id, message, tone: opts?.tone ?? 'success' }]);
      timers.current.set(id, window.setTimeout(() => dismiss(id), opts?.duration ?? 3500));
    },
    [dismiss],
  );

  useEffect(() => {
    const map = timers.current;
    return () => map.forEach((t) => window.clearTimeout(t));
  }, []);

  useEffect(() => {
    if (items.length === 0) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss(items[items.length - 1].id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [items, dismiss]);

  const value = useMemo(() => push, [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Viewport items={items} dismiss={dismiss} />
    </ToastContext.Provider>
  );
}

function Viewport({ items, dismiss }: { items: ToastItem[]; dismiss: (id: number) => void }) {
  const reduce = useReducedMotion();
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[70] flex flex-col items-center gap-2 px-4 pb-4 sm:pb-6"
    >
      <AnimatePresence initial={false}>
        {items.map((t) => {
          const Icon = ICON[t.tone];
          return (
            <motion.div
              key={t.id}
              layout="position"
              initial={{ opacity: 0, y: reduce ? 0 : 8 }}
              animate={{ opacity: 1, y: 0, transition: { duration: MOTION.base, ease: EASE_OUT } }}
              exit={{ opacity: 0, transition: { duration: MOTION.fast, ease: EASE_IN } }}
              className="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-md border border-line bg-surface px-4 py-3 text-sm shadow-float"
            >
              <Icon className={cn('h-4 w-4 shrink-0', TONE_CLASS[t.tone])} aria-hidden />
              <div className="min-w-0 flex-1">{t.message}</div>
              <button type="button" onClick={() => dismiss(t.id)} aria-label="Закрити сповіщення" className="press -mr-1 grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted">
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
