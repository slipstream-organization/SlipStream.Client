import { useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'motion/react';
import { Menu, X } from 'lucide-react';
import { ThemeToggle } from '../../shared/ui/ThemeToggle';
import { ME } from '../../shared/mock/profile';
import { cn } from '../../shared/lib/utils';

const NAV = [
  { to: '/', label: 'Головна', end: true },
  { to: '/races', label: 'Гран-прі сезону' },
  { to: '/standings', label: 'Таблиця лідерів' },
  { to: '/game', label: 'Predict & Bingo' },
  { to: '/profile', label: 'Профіль' },
];

export function Logo() {
  return (
    <Link to="/" className="group flex items-center gap-2" aria-label="SlipStream — на головну">
      <span className="flex gap-[3px]">
        {[0, 1, 2].map((i) => (
          <span key={i} className="h-5 w-[5px] skew-x-[-20deg] bg-f1-red transition-transform duration-300 group-hover:translate-x-1" style={{ transitionDelay: `${i * 40}ms` }} />
        ))}
      </span>
      <span className="display text-xl tracking-tight md:text-2xl">
        Slip<span className="text-f1-red">Stream</span>
      </span>
    </Link>
  );
}

export function Header() {
  const { scrollY } = useScroll();
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  useMotionValueEvent(scrollY, 'change', (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    setHidden(y > prev && y > 160 && !open);
    setScrolled(y > 8);
  });

  return (
    <motion.header
      animate={{ y: hidden ? -80 : 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={cn(
        'sticky top-0 z-50 border-b transition-colors duration-300',
        scrolled ? 'border-line bg-bg/80 backdrop-blur-xl' : 'border-transparent bg-bg',
      )}
    >
      <div className="h-[3px] bg-f1-red" />
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 md:px-6">
        <Logo />

        <nav className="ml-4 hidden h-full items-stretch lg:flex">
          {NAV.slice(0, 4).map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className="relative flex items-center px-4 text-sm font-bold uppercase tracking-wide">
              {({ isActive }) => (
                <>
                  <span className={cn('transition-colors', isActive ? 'text-ink' : 'text-muted hover:text-ink')}>{item.label}</span>
                  {isActive && (
                    <motion.span layoutId="nav-underline" className="absolute inset-x-3 bottom-0 h-[3px] rounded-t bg-f1-red" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <ThemeToggle />
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              cn(
                'hidden items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-sm font-bold transition-colors sm:flex',
                isActive ? 'border-f1-red' : 'border-line hover:border-f1-red/60',
              )
            }
          >
            <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-f1-red to-orange-500 text-xs text-white">
              {ME.name[0]}
            </span>
            <span>{ME.handle}</span>
            <span className="font-mono text-xs text-muted">{ME.rating}</span>
          </NavLink>
          <button type="button" className="grid h-9 w-9 place-items-center rounded-full border border-line lg:hidden" onClick={() => setOpen((o) => !o)} aria-label="Меню">
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            key={pathname}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-line bg-bg lg:hidden"
          >
            <div className="flex flex-col px-4 py-2">
              {NAV.map((item, i) => (
                <motion.div key={item.to} initial={{ x: -16, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.04 }}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) => cn('display block border-l-4 py-3 pl-3 text-2xl', isActive ? 'border-f1-red' : 'border-transparent text-muted')}
                  >
                    {item.label}
                  </NavLink>
                </motion.div>
              ))}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
