import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';
import { EASE_IN, EASE_OUT, MOTION } from './motion';

export interface SelectOption {
  value: string;
  label: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  /** Visible label is rendered by the parent <label>; this names the control for AT. */
  'aria-label'?: string;
  invalid?: boolean;
  className?: string;
}

/**
 * Listbox dropdown (desktop ≥640px). Below 640px the native <select> is used:
 * the system picker is the better touch UX.
 */
export function Select(props: Props) {
  const [native, setNative] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const on = () => setNative(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return native ? <NativeSelect {...props} /> : <ListboxSelect {...props} />;
}

const fieldClass = (invalid?: boolean) =>
  cn(
    'w-full rounded-md border bg-bg px-3 py-2.5 text-sm outline-none transition-colors focus:border-f1-red',
    invalid ? 'border-f1-red' : 'border-line',
  );

function NativeSelect({ value, onChange, options, invalid, className, ...a }: Props) {
  return (
    <select aria-label={a['aria-label']} value={value} onChange={(e) => onChange(e.target.value)} className={cn(fieldClass(invalid), 'min-h-11', className)}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function ListboxSelect({ value, onChange, options, invalid, className, ...a }: Props) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const typed = useRef({ text: '', t: 0 });
  const id = useId();
  const reduce = useReducedMotion();
  const selected = useMemo(() => options.findIndex((o) => o.value === value), [options, value]);

  const show = () => {
    setActive(Math.max(selected, 0));
    setOpen(true);
  };
  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) button.current?.focus();
  };
  const pick = (i: number) => {
    onChange(options[i].value);
    close();
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  useEffect(() => {
    if (open) list.current?.children[active]?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const last = options.length - 1;
    if (e.key === 'Escape' && open) {
      e.preventDefault();
      e.stopPropagation(); // do not also close a parent dialog
      close();
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) return show();
      setActive((i) => Math.min(last, Math.max(0, i + (e.key === 'ArrowDown' ? 1 : -1))));
    } else if (e.key === 'Home' || e.key === 'End') {
      if (!open) return;
      e.preventDefault();
      setActive(e.key === 'Home' ? 0 : last);
    } else if (e.key === 'Enter' || e.key === ' ') {
      if (!open) return; // let the button open on click/space natively
      e.preventDefault();
      pick(active);
    } else if (e.key === 'Tab') {
      setOpen(false);
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && e.key !== ' ') {
      window.clearTimeout(typed.current.t);
      typed.current.text += e.key.toLowerCase();
      typed.current.t = window.setTimeout(() => (typed.current.text = ''), 600);
      const hit = options.findIndex((o) => o.label.toLowerCase().startsWith(typed.current.text));
      if (hit >= 0) {
        if (!open) setOpen(true);
        setActive(hit);
      }
    }
  };

  return (
    <div ref={root} className={cn('relative', className)} onKeyDown={onKeyDown}>
      <button
        ref={button}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-activedescendant={open ? `${id}-${active}` : undefined}
        aria-label={a['aria-label']}
        onClick={() => (open ? close(false) : show())}
        className={cn(fieldClass(invalid), 'flex min-h-11 items-center justify-between gap-2 text-left')}
      >
        <span className="truncate">{options[selected]?.label ?? ''}</span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted transition-transform duration-150', open && 'rotate-180')} aria-hidden />
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            ref={list}
            id={`${id}-list`}
            role="listbox"
            initial={{ opacity: 0, y: reduce ? 0 : -4 }}
            animate={{ opacity: 1, y: 0, transition: { duration: MOTION.fast, ease: EASE_OUT } }}
            exit={{ opacity: 0, transition: { duration: MOTION.instant, ease: EASE_IN } }}
            className="absolute inset-x-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-md border border-line bg-surface py-1 shadow-float"
          >
            {options.map((o, i) => (
              <li
                key={o.value}
                id={`${id}-${i}`}
                role="option"
                aria-selected={i === selected}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(i)}
                className={cn('flex min-h-10 cursor-pointer items-center justify-between gap-2 px-3 text-sm', i === active && 'bg-surface-2')}
              >
                <span className="truncate">{o.label}</span>
                {i === selected && <Check className="h-4 w-4 shrink-0 text-accent-ink" aria-hidden />}
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
