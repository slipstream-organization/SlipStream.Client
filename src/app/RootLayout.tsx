import { useEffect } from 'react';
import { Link, useLocation, useOutlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Header } from '../widgets/header/Header';
import { Footer } from '../widgets/footer/Footer';

export function RootLayout() {
  const location = useLocation();
  const outlet = useOutlet();

  useEffect(() => {
    if (!location.hash) window.scrollTo({ top: 0 });
  }, [location.pathname, location.hash]);

  return (
    <div className="flex min-h-screen flex-col bg-bg text-ink">
      <Header />
      <AnimatePresence mode="wait">
        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="flex-1"
        >
          {outlet}
        </motion.main>
      </AnimatePresence>
      <Footer />
    </div>
  );
}

export function NotFound() {
  return (
    <div className="flex flex-col items-center py-40 text-center">
      <div className="display text-8xl text-f1-red">404</div>
      <p className="mt-4 text-muted">Схоже, ви з’їхали з траси.</p>
      <Link to="/" className="mt-6 rounded-full bg-f1-red px-6 py-3 text-sm font-bold uppercase text-white">
        Назад у піт-лейн
      </Link>
    </div>
  );
}
