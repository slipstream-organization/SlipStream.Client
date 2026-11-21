import { Link, useParams } from 'react-router-dom';
import { motion, useScroll } from 'motion/react';
import { Share2 } from 'lucide-react';
import { api } from '../../shared/api';
import { useData } from '../../shared/lib/useData';
import { DRIVER_BY_CODE, TEAM_BY_ID } from '../../shared/mock/season';
import type { NewsBlock, NewsItem } from '../../shared/model/types';
import { Skeleton, SkeletonLines } from '../../shared/ui/Skeleton';
import { StateBlock } from '../../shared/ui/StateBlock';
import { Button, buttonClass } from '../../shared/ui/Button';
import { Tag } from '../../shared/ui/Tag';
import { useToast } from '../../shared/ui/Toast';
import { SectionTitle } from '../../shared/ui/atoms';
import { NewsCard, NewsCover, storyColor } from '../../widgets/news/NewsCard';
import { onColor } from '../../shared/lib/color';
import { cn } from '../../shared/lib/utils';

const longDate = (iso: string) => new Date(iso).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' });

/**
 * Pattern 2 — Detail / Record: one article.
 * Breadcrumbs → cover (morphs from the card via View Transition) → headline + meta →
 * a ~68-character reading column with quotes and figures → related drivers/teams → read next.
 * A red bar at the very top shows reading progress (scaleX from scroll — transform only).
 */
export function ArticlePage() {
  const { slug = '' } = useParams();
  const article = useData(() => api.newsArticle(slug), [slug]);
  const all = useData(api.news);
  const { scrollYProgress } = useScroll();

  if (article.loading) return <ArticleSkeleton />;
  const item = article.data;
  if (!item) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 md:px-6">
        <StateBlock
          kind="error"
          title="Матеріал не знайдено"
          description="Можливо, посилання застаріло або матеріал прибрали. Свіжі новини — на головній."
          action={
            <Link to="/#news" className={buttonClass('primary')}>
              До новин на головній
            </Link>
          }
        />
      </div>
    );
  }

  const next = pickNext(item, all.data ?? []);

  return (
    <article>
      <motion.div aria-hidden className="fixed inset-x-0 top-0 z-[60] h-1 origin-left bg-accent" style={{ scaleX: scrollYProgress }} />

      <div className="mx-auto max-w-7xl px-4 pt-6 md:px-6">
        <nav aria-label="Навігаційний ланцюжок">
          <ol className="flex flex-wrap items-center gap-2 text-sm text-muted">
            <li>
              <Link to="/#news" className="inline-flex min-h-9 items-center font-semibold text-ink underline decoration-accent decoration-2 underline-offset-4">
                Новини
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li className="inline-flex min-h-9 items-center">{item.tag}</li>
          </ol>
        </nav>

        <NewsCover item={item} className="mt-3 h-[280px] sm:h-[380px] md:h-[480px]" />
      </div>

      <div className="mx-auto grid max-w-7xl gap-10 px-4 pt-8 md:px-6 lg:grid-cols-12 lg:gap-8">
        {/* main column: ~68 characters of Literata */}
        <div className="lg:col-span-8 lg:col-start-1">
          <Tag>{item.tag}</Tag>
          <h1 className="headline mt-3 max-w-[22ch] text-[clamp(2rem,5vw,3.75rem)]">{item.title}</h1>
          <p className="serif mt-5 max-w-[68ch] text-xl text-muted">{item.excerpt}</p>
          <Meta item={item} />

          <div className="mt-10 max-w-[68ch]">{item.body?.map((b, i) => <Block key={i} block={b} item={item} first={i === 0} />)}</div>
        </div>

        <aside className="lg:col-span-4">
          <div className="space-y-10 lg:sticky lg:top-24">
            <Related item={item} />
          </div>
        </aside>
      </div>

      {next.length > 0 && (
        <section className="mx-auto mt-20 max-w-7xl px-4 md:px-6">
          <SectionTitle title="Читайте також" />
          <motion.div variants={{ hidden: {}, show: { transition: { staggerChildren: 0.03 } } }} initial="hidden" whileInView="show" viewport={{ once: true }} className="grid gap-x-8 gap-y-12 md:grid-cols-3">
            {next.map((n) => (
              <NewsCard key={n.id} item={n} />
            ))}
          </motion.div>
        </section>
      )}
    </article>
  );
}

/** Same category first, then the most recent others. */
function pickNext(item: NewsItem, all: NewsItem[]) {
  const others = all.filter((n) => n.id !== item.id);
  const same = others.filter((n) => n.tag === item.tag);
  return [...same, ...others.filter((n) => n.tag !== item.tag)].slice(0, 3);
}

function Meta({ item }: { item: NewsItem }) {
  const toast = useToast();
  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: item.title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast('Посилання скопійовано');
    } catch (e) {
      // user closed the share sheet — nothing to report
      if ((e as DOMException)?.name !== 'AbortError') toast('Не вдалося поділитися. Скопіюйте адресу зі смуги браузера.', { tone: 'error' });
    }
  };
  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-y border-line py-4">
      <dl className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
        {item.author && (
          <div>
            <dt className="text-xs text-muted">Автор</dt>
            <dd className="font-semibold">{item.author.name}</dd>
          </div>
        )}
        <div>
          <dt className="text-xs text-muted">Опубліковано</dt>
          <dd className="tnum font-semibold">
            <time dateTime={item.date}>{longDate(item.date)}</time>
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Читання</dt>
          <dd className="tnum font-semibold">{item.readMinutes} хв</dd>
        </div>
      </dl>
      <Button variant="secondary" onClick={share} className="min-h-10 px-4">
        <Share2 className="h-4 w-4" aria-hidden /> Поділитися
      </Button>
    </div>
  );
}

function Block({ block, item, first }: { block: NewsBlock; item: NewsItem; first: boolean }) {
  switch (block.type) {
    case 'p':
      return <p className={cn('serif mb-6 text-[1.0625rem] leading-[1.75]', first && 'text-xl leading-[1.65]')}>{block.text}</p>;
    case 'h2':
      return <h2 className="display mb-4 mt-12 text-2xl md:text-3xl">{block.text}</h2>;
    case 'quote':
      return (
        <blockquote className="my-12 border-l-4 border-accent pl-6">
          <p className="serif text-2xl italic leading-snug md:text-3xl">«{block.text}»</p>
          {block.cite && <footer className="mt-3 text-sm text-muted">{block.cite}</footer>}
        </blockquote>
      );
    case 'list':
      return (
        <ul className="serif mb-8 space-y-3 text-[1.0625rem] leading-[1.7]">
          {block.items.map((li) => (
            <li key={li} className="flex gap-3">
              <span aria-hidden className="mt-2 h-3 w-1.5 shrink-0 -skew-x-12 bg-accent" />
              {li}
            </li>
          ))}
        </ul>
      );
    case 'image': {
      const { color } = storyColor(item);
      const field = block.kind === 'car' || block.kind === 'driver';
      return (
        <figure className="my-12">
          <div className={cn('chamfer relative aspect-[16/9] overflow-hidden', !field && 'bg-surface-2')} style={field ? { background: color, color: onColor(color) } : undefined}>
            <img
              src={block.src}
              alt={block.alt}
              loading="lazy"
              onError={(e) => (e.currentTarget.style.visibility = 'hidden')}
              className={cn(
                'absolute',
                block.kind === 'photo' && 'inset-0 h-full w-full object-cover',
                block.kind === 'car' && 'inset-x-[6%] bottom-[14%] w-[88%] object-contain',
                block.kind === 'driver' && 'bottom-0 left-1/2 h-[104%] -translate-x-1/2 object-contain object-bottom',
              )}
            />
          </div>
          {(block.caption || block.credit) && (
            <figcaption className="mt-3 text-sm text-muted">
              {block.caption}
              {block.credit && <span className="ml-2 text-xs">Фото: {block.credit}</span>}
            </figcaption>
          )}
        </figure>
      );
    }
  }
}

function Related({ item }: { item: NewsItem }) {
  const drivers = (item.drivers ?? []).map((c) => DRIVER_BY_CODE[c]).filter(Boolean);
  const teams = (item.teams ?? []).map((t) => TEAM_BY_ID[t]).filter(Boolean);
  if (!drivers.length && !teams.length && !item.tags?.length) return null;
  return (
    <>
      {drivers.length > 0 && (
        <section aria-labelledby="related-drivers">
          <h2 id="related-drivers" className="display-narrow border-b-2 border-rule pb-2 text-lg">
            Пілоти в матеріалі
          </h2>
          <ul>
            {drivers.map((d) => (
              <li key={d.code}>
                <Link to={`/drivers/${d.code}`} className="group grid min-h-12 grid-cols-[4px_2.5rem_1fr_auto] items-center gap-3 border-b border-line py-2 hover:bg-surface-2">
                  <span aria-hidden className="h-8 w-1 origin-left motion-safe:transition-transform motion-safe:duration-200 group-hover:scale-x-[2.5]" style={{ background: TEAM_BY_ID[d.teamId].color }} />
                  <span className="tnum text-sm text-muted">#{d.number}</span>
                  <span className="font-semibold">
                    {d.firstName} {d.lastName}
                  </span>
                  <span className="text-xs text-muted">{TEAM_BY_ID[d.teamId].name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {teams.length > 0 && (
        <section aria-labelledby="related-teams">
          <h2 id="related-teams" className="display-narrow border-b-2 border-rule pb-2 text-lg">
            Команди
          </h2>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
            {teams.map((t) => (
              <li key={t.id}>
                <Tag color={t.color}>{t.name}</Tag>
              </li>
            ))}
          </ul>
        </section>
      )}
      {item.tags && item.tags.length > 0 && (
        <section aria-labelledby="related-tags">
          <h2 id="related-tags" className="display-narrow border-b-2 border-rule pb-2 text-lg">
            Теми
          </h2>
          <p className="mt-3 text-sm text-muted">{item.tags.join(', ')}</p>
        </section>
      )}
    </>
  );
}

function ArticleSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 md:px-6" role="status" aria-busy="true" aria-label="Завантаження">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="mt-3 h-[280px] rounded-none sm:h-[380px] md:h-[480px]" />
      <div className="mt-8 max-w-[68ch] space-y-4">
        <Skeleton className="h-12 w-4/5" />
        <SkeletonLines lines={4} />
      </div>
    </div>
  );
}
