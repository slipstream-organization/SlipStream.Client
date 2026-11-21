/* eslint-disable react-refresh/only-export-components */
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import type { NewsItem } from '../../shared/model/types';
import { TrackOutline } from '../../shared/ui/TrackOutline';
import { Tag } from '../../shared/ui/Tag';
import { fadeUp } from '../../shared/ui/motion';
import { cn } from '../../shared/lib/utils';
import { onColor } from '../../shared/lib/color';
import { DRIVER_BY_CODE, TEAM_BY_ID } from '../../shared/mock/season';

type Variant = 'lead' | 'standard' | 'line';

const date = (iso: string) => new Date(iso).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' });

/** The story's colour: team of the first driver it is about, else its first team, its own accent, or F1 red. */
export function storyColor(item: NewsItem) {
  const code = item.relatedDriverIds?.[0];
  const d = code ? DRIVER_BY_CODE[code] : undefined;
  const team = d ? TEAM_BY_ID[d.teamId] : item.relatedTeamIds?.[0] ? TEAM_BY_ID[item.relatedTeamIds[0]] : undefined;
  return { driver: d, color: team?.color ?? item.accent ?? '#e10600' };
}

/**
 * News in three sizes instead of one box:
 *  lead     — a poster: the story's team colour as a field, the driver's number huge in the
 *             background, the cut-out or car breaking out of the frame, headline over the field
 *  standard — image with a cut corner, category marker, headline, two lines of standfirst
 *  line     — text only, for headline lists
 * `featured` is kept for older call sites (= lead).
 */
export function NewsCard({ item, featured, variant }: { item: NewsItem; featured?: boolean; variant?: Variant }) {
  const v: Variant = variant ?? (featured ? 'lead' : 'standard');
  if (v === 'lead') return <LeadCard item={item} />;
  if (v === 'line') return <LineCard item={item} />;
  return <StandardCard item={item} />;
}

function Art({ item, big }: { item: NewsItem; big?: boolean }) {
  const { driver } = storyColor(item);
  return (
    <>
      {driver && (
        <span aria-hidden className={cn('display-wide pointer-events-none absolute select-none leading-none opacity-[0.16]', big ? '-right-3 -top-6 text-[clamp(9rem,24vw,21rem)]' : '-right-2 -top-3 text-[8rem]')}>
          {driver.number}
        </span>
      )}
      {item.image?.kind === 'photo' && (
        <img decoding="async" src={item.image.src} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover motion-safe:transition-transform motion-safe:duration-300 group-hover:scale-[1.04]" />
      )}
      {item.image?.kind === 'car' && (
        <img decoding="async"
          src={item.image.src}
          alt=""
          loading="lazy"
          onError={(e) => (e.currentTarget.style.display = 'none')}
          className={cn(
            'absolute object-contain drop-shadow-[0_10px_28px_rgba(0,0,0,0.07)] motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out group-hover:-translate-x-[4%]',
            big ? 'bottom-[36%] right-[-8%] w-[72%] md:bottom-[18%]' : 'bottom-[9%] right-[-6%] w-[150%] max-w-none',
          )}
        />
      )}
      {item.image?.kind === 'driver' && (
        <img decoding="async"
          src={item.image.src}
          alt=""
          loading="lazy"
          onError={(e) => (e.currentTarget.style.display = 'none')}
          className={cn(
            'absolute bottom-0 origin-bottom object-contain object-bottom motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out group-hover:-translate-x-[3%]',
            big ? 'right-[2%] h-[72%] md:h-[96%]' : 'right-[4%] h-[108%]',
          )}
        />
      )}
      {!item.image && item.circuitId && (
        <TrackOutline circuitId={item.circuitId} className="absolute inset-[12%] h-[76%] w-[76%] opacity-30" strokeWidth={big ? 3 : 2.5} />
      )}
    </>
  );
}

/** Shared element name: the card's cover morphs into the article's cover (View Transitions). */
export const coverTransition = (slug: string) => ({ viewTransitionName: `news-${slug}` }) as CSSProperties;
export const articleHref = (item: NewsItem) => `/news/${item.slug}`;

function LeadCard({ item }: { item: NewsItem }) {
  const { color } = storyColor(item);
  const fg = onColor(color);
  const photo = item.image?.kind === 'photo';
  return (
    <motion.article variants={fadeUp}>
      <Link
        to={articleHref(item)}
        viewTransition
        className="group relative isolate flex min-h-[460px] flex-col justify-end overflow-hidden p-6 md:min-h-[540px] md:p-10"
        style={{ background: color, color: photo ? '#ffffff' : fg, ...coverTransition(item.slug) } as CSSProperties}
      >
        <Art item={item} big />
        {/* legibility: the field colour (or black on photos) rises under the text — not decoration */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: `linear-gradient(to top, ${photo ? 'rgba(0,0,0,.78)' : color} 30%, transparent 70%)` }}
        />
        <div className="relative z-10 max-w-[34rem] md:max-w-[58%]">
          <Tag tone="onColor">{item.tag}</Tag>
          <h3 className="headline mt-3 text-3xl md:text-5xl">{item.title}</h3>
          <p className="serif mt-3 max-w-[46ch] text-base opacity-90 md:text-lg">{item.excerpt}</p>
          <p className="tnum mt-4 text-xs opacity-80">
            {date(item.date)} <span aria-hidden>/</span> {item.readMinutes} хв читання
          </p>
        </div>
      </Link>
    </motion.article>
  );
}

function StandardCard({ item }: { item: NewsItem }) {
  const { color } = storyColor(item);
  const hasField = item.image?.kind === 'driver' || item.image?.kind === 'car';
  return (
    <motion.article variants={fadeUp}>
      <Link to={articleHref(item)} viewTransition className="group flex flex-col">
        <div
          className={cn('chamfer relative aspect-[16/10] overflow-hidden', !hasField && 'bg-surface-2 text-ink')}
          style={{ ...(hasField ? { background: color, color: onColor(color) } : {}), ...coverTransition(item.slug) }}
        >
          <Art item={item} />
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <Tag>{item.tag}</Tag>
          <span className="tnum text-xs text-muted">{date(item.date)}</span>
        </div>
        <h3 className="headline mt-2 text-xl md:text-2xl">{item.title}</h3>
        <span aria-hidden className="mt-3 block h-0.5 w-10 origin-left bg-accent motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out group-hover:scale-x-[3]" />
        <p className="serif mt-3 line-clamp-2 text-[15px] text-muted">{item.excerpt}</p>
        <p className="tnum mt-2 text-xs text-muted">{item.readMinutes} хв читання</p>
      </Link>
    </motion.article>
  );
}

function LineCard({ item }: { item: NewsItem }) {
  return (
    <motion.article variants={fadeUp} className="border-b border-line first:[&>a]:pt-0">
      <Link to={articleHref(item)} viewTransition className="group grid min-h-11 grid-cols-[1fr_auto] items-end gap-x-4 gap-y-1.5 py-4">
        <Tag className="col-span-2">{item.tag}</Tag>
        <h3 className="headline text-lg group-hover:text-accent-ink">{item.title}</h3>
        <span className="tnum whitespace-nowrap text-xs text-muted">{item.readMinutes} хв</span>
      </Link>
    </motion.article>
  );
}

/** The story's cover as a full field (article hero) — same art as the cards, so the morph lines up. */
export function NewsCover({ item, className, children }: { item: NewsItem; className?: string; children?: React.ReactNode }) {
  const { color } = storyColor(item);
  const photo = item.image?.kind === 'photo';
  return (
    <div
      className={cn('relative isolate overflow-hidden', className)}
      style={{ background: color, color: photo ? '#ffffff' : onColor(color), ...coverTransition(item.slug) } as CSSProperties}
    >
      <Art item={item} big />
      {children}
    </div>
  );
}
