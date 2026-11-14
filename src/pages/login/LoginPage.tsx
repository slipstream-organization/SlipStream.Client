import { Navigate, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { LogIn } from 'lucide-react';
import { useAuth } from '../../app/providers/AuthProvider';
import { safeReturnUrl } from '../../shared/api/identity';
import { Loader } from '../../shared/ui/atoms';
import { fadeUp, stagger } from '../../shared/ui/motion';

const ERRORS: Record<string, string> = {
  google_failed: 'Не вдалося увійти через Google. Спробуйте ще раз.',
  google_no_email: 'Google не передав email акаунта. Дозвольте доступ до email і спробуйте ще раз.',
  session_failed: 'Не вдалося завершити вхід. Спробуйте ще раз.',
};

export function LoginPage() {
  const { status, login } = useAuth();
  const [params] = useSearchParams();
  const returnUrl = safeReturnUrl(params.get('returnUrl'));
  const error = params.get('error');

  if (status === 'loading') return <Loader className="py-40" />;
  if (status === 'authenticated') return <Navigate to={returnUrl} replace />;

  return (
    <div className="mx-auto flex max-w-7xl justify-center px-4 py-24 md:px-6">
      <motion.section
        variants={stagger(0.08)}
        initial="hidden"
        animate="show"
        className="relative w-full max-w-md overflow-hidden rounded-[18px] border border-white/10 bg-[#0b0b0f] p-8 text-white md:p-10"
      >
        <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(circle at 85% 15%, #e1060055, transparent 55%)' }} />
        <div className="speed-stripes pointer-events-none absolute -left-10 bottom-6 h-2 w-1/2 opacity-60" />
        <div className="relative">
          <motion.div variants={fadeUp} className="text-xs font-bold uppercase tracking-[0.25em] text-white/50">
            Вхід
          </motion.div>
          <motion.h1 variants={fadeUp} className="display mt-1 text-5xl">
            На старт
          </motion.h1>
          <motion.p variants={fadeUp} className="mt-3 text-sm text-white/60">
            Увійдіть, щоб зберігати прогнози, кола і свій профіль.
          </motion.p>

          {error && (
            <motion.div variants={fadeUp} role="alert" className="mt-6 rounded-lg border border-f1-red/40 bg-f1-red/10 px-4 py-3 text-sm">
              {ERRORS[error] ?? 'Не вдалося увійти. Спробуйте ще раз.'}
            </motion.div>
          )}

          <motion.button
            variants={fadeUp}
            type="button"
            onClick={() => login(returnUrl)}
            className="mt-8 flex w-full items-center justify-center gap-3 rounded-full bg-white px-6 py-3.5 text-sm font-bold uppercase tracking-wide text-black transition-transform hover:scale-[1.02]"
          >
            <LogIn className="h-4 w-4" />
            Увійти через Google
          </motion.button>
        </div>
      </motion.section>
    </div>
  );
}
