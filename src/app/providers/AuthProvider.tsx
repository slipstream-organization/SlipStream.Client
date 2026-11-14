import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { identity, type CurrentUser, type ProfilePatch } from '../../shared/api/identity';
import { onSessionExpired } from '../../shared/api/http';

type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

interface AuthState {
  user: CurrentUser | null;
  status: AuthStatus;
  login: (returnUrl?: string) => void;
  logout: (everywhere?: boolean) => Promise<void>;
  reload: () => Promise<CurrentUser | null>;
  update: (patch: ProfilePatch) => Promise<CurrentUser>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  status: 'loading',
  login: () => {},
  logout: async () => {},
  reload: async () => null,
  update: async () => {
    throw new Error('AuthProvider is missing');
  },
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  const signOutLocally = useCallback(() => {
    setUser(null);
    setStatus('anonymous');
  }, []);

  const reload = useCallback(async () => {
    try {
      const me = await identity.me();
      setUser(me);
      setStatus('authenticated');
      return me;
    } catch {
      signOutLocally();
      return null;
    }
  }, [signOutLocally]);

  useEffect(() => {
    let alive = true;
    identity
      .me()
      .then((me) => {
        if (!alive) return;
        setUser(me);
        setStatus('authenticated');
      })
      .catch(() => alive && signOutLocally());
    const unsubscribe = onSessionExpired(signOutLocally);
    return () => {
      alive = false;
      unsubscribe();
    };
  }, [signOutLocally]);

  const login = useCallback((returnUrl?: string) => {
    window.location.href = identity.googleLoginUrl(returnUrl ?? window.location.pathname + window.location.search);
  }, []);

  const logout = useCallback(
    async (everywhere = false) => {
      try {
        await (everywhere ? identity.logoutAll() : identity.logout());
      } finally {
        signOutLocally();
      }
    },
    [signOutLocally],
  );

  const update = useCallback(async (patch: ProfilePatch) => {
    const me = await identity.updateMe(patch);
    setUser(me);
    return me;
  }, []);

  return <AuthContext.Provider value={{ user, status, login, logout, reload, update }}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
