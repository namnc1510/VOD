import { requestClient } from '#/api/request';

export interface RevenueData {
  metrics: {
    totalRevenue: number;
    [key: string]: any;
  };
  metricsPrevious?: {
    totalRevenue: number;
  };
  metricsAllTime: {
    totalRevenue: number;
  };
  trends?: {
    timezone: string;
    current: {
      from: string;
      to: string;
      buckets: Record<string, number>;
    };
    previous: {
      from: string;
      to: string;
      buckets: Record<string, number>;
    };
  };
  planDistribution: Array<{
    plan: string;
    revenue: number;
    count: number;
  }>;
  recentTransactions: Array<{
    id: string;
    amount: number;
    plan: string;
    cycle: string;
    createdAt: string;
    user: {
      name: string;
      email: string;
    } | null;
  }>;
}

export async function getRevenueApi(params?: { range?: string }) {
  return requestClient.get<RevenueData>('/dashboard/revenue', { params });
}
