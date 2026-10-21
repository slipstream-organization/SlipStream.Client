import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, ArrowRight, CalendarDays, Crown, Flag as FlagIcon, Hash, MapPin, Newspaper } from 'lucide-react';
import { driverNews, getDriverStats } from '../../shared/api';
import { BIOS } from '../../shared/mock/bios';
import { CAREERS } from '../../shared/mock/careers';
import { DRIVERS, DRIVER_BY_CODE, SEASON, TEAM_BY_ID } from '../../shared/mock/season';
import { driverPhoto, teamCar, teamLogo } from '../../shared/lib/media';
import { DriverBadge, Flag, SectionTitle } from '../../shared/ui/atoms';
import { fadeUp, stagger } from '../../shared/ui/motion';
import { DriverStatsPanel } from '../../widgets/driver-stats/DriverStatsPanel';
import { NewsCard } from '../../widgets/news/NewsCard';
import { cn } from '../../shared/lib/utils';

export function DriverPage() {
  const code = (useParams().code ?? '').toUpperCase();
  const d = DRIVER_BY_CODE[code];
  if (!d) {
    return (
      <div className="py-40 text-center text-muted">
        Пілота не знайдено ·{' '}
        <Link to="/standings" className="text-f1-red">
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

  return (
    <div>
      <Hero code={code} position={stats.season.position} points={stats.season.points} />

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

        <SeasonResults code={code} />

        {bio && <Biography code={code} />}

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
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted">Напарник по {team.name}</div>
            <div className="display text-2xl">
              {mate.firstName} {mate.lastName}
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-muted transition group-hover:translate-x-1 group-hover:text-f1-red" />
        </Link>
      </div>
    </div>
  );
}

function Hero({ code, position, points }: { code: string; position: number; points: number }) {
  const d = DRIVER_BY_CODE[code];
  const team = TEAM_BY_ID[d.teamId];
  const [carOk, setCarOk] = useState(true);
  const [logoOk, setLogoOk] = useState(true);
  return (
    <section className="relative overflow-hidden text-white" style={{ background: `linear-gradient(115deg, #0b0b0f 30%, ${team.color}cc 100%)` }}>
      <div className="pointer-events-none absolute -right-10 -top-16 select-none font-sport text-[260px] font-black italic leading-none text-white/[0.06] md:text-[420px]">{d.number}</div>
      <div className="relative mx-auto max-w-7xl px-4 pb-10 pt-8 md:px-6 md:pb-16">
        <Link to="/standings" className="mb-8 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white/60 transition hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Таблиця лідерів
        </Link>
        <div className="grid items-end gap-8 lg:grid-cols-[1fr_1.1fr]">
          <motion.div variants={stagger(0.08)} initial="hidden" animate="show">
            <motion.div variants={fadeUp} className="flex items-center gap-3">
              {logoOk && <img src={teamLogo(d.teamId)} alt={team.name} onError={() => setLogoOk(false)} className="h-7 w-auto" />}
              <span className="text-sm font-bold uppercase tracking-[0.2em] text-white/70">{team.fullName}</span>
            </motion.div>
            <motion.div variants={fadeUp} className="mt-4 text-2xl font-light md:text-3xl">
              {d.firstName}
            </motion.div>
            <motion.h1 variants={fadeUp} className="display text-6xl md:text-8xl">
              {d.lastName}
            </motion.h1>
            <motion.div variants={fadeUp} className="mt-5 flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm font-bold">
                <Flag code={d.country} className="h-5 w-5 ring-0" /> {BIOS[code]?.birthplace.split(',').pop()?.trim()}
              </span>
              <span className="rounded-full px-3 py-1.5 font-mono text-sm font-bold text-black" style={{ background: team.color }}>
                #{d.number}
              </span>
              {d.rookie && <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold uppercase text-black">rookie</span>}
            </motion.div>
            <motion.div variants={fadeUp} className="mt-8 flex gap-8">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/50">У чемпіонаті</div>
                <div className="display text-5xl">P{position}</div>
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/50">Очки {SEASON}</div>
                <div className="display text-5xl">{points}</div>
              </div>
            </motion.div>
          </motion.div>
          {carOk && (
            <motion.img
              src={teamCar(d.teamId, 400)}
              alt={`${team.name} ${SEASON}`}
              onError={() => setCarOk(false)}
              initial={{ opacity: 0, x: 120 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
              className="w-full drop-shadow-[0_24px_30px_rgba(0,0,0,0.6)]"
            />
          )}
        </div>
      </div>
    </section>
  );
}

function Fact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <motion.div variants={fadeUp} className="card p-4">
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted">
        <span className="text-f1-red">{icon}</span>
        {label}
      </div>
      <div className="mt-1 truncate text-lg font-bold">{value}</div>
    </motion.div>
  );
}

/** Finishing position per round: taller bar = better result; DNF shown as a red stub. */
function SeasonResults({ code }: { code: string }) {
  const { results } = getDriverStats(code).season;
  const team = TEAM_BY_ID[DRIVER_BY_CODE[code].teamId];
  const [hover, setHover] = useState<number | null>(null);
  if (!results.length) return null;
  const MAXP = 22;
  const active = hover !== null ? results[hover] : null;

  return (
    <section>
      <SectionTitle kicker={`Сезон ${SEASON}`} title="Результати по етапах" />
      <div className="card p-5">
        <div className="mb-3 flex h-6 items-center justify-between text-sm">
          {active ? (
            <span className="flex items-center gap-2">
              <Flag code={active.countryCode} className="h-4 w-4 ring-0" />
              <b>R{active.round} · {active.country}</b>
              <span className="text-muted">
                {active.position ? `P${active.position}` : 'DNF'} · старт P{active.grid} · {active.points} очк.
              </span>
            </span>
          ) : (
            <span className="text-muted">Наведи на стовпчик, щоб побачити деталі</span>
          )}
        </div>
        <div className="flex h-48 items-end gap-1 sm:gap-1.5">
          {results.map((r, i) => {
            const h = r.position ? ((MAXP + 1 - r.position) / MAXP) * 100 : 6;
            return (
              <div
                key={r.round}
                className="flex h-full flex-1 cursor-pointer flex-col justify-end"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              >
                <span className={cn('mb-1 text-center font-mono text-[10px] font-bold transition', hover === i ? 'opacity-100' : 'opacity-60')}>
                  {r.position ? `P${r.position}` : 'DNF'}
                </span>
                <motion.div
                  initial={{ height: 0 }}
                  whileInView={{ height: `${h}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: i * 0.03, ease: 'easeOut' }}
                  className="w-full rounded-t"
                  style={{ background: r.position === null ? '#e10600' : team.color, opacity: hover === null || hover === i ? 1 : 0.4 }}
                />
                <span className="mt-1 text-center font-mono text-[9px] text-muted">{r.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Biography({ code }: { code: string }) {
  const d = DRIVER_BY_CODE[code];
  const team = TEAM_BY_ID[d.teamId];
  const bio = BIOS[code];
  const [photoOk, setPhotoOk] = useState(true);
  return (
    <section className="grid items-stretch gap-8 lg:grid-cols-[1.2fr_1fr]">
      <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
        <SectionTitle kicker="Біографія" title={`${d.firstName} ${d.lastName}`} />
        <p className="text-lg leading-relaxed">{bio.summary}</p>
        <div className="mt-4 flex items-center gap-2 text-sm text-muted">
          <MapPin className="h-4 w-4" /> {bio.birthplace} · {bio.born}
        </div>
        <ul className="mt-6 space-y-3">
          {bio.highlights.map((h, i) => (
            <motion.li
              key={h}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15 + i * 0.08 }}
              className="flex items-center gap-3"
            >
              <span className="h-2 w-6 rounded-full" style={{ background: team.color }} />
              <span className="font-semibold">{h}</span>
            </motion.li>
          ))}
        </ul>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="relative min-h-[380px] overflow-hidden rounded-[18px]"
        style={{ background: `radial-gradient(circle at 50% 35%, ${team.color}, ${team.color}55 55%, #0b0b0f 100%)` }}
      >
        <span className="display absolute left-5 top-3 text-[120px] leading-none text-black/15">{d.number}</span>
        <div className="speed-stripes absolute bottom-8 left-0 h-2 w-1/2 opacity-60" />
        {photoOk && (
          <img
            src={driverPhoto(code, '4col')}
            alt={`${d.firstName} ${d.lastName}`}
            onError={() => setPhotoOk(false)}
            className="absolute bottom-0 left-1/2 h-[95%] -translate-x-1/2 object-contain object-bottom drop-shadow-[0_20px_30px_rgba(0,0,0,0.45)]"
          />
        )}
        <div className="absolute bottom-4 right-4 rounded-lg bg-black/50 px-3 py-2 text-right text-white backdrop-blur">
          <div className="text-[10px] uppercase tracking-[0.2em] text-white/60">{team.name}</div>
          <div className="font-bold">
            {d.firstName} {d.lastName}
          </div>
        </div>
      </motion.div>
    </section>
  );
}
