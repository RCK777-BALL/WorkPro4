import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

const fetcher = async (path) => {
  const response = await api.get(path);
  return response?.data ?? response;
};

export function Dashboard() {
  const {
    data: metrics,
    error: metricsError,
    isError: isMetricsError,
  } = useQuery({
    queryKey: ['dashboard', 'metrics'],
    queryFn: () => fetcher('/dashboard/metrics'),
  });

  const {
    data: trends,
    error: trendsError,
    isError: isTrendsError,
  } = useQuery({
    queryKey: ['dashboard', 'trends'],
    queryFn: () => fetcher('/dashboard/trends'),
  });

  const {
    data: activity,
    error: activityError,
    isError: isActivityError,
  } = useQuery({
    queryKey: ['dashboard', 'activity'],
    queryFn: () => fetcher('/dashboard/activity'),
  });

  const hasError = isMetricsError || isTrendsError || isActivityError;

  if (hasError) {
    const errorMessage =
      metricsError?.message || trendsError?.message || activityError?.message;

    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          <p className="font-semibold">We ran into an issue loading the dashboard.</p>
          <p className="text-sm text-red-600">
            {errorMessage || 'Please refresh the page or try again later.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <pre className="rounded-lg bg-slate-900 p-6 text-slate-100">
        {JSON.stringify({ metrics, trends, activity }, null, 2)}
      </pre>
    </div>
  );
}
