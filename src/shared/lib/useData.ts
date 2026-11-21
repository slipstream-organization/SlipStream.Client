import { useCallback, useEffect, useState } from 'react';

/**
 * Minimal async loader. All data currently comes from mocks in `shared/api`,
 * swapping them for real HTTP calls will not require touching the pages.
 * `reload` re-runs the loader (used by the "Спробувати ще раз" action).
 */
export function useData<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [state, setState] = useState<{ data?: T; error?: unknown; loading: boolean }>({ loading: true });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    loader()
      .then((data) => alive && setState({ data, loading: false }))
      .catch((error) => alive && setState({ error, loading: false }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt]);

  const reload = useCallback(() => {
    setState((s) => ({ ...s, error: undefined, loading: true }));
    setAttempt((n) => n + 1);
  }, []);

  return { ...state, reload };
}
