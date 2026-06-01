'use client';
import { useQueries } from '@tanstack/react-query';
import { producerApi } from '@/lib/api/producer';
import type { ProducerDashboard, RevenuePoint, CountryViewStats, ContentStats } from '@/types';

interface ProducerAnalyticsResult {
  dashboard:  ProducerDashboard | undefined;
  revenue:    RevenuePoint[]    | undefined;
  countries:  CountryViewStats[] | undefined;
  topContent: ContentStats[]    | undefined;
  loading:    boolean;
  error:      boolean;
}

export function useProducerAnalytics(range: string): ProducerAnalyticsResult {
  const results = useQueries({
    queries: [
      {
        queryKey: ['producer-dashboard'],
        queryFn:  () => producerApi.getDashboard(),
        staleTime: 60_000,
      },
      {
        queryKey: ['producer-revenue', range],
        queryFn:  () => producerApi.getRevenue(range),
        staleTime: 120_000,
      },
      {
        queryKey: ['producer-countries', range],
        queryFn:  () => producerApi.getCountries(range),
        staleTime: 120_000,
      },
      {
        queryKey: ['producer-top-content', range],
        queryFn:  () => producerApi.getTopContent(range),
        staleTime: 120_000,
      },
    ],
  });

  return {
    dashboard:  results[0].data as ProducerDashboard | undefined,
    revenue:    results[1].data as RevenuePoint[]    | undefined,
    countries:  results[2].data as CountryViewStats[] | undefined,
    topContent: results[3].data as ContentStats[]    | undefined,
    loading:    results.some(r => r.isLoading),
    error:      results.some(r => r.isError),
  };
}
