import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

declare module 'axios' {
  interface AxiosRequestConfig {
    skipAuthRefresh?: boolean;
    _retried?: boolean;
  }
}

export const IDENTITY_URL: string = import.meta.env.VITE_IDENTITY_URL ?? 'https://localhost:7000';

const IDENTITY_API_URL: string = import.meta.env.VITE_IDENTITY_API_URL ?? '';

export const identityHttp = axios.create({ baseURL: IDENTITY_API_URL, withCredentials: true });

const expiredListeners = new Set<() => void>();

export function onSessionExpired(listener: () => void) {
  expiredListeners.add(listener);
  return () => {
    expiredListeners.delete(listener);
  };
}

let refreshing: Promise<void> | null = null;

function refreshSession() {
  refreshing ??= identityHttp
    .post('/v1/auth/refresh', undefined, { skipAuthRefresh: true })
    .then(() => undefined)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

identityHttp.interceptors.response.use(undefined, async (error: AxiosError) => {
  const config = error.config as InternalAxiosRequestConfig | undefined;
  if (error.response?.status !== 401 || !config || config.skipAuthRefresh || config._retried) throw error;

  config._retried = true;
  try {
    await refreshSession();
  } catch {
    expiredListeners.forEach((l) => l());
    throw error;
  }
  return identityHttp(config);
});

interface ProblemDetails {
  title?: string;
  detail?: string;
  errors?: Record<string, string[]>;
}

export function errorMessage(error: unknown, fallback = 'Щось пішло не так. Спробуйте ще раз.') {
  if (!axios.isAxiosError<ProblemDetails>(error)) return fallback;
  const data = error.response?.data;
  const firstFieldError = data?.errors && Object.values(data.errors).flat()[0];
  return firstFieldError ?? data?.detail ?? fallback;
}

export function fieldErrors(error: unknown): Record<string, string> {
  if (!axios.isAxiosError<ProblemDetails>(error)) return {};
  const errors = error.response?.data?.errors ?? {};
  return Object.fromEntries(Object.entries(errors).map(([k, v]) => [k.charAt(0).toLowerCase() + k.slice(1), v[0]]));
}
