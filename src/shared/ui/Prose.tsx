import { cn } from '../lib/utils';

/*
 * Article text exactly as the news API sends it: plain text, paragraphs separated by line breaks.
 * Nothing to parse or preprocess — every non-empty line is a paragraph.
 * Typography: 18px, line-height 1.6, ~68 characters, full ink (rules next to the tokens in index.css).
 */

/** Visible marker for quotes without a published source — demo copy can never pass as a real quote. */
export function DemoBadge({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-sm border border-current/40 px-1.5 py-px text-[0.75rem] font-semibold not-italic leading-tight opacity-90', className)}>
      Демо-контент
    </span>
  );
}

export function Prose({ text }: { text: string }) {
  const paragraphs = text
    .split(/\r?\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  return (
    <div className="prose-body">
      {paragraphs.map((p, i) => (
        <p key={i} className="prose-p">
          {p}
        </p>
      ))}
    </div>
  );
}
