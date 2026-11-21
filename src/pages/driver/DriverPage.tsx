import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, ArrowRight, CalendarDays, Crown, Flag as FlagIcon, Hash, MapPin, Newspaper } from 'lucide-react';
import { api, driverNews, getDriverStats } from '../../shared/api';
import { useData } from '../../shared/lib/useData';
import type { DriverMedia } from '../../shared/model/types';
import { BIOS } from '../../shared/mock/bios';
import { BIO_STORIES } from '../../shared/mock/bioStories';
import { CAREERS } from '../../shared/mock/careers';
import { DRIVERS, DRIVER_BY_CODE, SEASON, TEAM_BY_ID } from '../../shared/mock/season';
import { teamCar, teamLogo } from '../../shared/lib/media';
import { DriverBadge, Flag, SectionTitle } from '../../shared/ui/atoms';
import { fadeUp, stagger } from '../../shared/ui/motion';
import { DriverStatsPanel } from '../../widgets/driver-stats/DriverStatsPanel';
import { NewsCard } from '../../widgets/news/NewsCard';
import { RollingNumber } from '../../shared/ui/RollingNumber';
import { PhotoCarousel } from '../../widgets/photo-carousel/PhotoCarousel';

export function DriverPage() {
  const code = (useParams().code ?? '').toUpperCase();
  const d = DRIVER_BY_CODE[code];
  if (!d) {
    return (
      <div className="py-40 text-center text-muted">
        Пілота не знайдено ·{' '}
        <Link to="/standings" className="text-accent-ink">
          до таблиці
        </Link>
      </div>
    );
  }
  return <DriverView key={code} code={code} />;
}

function DriverView({ code }: { code: string }) {
  const d = DRIVER_BY_CODE[code];
  const team = TEAM_BY_ID[d.teamId];
  const bio = BIOS[code];
  const career = CAREERS[code];
  const stats = getDriverStats(code);
  const news = driverNews(code);
  const mate = DRIVERS.find((x) => x.teamId === d.teamId && x.code !== code)!;
  const media = useData(() => api.driverMedia(code), [code]);

  return (
    <div>
      <Hero code={code} position={stats.season.position} points={stats.season.points} cutout={media.data?.cutout} />

      <div className="mx-auto flex max-w-7xl flex-col gap-16 px-4 pt-10 md:px-6">
        {/* quick facts */}
        <motion.div variants={stagger(0.05)} initial="hidden" animate="show" className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <Fact icon={<Hash className="h-3.5 w-3.5" />} label="Номер" value={String(d.number)} />
          <Fact icon={<CalendarDays className="h-3.5 w-3.5" />} label="Народження" value={bio?.born ?? '—'} />
          <Fact icon={<MapPin className="h-3.5 w-3.5" />} label="Місто" value={bio?.birthplace.split(',')[0] ?? '—'} />
          <Fact icon={<FlagIcon className="h-3.5 w-3.5" />} label="Дебют у F1" value={String(career.debut)} />
          <Fact icon={<Crown className="h-3.5 w-3.5" />} label="Титули" value={String(career.titles)} />
        </motion.div>

        <section>
          <SectionTitle kicker="Статистика" title={`Сезон ${SEASON} і кар'єра`} />
          <div className="card p-4 md:p-6">
            <DriverStatsPanel code={code} standalone />
          </div>
        </section>

        {bio && <Biography code={code} media={media.data ?? undefined} />}

        <section>
          <SectionTitle kicker="Paddock" title="Останні новини" />
          {news.length ? (
            <motion.div variants={stagger()} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }} className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {news.slice(0, 6).map((n) => (
                <NewsCard key={n.id} item={n} />
              ))}
            </motion.div>
          ) : (
            <div className="card flex items-center gap-3 p-6 text-muted">
              <Newspaper className="h-5 w-5" /> Новин про {d.lastName} поки немає — вони з’являться після підключення API новин.
            </div>
          )}
        </section>

        {/* teammate */}
        <Link to={`/drivers/${mate.code}`} className="group card relative flex items-center gap-4 overflow-hidden p-5 transition hover:-translate-y-0.5">
          <span className="absolute inset-y-0 left-0 w-1.5" style={{ background: team.color }} />
          <DriverBadge code={mate.code} size={56} />
          <div className="flex-1">
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-muted">Напарник по {team.name}</div>
            <div className="display text-2xl">
              {mate.firstName} {mate.lastName}
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-muted transition group-hover:translate-x-1 group-hover:text-accent-ink" />
        </Link>
      </div>
    </div>
  );
}

function Hero({ code, position, points, cutout }: { code: string; position: number; points: number; cutout?: string }) {
  const d = DRIVER_BY_CODE[code];
  const team = TEAM_BY_ID[d.teamId];
  const [cutOk, setCutOk] = useState(true);
  const [carOk, setCarOk] = useState(true);
  const [logoOk, setLogoOk] = useState(true);
  return (
    /*
     * The original hero (first commit), on the theme tokens: paper → team colour in the light theme,
     * asphalt → team colour in the dark one.
     */
    <section
      className="relative isolate overflow-hidden text-ink"
      style={{ background: `linear-gradient(115deg, var(--c-bg) 30%, color-mix(in srgb, ${team.color} 78%, var(--c-bg)) 100%)` }}
    >
      {/* team-colour glow behind the car */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{ background: `radial-gradient(55% 65% at 74% 62%, color-mix(in srgb, ${team.color} 55%, transparent), transparent 72%)` }}
      />
      <span aria-hidden className="display-wide pointer-events-none absolute -right-6 -top-10 -z-10 select-none text-[clamp(15rem,34vw,27rem)] leading-none text-ink/[0.06]">
        {d.number}
      </span>

      {/* the driver: official season cut-out, not muted, cropped head-to-hips and anchored to the bottom */}
      {cutout && cutOk ? (
        <motion.div
          aria-hidden
          initial={{ opacity: 0, x: 60 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          className="pointer-events-none absolute inset-y-0 right-[-12%] w-[68%] overflow-hidden sm:right-0 sm:w-[46%] lg:right-[5%] lg:w-[36%]"
        >
          <img
            decoding="async"
            src={cutout}
            alt=""
            onError={() => setCutOk(false)}
            className="absolute left-1/2 top-[6%] h-[140%] w-auto max-w-none -translate-x-1/2 drop-shadow-[0_12px_48px_rgba(0,0,0,0.07)] sm:h-[160%] lg:h-[178%] dark:drop-shadow-[0_12px_48px_rgba(0,0,0,0.35)]"
          />
        </motion.div>
      ) : (
        carOk && (
          // no portrait → the car, large and muted under the team colour
          <div aria-hidden className="pointer-events-none absolute bottom-[6%] right-[-12%] w-[90%] opacity-30 lg:right-[-4%] lg:w-[62%]">
            <img decoding="async" src={teamCar(d.teamId, 400)} alt="" onError={() => setCarOk(false)} className="w-full" />
          </div>
        )
      )}
      {/* phones: the photo runs under the text — the asphalt rises from the left so it stays legible */}
      <div aria-hidden className="pointer-events-none absolute inset-0 sm:hidden" style={{ background: 'linear-gradient(90deg, var(--c-bg) 30%, transparent 85%)' }} />

      <div className="relative mx-auto max-w-7xl px-4 pb-10 pt-6 md:px-6 md:pb-16 lg:min-h-[560px]">
        <Link to="/standings" className="mb-6 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted hover:text-ink">
          <ArrowLeft className="h-4 w-4" aria-hidden /> Таблиця лідерів
        </Link>
        <div className="max-w-xl">
          <motion.div variants={stagger(0.03)} initial="hidden" animate="show">
            <motion.div variants={fadeUp} className="flex items-center gap-3">
              {/* the logo in the theme's ink: black on paper, white on asphalt */}
              {logoOk && (
                <>
                  <img decoding="async" src={teamLogo(d.teamId, 128, 'black')} alt={team.name} onError={() => setLogoOk(false)} className="h-7 w-auto dark:hidden" />
                  <img decoding="async" src={teamLogo(d.teamId, 128, 'white')} alt={team.name} onError={() => setLogoOk(false)} className="hidden h-7 w-auto dark:block" />
                </>
              )}
              <span className="text-[15px] font-semibold text-ink/85">{team.fullName}</span>
            </motion.div>
            <motion.p variants={fadeUp} className="mt-5 text-2xl font-normal text-ink/90 md:text-3xl">
              {d.firstName}
            </motion.p>
            <motion.h1 variants={fadeUp} className="display -mt-1 text-[clamp(3.25rem,9vw,7rem)] leading-[0.95]">
              {d.lastName}
            </motion.h1>
            {/* static metadata as plain text — no pill containers */}
            <motion.p variants={fadeUp} className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-base font-semibold">
              <span className="inline-flex items-center gap-2">
                <Flag code={d.country} className="h-5 w-5 ring-0" /> {BIOS[code]?.birthplace.split(',').pop()?.trim()}
              </span>
              <span aria-hidden className="text-muted">
                ·
              </span>
              <span className="inline-flex items-center gap-2">
                <span aria-hidden className="h-4 w-1 -skew-x-12" style={{ background: team.color }} />
                <span className="digits">#{d.number}</span>
              </span>
              {d.rookie && (
                <>
                  <span aria-hidden className="text-muted">
                    ·
                  </span>
                  <span>Новачок</span>
                </>
              )}
            </motion.p>
            <motion.dl variants={fadeUp} className="mt-8 flex gap-10">
              <div>
                <dt className="text-sm text-muted">У чемпіонаті</dt>
                <dd className="digits mt-1 text-5xl font-bold leading-none md:text-6xl">P{position}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted">Очки {SEASON}</dt>
                <dd className="mt-1 text-5xl font-bold leading-none md:text-6xl">
                  <RollingNumber value={points} />
                </dd>
              </div>
            </motion.dl>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function Fact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <motion.div variants={fadeUp} className="card p-4">
      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted">
        <span className="text-accent-ink">{icon}</span>
        {label}
      </div>
      <div className="mt-1 truncate text-lg font-bold">{value}</div>
    </motion.div>
  );
}

function Biography({ code, media }: { code: string; media?: DriverMedia }) {
  const d = DRIVER_BY_CODE[code];
  const team = TEAM_BY_ID[d.teamId];
  const bio = BIOS[code];
  const story = BIO_STORIES[code] ?? [];
  return (
    <section className="grid items-start gap-8 lg:grid-cols-[1.2fr_1fr] lg:gap-12">
      <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}>
        <SectionTitle kicker="Біографія" title={`${d.firstName} ${d.lastName}`} />
        {/* summary + the longer story: plain paragraphs, the reading style */}
        <div className="prose-body">
          {[bio.summary, ...story].map((p) => (
            <p key={p} className="prose-p">
              {p}
            </p>
          ))}
        </div>
        <div className="mt-6 flex items-center gap-2 text-sm text-muted">
          <MapPin className="h-4 w-4" /> {bio.birthplace} · {bio.born}
        </div>
        <ul className="mt-6 space-y-3">
          {bio.highlights.map((h, i) => (
            <motion.li
              key={h}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.2, delay: 0.1 + i * 0.03 }}
              className="flex items-center gap-3"
            >
              <span className="h-2 w-6 rounded-full" style={{ background: team.color }} />
              <span className="font-semibold">{h}</span>
            </motion.li>
          ))}
        </ul>
      </motion.div>

      {/* real photos of the driver (backend media; mock = the formula1.com driver-page carousel) */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="lg:sticky lg:top-24 lg:pt-2"
      >
        <PhotoCarousel
          photos={media?.photos ?? []}
          label={`Фото: ${d.firstName} ${d.lastName}`}
          accent={team.color}
          className="w-full"
          frameClassName="aspect-[16/10] lg:aspect-[4/3]"
          frameStyle={{ background: `linear-gradient(135deg, color-mix(in srgb, ${team.color} 70%, var(--c-bg)), var(--c-surface-2))` }}
          backdrop={
            <span aria-hidden className="display-wide absolute -bottom-4 right-3 select-none text-[9rem] leading-none text-white/15">
              {d.number}
            </span>
          }
        />
      </motion.div>
    </section>
  );
}
