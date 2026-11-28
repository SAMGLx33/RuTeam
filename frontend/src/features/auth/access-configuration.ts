import { useQuery } from '@tanstack/react-query';
import type { AccessConfiguration } from '@ruteam/contracts';
import { api } from '../../services/api/client';

export function useAccessConfiguration(enabled = true) {
  return useQuery({
    queryKey: ['access-configuration'],
    queryFn: () => api<AccessConfiguration>('/auth/access'),
    enabled,
    staleTime: 60_000,
  });
}
