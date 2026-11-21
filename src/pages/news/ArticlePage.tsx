import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion, useScroll } from 'motion/react';
import { Check, Link2 } from 'lucide-react';
import { api } from '../../shared/api';
import { useData } from '../../shared/lib/useData';
import { DRIVER_BY_CODE, TEAM_BY_ID } from '../../shared/mock/season';
import type { NewsItem } from '../../shared/model/types';
import { Skeleton, SkeletonLines } from '../../shared/ui/Skeleton';
import { StateBlock } from '../../shared/ui/StateBlock';
import { Button, buttonClass } from '../../shared/ui/Button';
import { Tag } from '../../shared/ui/Tag';
import { useToast } from '../../shared/ui/Toast';
import { SectionTitle } from '../../shared/ui/atoms';
import { DemoBadge, Prose } from '../../shared/ui/Prose';
import { NewsCard, NewsCover, storyColor } from '../../widgets/news/NewsCard';

const longDate = (iso: string | number) => new Date(iso).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' });

/**
 * Pattern 2 — Detail / Record: one article.
 * Just the story: cover (team colour, quote on the left, cut-out on the right; morphs from the card
 * via View Transition) → headline, italic lead, meta → the plain text from the API (~68 characters) →
 * related drivers/teams aside → read next. A red bar at the very top shows reading progress (scaleX).
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
              Перейти до новин
            </Link>
          }
        />
      </div>
    );
  }

  const next = pickNext(item, all.data ?? []);
  const { color } = storyColor(item);

  return (
    <article>
      <motion.div aria-hidden className="fixed inset-x-0 top-0 z-[60] h-1 origin-left bg-accent" style={{ scaleX: scrollYProgress }} />

      <div className="mx-auto max-w-7xl px-4 pt-6 md:px-6">
        <nav aria-label="Навігаційний ланцюжок">
          <ol className="flex flex-wrap items-center gap-2 text-sm text-muted">
            <li>
              <Link to="/#news" className="inline-flex min-h-11 items-center font-semibold text-ink underline decoration-accent decoration-2 underline-offset-4">
                Новини
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li className="inline-flex min-h-11 items-center">{item.tag}</li>
          </ol>
        </nav>

        <NewsCover item={item} className="mt-3 h-[280px] sm:h-[380px] md:h-[480px]">
          <CoverQuote item={item} color={color} />
        </NewsCover>
      </div>

      <div className="mx-auto grid max-w-7xl gap-10 px-4 pt-8 md:px-6 lg:grid-cols-12 lg:gap-8">
        <div className="min-w-0 lg:col-span-8">
          <Tag>{item.tag}</Tag>
          <h1 className="headline mt-3 max-w-[22ch] text-[clamp(2rem,5vw,3.75rem)]">{item.title}</h1>
          {/* the lead: italic, a step larger than the body, full ink for contrast */}
          <p className="lead mt-5 max-w-[60ch]">{item.lead ?? item.excerpt}</p>
          <InlineQuote item={item} color={color} />
          <Meta item={item} />

          <div className="mt-10">{item.body ? <Prose text={item.body} /> : <p className="prose-body">{item.excerpt}</p>}</div>
        </div>

        <aside className="lg:col-span-4" aria-label="Пов’язане">
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

/**
 * The cover's left half: the story's quote on the team-colour field (the cut-out sits on the right).
 * A field-coloured fade keeps it legible where a car or the number runs underneath. md+ only —
 * on phones the same quote sits under the lead (InlineQuote).
 */
function CoverQuote({ item, color }: { item: NewsItem; color: string }) {
  const q = item.quotes?.[0];
  if (!q) return null;
  const photo = item.image?.kind === 'photo';
  return (
    <>
      <div aria-hidden className="pointer-events-none absolute inset-0 hidden md:block" style={{ background: `linear-gradient(to right, ${photo ? 'rgba(0,0,0,.72)' : color} 38%, transparent 68%)` }} />
      <figure className="absolute inset-y-0 left-0 z-10 hidden w-[54%] flex-col justify-center p-10 md:flex lg:p-14">
        <span aria-hidden className="mb-5 block h-[3px] w-14 bg-current opacity-70" />
        <blockquote className="quote text-[clamp(1.5rem,2.5vw,2.375rem)] leading-[1.2]">«{q.text}»</blockquote>
        <figcaption className="mt-5 text-[0.9375rem] opacity-90">
          <Signature item={item} />
        </figcaption>
      </figure>
    </>
  );
}

function InlineQuote({ item, color }: { item: NewsItem; color: string }) {
  const q = item.quotes?.[0];
  if (!q) return null;
  return (
    <figure className="mt-8 border-l-[3px] pl-5 md:hidden" style={{ borderColor: color }}>
      <blockquote className="quote text-[1.375rem] leading-snug">«{q.text}»</blockquote>
      <figcaption className="mt-3 text-[0.9375rem] text-muted">
        <Signature item={item} />
      </figcaption>
    </figure>
  );
}

/** "— Author, role" + source link, or the demo badge when the quote has no source. */
function Signature({ item }: { item: NewsItem }) {
  const q = item.quotes![0];
  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span>
        — <span className="font-semibold">{q.author}</span>
        {q.role && <span>, {q.role}</span>}
      </span>
      {q.source ? (
        q.sourceUrl ? (
          <a href={q.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
            {q.source}
          </a>
        ) : (
          <span>{q.source}</span>
        )
      ) : (
        <DemoBadge />
      )}
    </span>
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
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  // copy only — no share sheet
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast('Посилання скопійовано');
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast('Не вдалося скопіювати. Скопіюйте адресу зі смуги браузера.', { tone: 'error' });
    }
  };

  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-y border-line py-4">
      <dl className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
        {item.author && (
          <div>
            <dt className="text-xs text-muted">Автор</dt>
            <dd>
              <span className="font-semibold">{item.author.name}</span>
              <span className="text-muted">, {item.author.role}</span>
            </dd>
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
      <Button variant="secondary" onClick={copy} className="min-h-11 px-4" aria-live="polite">
        {copied ? <Check className="h-4 w-4" aria-hidden /> : <Link2 className="h-4 w-4" aria-hidden />}
        {copied ? 'Скопійовано' : 'Копіювати посилання'}
      </Button>
    </div>
  );
}

function Related({ item }: { item: NewsItem }) {
  const drivers = (item.relatedDriverIds ?? []).map((c) => DRIVER_BY_CODE[c]).filter(Boolean);
  const teamIds = item.relatedTeamIds?.length ? item.relatedTeamIds : [...new Set(drivers.map((d) => d.teamId))];
  const teams = teamIds.map((t) => TEAM_BY_ID[t]).filter(Boolean);
  if (!drivers.length && !teams.length && !item.tags?.length) return null;
  return (
    <>
      {drivers.length > 0 && (
        <section aria-labelledby="related-drivers">
          <h2 id="related-drivers" className="display-narrow border-b-2 border-rule pb-2 text-lg">
            Пілоти в матеріалі
          </h2>
          <ul className="mt-3 overflow-hidden rounded-md border border-line bg-surface [&>li:last-child>a]:border-b-0">
            {drivers.map((d) => (
              <li key={d.code}>
                <Link to={`/drivers/${d.code}`} className="group grid min-h-12 grid-cols-[4px_2.5rem_1fr_auto] items-center gap-3 border-b border-line py-2 pr-3 hover:bg-surface-2">
                  <span aria-hidden className="h-8 w-1 origin-left motion-safe:transition-transform motion-safe:duration-200 group-hover:scale-x-[2.5]" style={{ background: TEAM_BY_ID[d.teamId].color }} />
                  <span className="digits text-sm text-muted">#{d.number}</span>
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
