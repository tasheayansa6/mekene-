'use client';

import type { ApiResponse } from '@/types';
import { CSRF_HEADER_NAME } from '@/lib/auth/config';
import { ensureCsrfToken, getCsrfToken } from '@/lib/api/client';

export async function adminFetch<T = unknown>(
  url: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  const method = (options?.method || 'GET').toUpperCase();
  const headers = new Headers(options?.headers);

  if (!headers.has('Content-Type') && options?.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const csrf = getCsrfToken() || (await ensureCsrfToken());
    if (csrf) headers.set(CSRF_HEADER_NAME, csrf);
  }

  const res = await fetch(url, {
    ...options,
    credentials: 'include',
    headers,
  });
  return res.json();
}
