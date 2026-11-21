import { Link } from 'react-router-dom';

/**
 * Poster footer: an inverted ink block (paper on ink in the light theme, ink on paper at night)
 * with the wordmark set huge across the full width.
 */
export function Footer() {
  return (
    <footer className="mt-24 bg-ink text-bg">
      <div aria-hidden className="speed-stripes h-2" />
      <div className="mx-auto grid max-w-7xl gap-10 px-4 pb-6 pt-12 md:grid-cols-12 md:px-6">
        <p className="serif max-w-[42ch] text-base opacity-85 md:col-span-6">
          Фан-хаб Формули 1: календар, результати, прогнози та бінго сезону. Дані поки що демонстраційні — живе API підключимо згодом.
        </p>
        <FooterCol title="Сезон" links={[['Гран-прі', '/races'], ['Таблиця лідерів', '/standings'], ['Битва за титул', '/championship']]} />
        <FooterCol title="Гра" links={[['Прогнози', '/game'], ['Бінго', '/game#bingo'], ['Профіль', '/profile']]} />
      </div>
      {/* the wordmark is sized to the container width ("SLIPSTREAM" measures 6.16em in Tektur Bold), so it always fits */}
      <div className="mx-auto max-w-7xl px-4 [container-type:inline-size] md:px-6">
        <div aria-hidden className="display-wide select-none whitespace-nowrap text-[calc(100cqi/6.7)] leading-[0.9] opacity-95">
          SlipStream
        </div>
      </div>
      <div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-2 px-4 py-5 text-xs opacity-70 md:px-6">
        <span>Неофіційний фан-проєкт. Не пов'язаний з Formula 1 чи FIA.</span>
        <span className="tnum">2026</span>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <nav aria-label={title} className="md:col-span-3">
      <div className="display-narrow mb-3 text-sm opacity-70">{title}</div>
      <ul className="space-y-1">
        {links.map(([label, to]) => (
          <li key={to}>
            <Link to={to} className="inline-flex min-h-9 items-center text-[15px] font-semibold hover:text-accent">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
