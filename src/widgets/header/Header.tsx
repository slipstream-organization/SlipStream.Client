import { useEffect, useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'motion/react';
import { Menu, X } from 'lucide-react';
import { ThemeToggle } from '../../shared/ui/ThemeToggle';
import { ME } from '../../shared/mock/profile';
import { cn } from '../../shared/lib/utils';
import { EASE_IN, EASE_OUT, MOTION } from '../../shared/ui/motion';
import { useAuth } from '../../app/providers/AuthProvider';
import { UserAvatar } from '../../shared/ui/UserAvatar';
import { buttonClass } from '../../shared/ui/Button';

const NAV = [
  { to: '/', label: 'Головна', end: true },
  { to: '/races', label: 'Гран-прі сезону' },
  { to: '/standings', label: 'Таблиця лідерів' },
  { to: '/championship', label: 'Битва за титул' },
  { to: '/game', label: 'Predict & Bingo' },
  { to: '/profile', label: 'Профіль' },
];

export function Logo() {
  return (
    <Link to="/" className="group flex min-h-11 items-center gap-2.5" aria-label="SlipStream — на головну">
      <span aria-hidden className="flex gap-[3px]">
        {[0, 1, 2].map((i) => (
          <span key={i} className="h-6 w-[5px] -skew-x-[20deg] bg-accent motion-safe:transition-transform motion-safe:duration-300 group-hover:translate-x-1" style={{ transitionDelay: `${i * 30}ms` }} />
        ))}
      </span>
      <span className="display-wide whitespace-nowrap text-lg leading-none">SlipStream</span>
    </Link>
  );
}

export function Header() {
  const { scrollY } = useScroll();
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const { user, status } = useAuth();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useMotionValueEvent(scrollY, 'change', (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    const next = y > prev && y > 160 && !open;
    if (next !== hidden) setHidden(next);
  });

  return (
    <motion.header
      animate={{ y: hidden ? -84 : 0 }}
      transition={{ duration: MOTION.slow, ease: EASE_OUT }}
      className="sticky top-0 z-50 border-b border-line bg-bg"
      style={{ viewTransitionName: 'site-header' }}
    >
      <div aria-hidden className="h-[3px] bg-accent" />
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 md:px-6">
        <Logo />

        {/* nav: the active item gets the "start line" — a red bar that slides between items */}
        <nav aria-label="Розділи" className="ml-2 hidden h-full items-stretch xl:flex">
          {NAV.slice(0, 5).map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className="relative flex items-center whitespace-nowrap px-3 text-sm font-semibold">
              {({ isActive }) => (
                <>
                  <span className={isActive ? 'text-ink' : 'text-muted hover:text-ink'}>{item.label}</span>
                  {isActive && (
                    <motion.span layoutId="nav-underline" className="absolute inset-x-2 -bottom-px h-[3px] bg-accent" transition={{ duration: MOTION.base, ease: EASE_OUT }} />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          {user ? (
            <NavLink
              to="/profile"
              className={({ isActive }) =>
                cn('hidden min-h-11 items-center gap-2.5 rounded-md border py-1 pl-1 pr-3 text-sm font-semibold sm:flex', isActive ? 'border-accent' : 'border-line hover:border-rule')
              }
            >
              <UserAvatar name={user.name} avatarUrl={user.avatarUrl} className="h-8 w-8 rounded-sm text-xs" />
              <span>{user.handle}</span>
              <span className="tnum text-xs text-muted">{ME.rating}</span>
            </NavLink>
          ) : (
            status === 'anonymous' && (
              <Link to={`/login?returnUrl=${encodeURIComponent(pathname)}`} className={buttonClass('primary', 'hidden min-h-10 px-4 sm:inline-flex')}>
                Увійти
              </Link>
            )
          )}
          <button
            type="button"
            className="grid h-11 w-11 place-items-center rounded-md border border-line xl:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? 'Закрити меню' : 'Відкрити меню'}
            aria-expanded={open}
            aria-controls="mobile-nav"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            key={pathname}
            id="mobile-nav"
            aria-label="Головне меню"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0, transition: { duration: MOTION.base, ease: EASE_OUT } }}
            exit={{ opacity: 0, y: -4, transition: { duration: MOTION.fast, ease: EASE_IN } }}
            className="absolute inset-x-0 top-full max-h-[calc(100dvh-4.5rem)] overflow-y-auto border-b border-line bg-bg shadow-float xl:hidden"
          >
            <ul className="flex flex-col px-4 py-2">
              {NAV.map((item, i) => (
                <motion.li key={item.to} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03, duration: MOTION.base }} className="border-b border-line last:border-0">
                  <NavLink
                    to={item.to}
                    end={item.end}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) => cn('display flex min-h-14 items-center gap-3 text-2xl', isActive ? 'text-ink' : 'text-muted')}
                  >
                    {({ isActive }) => (
                      <>
                        <span aria-hidden className={cn('h-6 w-1.5 -skew-x-12', isActive ? 'bg-accent' : 'bg-transparent')} />
                        {item.label}
                      </>
                    )}
                  </NavLink>
                </motion.li>
              ))}
            </ul>
          </motion.nav>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
