/**
 * Client-side API fetcher with standardized error handling.
 * All client-side API calls should go through this layer.
 * Session cookies are sent automatically. CSRF tokens are read from the cookie.
 */

import type { ApiResponse } from '@/types';
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from '@/lib/auth/config';

const API_BASE = '/api/v1';

interface FetchOptions extends RequestInit {
  params?: Record<string, string>;
}

export function getCsrfToken(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${CSRF_COOKIE_NAME}=([^;]*)`)
  );
  return match ? decodeURIComponent(match[1]) : '';
}

export async function ensureCsrfToken(): Promise<string> {
  const existing = getCsrfToken();
  if (existing) return existing;
  await fetch(`${API_BASE}/auth/csrf`, { credentials: 'include' });
  return getCsrfToken();
}

function networkError<T>(): ApiResponse<T> {
  return {
    success: false,
    data: null,
    message: 'Unable to reach the server. Please try again.',
    errors: null,
  };
}

/**
 * Typed API client for making requests to the backend.
 */
export async function apiFetch<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<ApiResponse<T>> {
  const { params, ...fetchOptions } = options;
  const method = (fetchOptions.method || 'GET').toUpperCase();

  let url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  const headers = new Headers(fetchOptions.headers);
  if (!headers.has('Content-Type') && fetchOptions.body && !(fetchOptions.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const csrf = getCsrfToken() || (await ensureCsrfToken());
    if (csrf) headers.set(CSRF_HEADER_NAME, csrf);
  }

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      method,
      headers,
      credentials: 'include',
    });

    const data = (await response.json()) as ApiResponse<T>;
    return { ...data, status: response.status };
  } catch {
    return networkError<T>();
  }
}

export function apiGet<T>(
  endpoint: string,
  params?: Record<string, string>
): Promise<ApiResponse<T>> {
  return apiFetch<T>(endpoint, { method: 'GET', params });
}

export function apiPost<T>(
  endpoint: string,
  body?: unknown
): Promise<ApiResponse<T>> {
  return apiFetch<T>(endpoint, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

export function apiPut<T>(
  endpoint: string,
  body?: unknown
): Promise<ApiResponse<T>> {
  return apiFetch<T>(endpoint, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  });
}

export function apiPatch<T>(
  endpoint: string,
  body?: unknown
): Promise<ApiResponse<T>> {
  return apiFetch<T>(endpoint, {
    method: 'PATCH',
    body: body ? JSON.stringify(body) : undefined,
  });
}

export function apiDelete<T>(endpoint: string): Promise<ApiResponse<T>> {
  return apiFetch<T>(endpoint, { method: 'DELETE' });
}
