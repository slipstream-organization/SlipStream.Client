import { IDENTITY_URL, identityHttp } from './http';

export interface CurrentUser {
  id: string;
  handle: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  favouriteTeam: string | null;
  favouriteDriver: string | null;
  createdAt: string;
  providers: string[];
}

export interface PublicUser {
  handle: string;
  name: string;
  avatarUrl: string | null;
  favouriteTeam: string | null;
  favouriteDriver: string | null;
  createdAt: string;
}

export type ProfilePatch = Partial<{
  handle: string;
  name: string;
  avatarUrl: string | null;
  favouriteTeam: string | null;
  favouriteDriver: string | null;
}>;

export const HANDLE_PATTERN = /^[A-Za-z0-9_]{3,32}$/;

export function safeReturnUrl(url: string | null | undefined) {
  return url && url.startsWith('/') && !url.startsWith('//') && !url.startsWith('/\\') && !url.includes('://') ? url : '/';
}

export const identity = {
  me: () => identityHttp.get<CurrentUser>('/v1/users/me').then((r) => r.data),
  updateMe: (patch: ProfilePatch) => identityHttp.patch<CurrentUser>('/v1/users/me', patch).then((r) => r.data),
  publicProfile: (handle: string) => identityHttp.get<PublicUser>(`/v1/users/${encodeURIComponent(handle)}`).then((r) => r.data),
  handleAvailable: (handle: string) =>
    identityHttp.get<{ available: boolean }>('/v1/users/handle-available', { params: { handle } }).then((r) => r.data.available),
  exchange: (code: string) => identityHttp.post('/v1/auth/exchange', { code }, { skipAuthRefresh: true }).then(() => undefined),
  logout: () => identityHttp.post('/v1/auth/logout', undefined, { skipAuthRefresh: true }).then(() => undefined),
  logoutAll: () => identityHttp.post('/v1/auth/logout-all').then(() => undefined),
  googleLoginUrl: (returnUrl = '/') => `${IDENTITY_URL}/v1/auth/google?returnUrl=${encodeURIComponent(safeReturnUrl(returnUrl))}`,
};
