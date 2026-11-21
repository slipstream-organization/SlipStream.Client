import { useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { MediaImage } from '../../shared/model/types';
import { cn } from '../../shared/lib/utils';

/**
 * A small photo carousel (driver biography). Photos are stacked; the active one fades in —
 * opacity only, instant with reduced motion. Prev/next buttons (44px), ←/→ when the frame has focus,
 * a live "2 / 3" counter. A photo that fails to load drops out; with none left, `backdrop` shows.
 */
export function PhotoCarousel({
  photos,
  label,
  className,
  frameClassName,
  frameStyle,
  backdrop,
  accent,
}: {
  photos: MediaImage[];
  label: string;
  className?: string;
  frameClassName?: string;
  frameStyle?: CSSProperties;
  /** behind the photos: shown while loading or when every photo failed */
  backdrop?: ReactNode;
  /** colour of the left edge strip (team colour) */
  accent?: string;
}) {
  const [failed, setFailed] = useState<ReadonlySet<string>>(() => new Set());
  const [index, setIndex] = useState(0);
  const list = photos.filter((p) => !failed.has(p.src));
  const n = list.length;
  const i = n ? index % n : 0;
  const current = list[i];
  const go = (step: number) => setIndex((v) => (((v % n) + step) % n + n) % n);

  const onKey = (e: KeyboardEvent) => {
    if (n < 2) return;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      go(-1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      go(1);
    }
  };

  return (
    <figure className={cn('flex flex-col', className)}>
      <div
        role="region"
        aria-roledescription="карусель"
        aria-label={label}
        tabIndex={n > 1 ? 0 : undefined}
        onKeyDown={onKey}
        className={cn('chamfer relative overflow-hidden focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent', frameClassName)}
        style={frameStyle}
      >
        {backdrop}
        {list.map((p, k) => (
          <img
            key={p.src}
            src={p.src}
            alt={k === i ? p.alt : ''}
            aria-hidden={k !== i || undefined}
            decoding="async"
            loading={k === 0 ? 'eager' : 'lazy'}
            onError={() => setFailed((s) => new Set(s).add(p.src))}
            className={cn(
              'absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ease-out motion-reduce:transition-none',
              k === i ? 'opacity-100' : 'opacity-0',
            )}
          />
        ))}
        {accent && <span aria-hidden className="absolute inset-y-0 left-0 w-1.5" style={{ background: accent }} />}

        {n > 1 && (
          // a dark fade under the controls so they read on any photo (legibility, not decoration)
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-black/65 to-transparent px-3 pb-3 pt-12 text-white">
            <div className="flex items-center gap-3 pl-2">
              <span aria-hidden className="flex gap-1">
                {list.map((p, k) => (
                  <span key={p.src} className={cn('h-1 w-6 origin-left transition-transform duration-300 ease-out motion-reduce:transition-none', k === i ? 'bg-white' : 'scale-x-50 bg-white/45')} />
                ))}
              </span>
              <span className="tnum text-xs font-semibold" aria-live="polite">
                {i + 1} / {n}
              </span>
            </div>
            <div className="flex gap-2">
              <ArrowButton label="Попереднє фото" kbd="←" onClick={() => go(-1)}>
                <ChevronLeft className="h-5 w-5" aria-hidden />
              </ArrowButton>
              <ArrowButton label="Наступне фото" kbd="→" onClick={() => go(1)}>
                <ChevronRight className="h-5 w-5" aria-hidden />
              </ArrowButton>
            </div>
          </div>
        )}
      </div>
      {current?.credit && (
        <figcaption className="caption mt-2">
          Фото:{' '}
          {current.sourceUrl ? (
            <a href={current.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-ink">
              {current.credit}
            </a>
          ) : (
            current.credit
          )}
        </figcaption>
      )}
    </figure>
  );
}

/**
 * Square 44px icon button with a real tooltip (hover and keyboard focus) that names the action and
 * its key. The accessible name comes from aria-label; the tooltip is visual only.
 */
function ArrowButton({ label, kbd, onClick, children }: { label: string; kbd: string; onClick: () => void; children: ReactNode }) {
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        aria-keyshortcuts={kbd === '←' ? 'ArrowLeft' : 'ArrowRight'}
        className="peer press grid h-11 w-11 place-items-center rounded-sm bg-black/45 text-white hover:bg-black/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        {children}
      </button>
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-full right-0 mb-2 flex items-center gap-2 whitespace-nowrap rounded-sm bg-ink px-2 py-1 text-xs font-semibold text-bg opacity-0 transition-opacity duration-150 peer-hover:opacity-100 peer-focus-visible:opacity-100 motion-reduce:transition-none"
      >
        {label}
        <kbd className="rounded-sm border border-current/30 px-1 font-sans leading-tight">{kbd}</kbd>
      </span>
    </span>
  );
}
