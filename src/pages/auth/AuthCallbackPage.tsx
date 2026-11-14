import { useEffect } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../app/providers/AuthProvider';
import { identity, safeReturnUrl } from '../../shared/api/identity';
import { Loader } from '../../shared/ui/atoms';

const exchanged = new Set<string>();

export function AuthCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { reload } = useAuth();
  const code = params.get('code');
  const returnUrl = safeReturnUrl(params.get('returnUrl'));

  useEffect(() => {
    if (!code || exchanged.has(code)) return;
    exchanged.add(code);

    identity
      .exchange(code)
      .then(reload)
      .then((user) => navigate(user ? returnUrl : '/login?error=session_failed', { replace: true }))
      .catch(() => navigate('/login?error=session_failed', { replace: true }));
  }, [code, returnUrl, navigate, reload]);

  if (!code) return <Navigate to="/login?error=session_failed" replace />;
  return <Loader className="py-40" />;
}
