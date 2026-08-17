/**
 * Client-side API fetcher with standardized error handling.
 * All client-side API calls should go through this layer.
 */

import type { ApiResponse } from '@/types';

const API_BASE = '/api/v1';

interface FetchOptions extends RequestInit {
  params?: Record<string, string>;
}

/**
 * Typed API client for making requests to the backend.
 */
export async function apiFetch<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<ApiResponse<T>> {
  const { params, ...fetchOptions } = options;

  let url = `${API_BASE}${endpoint}`;

  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    },
    ...fetchOptions,
  });

  const data: ApiResponse<T> = await response.json();

  if (!response.ok) {
    return data;
  }

  return data;
}

/**
 * Convenience method for GET requests.
 */
export function apiGet<T>(
  endpoint: string,
  params?: Record<string, string>
): Promise<ApiResponse<T>> {
  return apiFetch<T>(endpoint, { method: 'GET', params });
}

/**
 * Convenience method for POST requests.
 */
export function apiPost<T>(
  endpoint: string,
  body?: unknown
): Promise<ApiResponse<T>> {
  return apiFetch<T>(endpoint, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * Convenience method for PUT requests.
 */
export function apiPut<T>(
  endpoint: string,
  body?: unknown
): Promise<ApiResponse<T>> {
  return apiFetch<T>(endpoint, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * Convenience method for DELETE requests.
 */
export function apiDelete<T>(
  endpoint: string
): Promise<ApiResponse<T>> {
  return apiFetch<T>(endpoint, { method: 'DELETE' });
}
