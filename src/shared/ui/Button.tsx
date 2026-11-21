/* eslint-disable react-refresh/only-export-components */
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'inverse';

/*
 * Hover states are transform-only pseudo-elements (no colour transitions):
 *  primary   — red, cut corner; a light "speed" band sweeps across
 *  secondary — ink outline; an ink fill slides in from the left, text flips to paper
 *  ghost     — text; an accent underline draws from the left
 *  inverse   — for colour fields: outline in the current text colour, fill slides in
 */
const BASE =
  'group/btn relative isolate inline-flex min-h-11 select-none items-center justify-center gap-2 overflow-hidden px-5 text-sm font-bold uppercase tracking-[0.03em] [font-stretch:115%] ' +
  'active:translate-y-px disabled:pointer-events-none disabled:opacity-40 motion-safe:transition-transform motion-safe:duration-100';

const VARIANT: Record<ButtonVariant, string> = {
  primary:
    'chamfer-sm bg-accent text-on-accent ' +
    'before:absolute before:inset-y-0 before:-left-1/3 before:-z-10 before:w-1/3 before:-skew-x-12 before:bg-white/25 before:-translate-x-full ' +
    'motion-safe:before:transition-transform motion-safe:before:duration-300 motion-safe:before:ease-out hover:before:translate-x-[420%]',
  secondary:
    'border-[1.5px] border-rule text-ink hover:text-bg ' +
    'before:absolute before:inset-0 before:-z-10 before:origin-left before:scale-x-0 before:bg-ink ' +
    'motion-safe:before:transition-transform motion-safe:before:duration-200 motion-safe:before:ease-out hover:before:scale-x-100',
  ghost:
    'px-1 text-ink after:absolute after:inset-x-1 after:bottom-2 after:h-0.5 after:origin-left after:scale-x-0 after:bg-accent ' +
    'motion-safe:after:transition-transform motion-safe:after:duration-200 hover:after:scale-x-100',
  inverse:
    'border-[1.5px] border-current ' +
    'before:absolute before:inset-0 before:-z-10 before:origin-left before:scale-x-0 before:bg-current before:opacity-15 ' +
    'motion-safe:before:transition-transform motion-safe:before:duration-200 hover:before:scale-x-100',
};

/** Same look for <Link>/<a>: `className={buttonClass('primary')}`. */
export const buttonClass = (variant: ButtonVariant = 'primary', className?: string) => cn(BASE, VARIANT[variant], className);

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  /** Shows an inline spinner and sets aria-busy; the button stays in the layout. */
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'primary', loading, className, children, type = 'button', onClick, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-busy={loading || undefined}
      onClick={loading ? (e) => e.preventDefault() : onClick}
      className={buttonClass(variant, className)}
      {...rest}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});
