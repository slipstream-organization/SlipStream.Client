import { useEffect, useState } from 'react';

/**
 * Minimal async loader. All data currently comes from mocks in `shared/api`,
 * swapping them for real HTTP calls will not require touching the pages.
 */
export function useData<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [state, setState] = useState<{ data?: T; error?: unknown; loading: boolean }>({ loading: true });

  useEffect(() => {
    let alive = true;
    loader()
      .then((data) => alive && setState({ data, loading: false }))
      .catch((error) => alive && setState({ error, loading: false }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}
