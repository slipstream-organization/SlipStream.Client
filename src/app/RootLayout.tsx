import { useLayoutEffect } from 'react';
import { Link, useLocation, useOutlet } from 'react-router-dom';
import { motion } from 'motion/react';
import { Header } from '../widgets/header/Header';
import { Footer } from '../widgets/footer/Footer';
import { EASE_OUT, MOTION } from '../shared/ui/motion';

/**
 * Route changes: the new page replaces the old one immediately and fades in (opacity only — no
 * transform on <main>, so position:fixed children like the reading-progress bar stay fixed).
 * Links with `viewTransition` (news cards) additionally get a View Transition: the cover morphs
 * into the article. An exit animation is not used on purpose — it would keep the old page in the
 * DOM while the View Transition snapshots the new one.
 */
export function RootLayout() {
  const location = useLocation();
  const outlet = useOutlet();

  // layout effect: scroll before the browser paints (and before a View Transition snapshots the page)
  useLayoutEffect(() => {
    // in-page anchors (e.g. /#news from an article) scroll to their section, everything else to the top
    const target = location.hash ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null;
    if (target) target.scrollIntoView();
    else if (!location.hash) window.scrollTo({ top: 0 });
  }, [location.pathname, location.hash]);

  return (
    <div className="flex min-h-screen flex-col bg-bg text-ink">
      <Header />
      <motion.main
        key={location.pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { duration: MOTION.base, ease: EASE_OUT } }}
        className="flex-1"
      >
        {outlet}
      </motion.main>
      <Footer />
    </div>
  );
}

export function NotFound() {
  return (
    <div className="flex flex-col items-center px-4 py-24 text-center sm:py-40">
      <div className="display text-6xl text-accent-ink sm:text-8xl">404</div>
      <p className="mt-4 text-muted">Схоже, ви з’їхали з траси.</p>
      <Link to="/" className="press mt-6 inline-flex min-h-11 items-center rounded-full bg-f1-red px-6 text-sm font-semibold uppercase text-on-accent">
        Назад у піт-лейн
      </Link>
    </div>
  );
}
