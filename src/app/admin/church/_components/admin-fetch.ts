'use client';

import type { ApiResponse } from '@/types';

const ADMIN_HEADERS = { 'x-admin-key': 'demo-admin' };

export async function adminFetch<T = unknown>(
  url: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  const res = await fetch(url, {
    ...options,
    headers: {
      ...ADMIN_HEADERS,
      ...options?.headers,
      'Content-Type': 'application/json',
    },
  });
  return res.json();
}
