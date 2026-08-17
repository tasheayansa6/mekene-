/**
 * TanStack Query hook for fetching the public church profile.
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api/client';
import type { ChurchProfileData } from '@/lib/church-api';

type ProfileResponse = {
  success: boolean;
  data: ChurchProfileData | null;
};

export function useChurchProfile() {
  return useQuery({
    queryKey: ['church-profile'],
    queryFn: async () => {
      const response = await apiGet<ChurchProfileData>('/church/profile');
      const typed = response as ProfileResponse;
      if (!typed.success || !typed.data) {
        throw new Error('Church profile not available');
      }
      return typed.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
}

export type { ChurchProfileData } from '@/lib/church-api';
