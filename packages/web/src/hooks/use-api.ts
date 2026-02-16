import { API_URL } from '@/lib/constants';

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;
  if (!refreshToken) return null;

  try {
    const res = await fetch(API_URL + '/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) return null;

    const json = await res.json();
    if (json.success && json.data) {
      localStorage.setItem('token', json.data.accessToken);
      localStorage.setItem('refreshToken', json.data.refreshToken);
      return json.data.accessToken;
    }
    return null;
  } catch {
    return null;
  }
}

function getNewToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

function clearAuthAndRedirect() {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  if (typeof window !== 'undefined') {
    window.location.href = '/auth/login';
  }
}

export async function fetchAPI<T>(endpoint: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(API_URL + endpoint, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    ...opts,
  });

  if (res.status === 429) {
    const retryAfter = res.headers.get('retry-after');
    const waitSeconds = retryAfter ? parseInt(retryAfter, 10) : 30;
    throw new RateLimitError(
      `Çok fazla istek gönderildi. Lütfen ${waitSeconds} saniye bekleyin.`,
      waitSeconds,
    );
  }

  if (!res.ok) throw new Error('API Error: ' + res.status);
  return res.json();
}

export async function fetchAuthAPI<T>(
  endpoint: string,
  opts?: RequestInit & { raw?: boolean },
): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  if (!token) {
    clearAuthAndRedirect();
    throw new Error('Oturum bulunamadı');
  }

  const { raw, ...fetchOpts } = opts || {};

  const res = await fetch(API_URL + endpoint, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(fetchOpts.headers || {}),
    },
    credentials: 'include',
    ...fetchOpts,
  });

  // 401 — try to refresh token once
  if (res.status === 401) {
    const newToken = await getNewToken();
    if (newToken) {
      const retryRes = await fetch(API_URL + endpoint, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${newToken}`,
          ...(fetchOpts.headers || {}),
        },
        credentials: 'include',
        ...fetchOpts,
      });

      if (retryRes.status === 401) {
        clearAuthAndRedirect();
        throw new Error('Oturum süresi dolmuş');
      }

      if (retryRes.status === 429) {
        const retryAfter = retryRes.headers.get('retry-after');
        const waitSeconds = retryAfter ? parseInt(retryAfter, 10) : 30;
        throw new RateLimitError(
          `Çok fazla istek gönderildi. Lütfen ${waitSeconds} saniye bekleyin.`,
          waitSeconds,
        );
      }

      if (!retryRes.ok) {
        const body = await retryRes.json().catch(() => null);
        throw new Error(body?.error?.message || `API Error: ${retryRes.status}`);
      }

      if (raw) return retryRes as unknown as T;
      return retryRes.json();
    }

    clearAuthAndRedirect();
    throw new Error('Oturum süresi dolmuş');
  }

  // 429 — rate limit
  if (res.status === 429) {
    const retryAfter = res.headers.get('retry-after');
    const waitSeconds = retryAfter ? parseInt(retryAfter, 10) : 30;
    throw new RateLimitError(
      `Çok fazla istek gönderildi. Lütfen ${waitSeconds} saniye bekleyin.`,
      waitSeconds,
    );
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error?.message || `API Error: ${res.status}`);
  }

  if (raw) return res as unknown as T;

  return res.json();
}

export class RateLimitError extends Error {
  retryAfterSeconds: number;
  constructor(message: string, retryAfterSeconds: number) {
    super(message);
    this.name = 'RateLimitError';
    this.retryAfterSeconds = retryAfterSeconds;
  }
}
