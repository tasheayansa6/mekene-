import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import type { ApiResponse } from '@/types';

/**
 * Generic hook for fetching API data with TanStack Query.
 */
export function useApi<T>(
  endpoint: string,
  options?: {
    params?: Record<string, string>;
    enabled?: boolean;
    staleTime?: number;
  }
) {
  return useQuery({
    queryKey: ['api', endpoint, options?.params],
    queryFn: async () => {
      const response = await apiFetch<T>(endpoint, { params: options?.params });
      if (!response.success) {
        throw new Error(response.message ?? 'API request failed');
      }
      return response.data as T;
    },
    enabled: options?.enabled ?? true,
    staleTime: options?.staleTime ?? 60_000,
  });
}