import { Link } from 'react-router-dom';
import { Logo } from '../header/Header';

export function Footer() {
  return (
    <footer className="mt-24 border-t border-line bg-surface">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 md:grid-cols-4 md:px-6">
        <div className="md:col-span-2">
          <Logo />
          <p className="mt-4 max-w-sm text-sm text-muted">
            Фан-хаб Формули 1: календар, результати, прогнози та бінго сезону. Дані поки що демонстраційні — скоро підключимо живе API.
          </p>
        </div>
        <FooterCol title="Сезон" links={[['Гран-прі', '/races'], ['Таблиця лідерів', '/standings']]} />
        <FooterCol title="Гра" links={[['Bold predictions', '/game'], ['Бінго', '/game#bingo'], ['Профіль', '/profile']]} />
      </div>
      <div className="speed-stripes h-2 opacity-60" />
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <div className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-muted">{title}</div>
      <ul className="space-y-2 text-sm">
        {links.map(([label, to]) => (
          <li key={to}>
            <Link to={to} className="transition-colors hover:text-f1-red">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
