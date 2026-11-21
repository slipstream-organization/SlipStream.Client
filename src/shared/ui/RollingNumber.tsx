import { useEffect, useState } from 'react';
import { cn } from '../lib/utils';

/**
 * Odometer number: each digit is a column of 0–9 that rolls to its value (transform only).
 * Rolls up from zero on mount and between values on change. Under reduced motion it just shows the value.
 */
export function RollingNumber({ value, pad = 0, className }: { value: number | string; pad?: number; className?: string }) {
  const text = String(value).padStart(pad, '0');
  const chars = [...text];
  return (
    <span className={cn('digits relative inline-flex leading-none', className)}>
      <span className="sr-only">{text}</span>
      {chars.map((ch, i) =>
        /\d/.test(ch) ? (
          // keyed from the right so units stay the same column when the number grows
          <DigitColumn key={`d${chars.length - i}`} digit={Number(ch)} />
        ) : (
          <span key={`c${chars.length - i}`} aria-hidden>
            {ch}
          </span>
        ),
      )}
    </span>
  );
}

function DigitColumn({ digit }: { digit: number }) {
  // start at 0 and roll to the real digit on the next frame
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(digit));
    return () => cancelAnimationFrame(id);
  }, [digit]);
  return (
    <span aria-hidden className="relative inline-block h-[1em] overflow-hidden">
      <span className="invisible">0</span>
      <span
        className="rolling-column absolute inset-x-0 top-0 flex flex-col"
        style={{ transform: `translateY(${-shown * 10}%)` }}
      >
        {'0123456789'.split('').map((d) => (
          <span key={d} className="h-[1em] leading-none">
            {d}
          </span>
        ))}
      </span>
    </span>
  );
}
