import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { GlassCard } from '../GlassCard';
import { Input } from '../ui/input';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';
import {
  CheckCircle,
  AlertCircle,
  Clock,
  TrendingUp,
  Loader2,
  RefreshCcw,
  Filter,
  X as CloseIcon
} from 'lucide-react';
import {
  getAuthToken,
  getDetectionStats,
  getAdminPendingItems,
  DetectionStats,
  AdminPendingItem
} from '../../utils/api';

const CONFIDENCE_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'high', label: 'High (≥70%)' },
  { id: 'medium', label: 'Medium (50-69%)' },
  { id: 'low', label: 'Low (<50%)' }
] as const;

type ConfidenceFilter = (typeof CONFIDENCE_FILTERS)[number]['id'];

const DEVICE_STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-500',
  inactive: 'bg-rose-500',
  pending: 'bg-amber-400'
};

function formatPercentage(value: number): string {
  if (!Number.isFinite(value)) return '0%';
  return `${Math.round(value)}%`;
}

function formatConfidence(value: number): string {
  if (!Number.isFinite(value)) return '0%';
  return `${Math.round(value * 100)}%`;
}

function formatRelativeTime(timestamp: string | null): string {
  if (!timestamp) return 'No heartbeat';
  const now = Date.now();
  const date = new Date(timestamp);
  const diffMinutes = Math.max(0, Math.floor((now - date.getTime()) / (1000 * 60)));

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hr${diffHours === 1 ? '' : 's'} ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
}

function formatTimestamp(timestamp: string | null): string {
  if (!timestamp) return '—';
  const date = new Date(timestamp);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
}

function matchesConfidenceRange(confidence: number, filter: ConfidenceFilter): boolean {
  switch (filter) {
    case 'high':
      return confidence >= 0.7;
    case 'medium':
      return confidence >= 0.5 && confidence < 0.7;
    case 'low':
      return confidence < 0.5;
    default:
      return true;
  }
}

export function AdminOverview() {
  const [detectionStats, setDetectionStats] = useState<DetectionStats | null>(null);
  const [pendingItems, setPendingItems] = useState<AdminPendingItem[]>([]);

  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [queueError, setQueueError] = useState<string | null>(null);

  const [lastStatsUpdate, setLastStatsUpdate] = useState<string | null>(null);
  const [lastQueueUpdate, setLastQueueUpdate] = useState<string | null>(null);

  const [highlightStats, setHighlightStats] = useState(false);
  const [highlightQueue, setHighlightQueue] = useState(false);

  const [confidenceFilter, setConfidenceFilter] = useState<ConfidenceFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPendingId, setSelectedPendingId] = useState<string | null>(null);

  const fetchStats = useCallback(async (showLoader = false) => {
    if (showLoader) setLoadingStats(true);

    try {
      const token = getAuthToken();
      if (!token) {
        setStatsError('Admin authentication required.');
        setDetectionStats(null);
        return;
      }

      const stats = await getDetectionStats(token);
      setDetectionStats(stats);
      setStatsError(null);
      const timestamp = new Date().toISOString();
      setLastStatsUpdate(timestamp);
    } catch (error) {
      setStatsError(error instanceof Error ? error.message : 'Failed to fetch detection stats');
    } finally {
      setLoadingStats(false);
    }
  }, []);

  const fetchPendingQueue = useCallback(async (showLoader = false) => {
    if (showLoader) setLoadingQueue(true);

    try {
      const token = getAuthToken();
      if (!token) {
        setQueueError('Admin authentication required.');
        setPendingItems([]);
        return;
      }

      const response = await getAdminPendingItems(token, {
        status: 'pending',
        sortBy: 'timestamp',
        sortOrder: 'ASC',
        limit: 200
      });

      setPendingItems(response.pendingItems);
      setQueueError(null);
      const timestamp = new Date().toISOString();
      setLastQueueUpdate(timestamp);
    } catch (error) {
      setQueueError(error instanceof Error ? error.message : 'Failed to fetch pending queue');
    } finally {
      setLoadingQueue(false);
    }
  }, []);

  useEffect(() => {
    fetchStats(true);
    const statsInterval = setInterval(() => fetchStats(false), 15000);
    return () => clearInterval(statsInterval);
  }, [fetchStats]);

  useEffect(() => {
    fetchPendingQueue(true);
    const queueInterval = setInterval(() => fetchPendingQueue(false), 15000);
    return () => clearInterval(queueInterval);
  }, [fetchPendingQueue]);

  useEffect(() => {
    if (!lastStatsUpdate) return;
    setHighlightStats(true);
    const timeout = setTimeout(() => setHighlightStats(false), 700);
    return () => clearTimeout(timeout);
  }, [lastStatsUpdate]);

  useEffect(() => {
    if (!lastQueueUpdate) return;
    setHighlightQueue(true);
    const timeout = setTimeout(() => setHighlightQueue(false), 700);
    return () => clearTimeout(timeout);
  }, [lastQueueUpdate]);

  const filteredPendingItems = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return pendingItems.filter((item) => {
      const confidence = Number(item.confidence ?? 0);
      if (!matchesConfidenceRange(confidence, confidenceFilter)) return false;

      if (normalizedSearch) {
        const composite = `${item.userEmail ?? ''} ${item.userName ?? ''} ${item.productName ?? ''}`.toLowerCase();
        if (!composite.includes(normalizedSearch)) return false;
      }

      return true;
    });
  }, [pendingItems, confidenceFilter, searchTerm]);

  const selectedPendingItem = useMemo(() => {
    if (!selectedPendingId) return null;
    return pendingItems.find((item) => item.id === selectedPendingId) ?? null;
  }, [pendingItems, selectedPendingId]);

  const showSelectedPending =
    selectedPendingItem && filteredPendingItems.some((item) => item.id === selectedPendingItem.id);

  const confidenceChartData = useMemo(() => {
    return [
      { name: 'High (≥70%)', value: detectionStats?.highConfidence ?? 0, fill: '#10b981' },
      { name: 'Low (<70%)', value: detectionStats?.lowConfidence ?? 0, fill: '#f59e0b' }
    ];
  }, [detectionStats]);

  const detectionsTimeline = useMemo(() => {
    if (!detectionStats) return [];
    return detectionStats.detectionsByHour.map((point) => ({
      hour: point.hour,
      count: point.count
    }));
  }, [detectionStats]);

  const highConfidencePercent =
    detectionStats && detectionStats.totalDetections > 0
      ? Math.round((detectionStats.highConfidence / detectionStats.totalDetections) * 100)
      : 0;
  const lowConfidencePercent =
    detectionStats && detectionStats.totalDetections > 0
      ? Math.round((detectionStats.lowConfidence / detectionStats.totalDetections) * 100)
      : 0;

  const handleManualRefresh = () => {
    fetchStats(true);
    fetchPendingQueue(true);
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-slate-900 mb-1">Detection Analytics</h2>
            <p className="text-slate-600">
              Real-time visibility into system detections, confidence trends, and device health.
            </p>
            {(lastStatsUpdate || lastQueueUpdate) && (
              <p className="text-xs text-slate-500 mt-2">
                Stats updated: {lastStatsUpdate ? formatTimestamp(lastStatsUpdate) : '—'} · Queue updated:{' '}
                {lastQueueUpdate ? formatTimestamp(lastQueueUpdate) : '—'}
              </p>
            )}
          </div>
          <button
            onClick={handleManualRefresh}
            className="inline-flex items-center gap-2 self-start rounded-xl bg-slate-900 px-4 py-2 text-sm text-white transition hover:bg-slate-800"
          >
            {(loadingStats || loadingQueue) ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCcw className="h-4 w-4" />
            )}
            Refresh
          </button>
        </div>
      </motion.div>

      {statsError && (
        <GlassCard className="border border-rose-200 bg-rose-50/70 p-4 text-rose-700">
          <p className="text-sm">{statsError}</p>
        </GlassCard>
      )}

      <div
        className={`grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 transition ${
          highlightStats ? 'ring-2 ring-blue-400/40' : ''
        }`}
      >
        <GlassCard hover className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Total Detections Today</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">
                {detectionStats?.totalDetections ?? 0}
              </p>
              <p className="text-xs text-slate-500">
                {detectionStats?.detectionsToday ?? 0} detections across all devices
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100">
              <TrendingUp className="h-6 w-6 text-blue-500" />
            </div>
          </div>
        </GlassCard>

        <GlassCard hover className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">High Confidence</p>
              <p className="mt-2 text-3xl font-semibold text-emerald-700">
                {detectionStats?.highConfidence ?? 0}
              </p>
              <p className="text-xs text-emerald-600">{formatPercentage(highConfidencePercent)}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100">
              <CheckCircle className="h-6 w-6 text-emerald-600" />
            </div>
          </div>
        </GlassCard>

        <GlassCard hover className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Low Confidence</p>
              <p className="mt-2 text-3xl font-semibold text-amber-700">
                {detectionStats?.lowConfidence ?? 0}
              </p>
              <p className="text-xs text-amber-600">{formatPercentage(lowConfidencePercent)}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100">
              <AlertCircle className="h-6 w-6 text-amber-600" />
            </div>
          </div>
        </GlassCard>

        <GlassCard hover className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Pending Approvals</p>
              <p className="mt-2 text-3xl font-semibold text-orange-700">
                {detectionStats?.pendingApprovals ?? 0}
              </p>
              <p className="text-xs text-slate-500">Awaiting review across all users</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100">
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <GlassCard className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Confidence Distribution</h3>
              <p className="text-sm text-slate-500">
                Breakdown of detections by confidence level
              </p>
            </div>
            {loadingStats && <Loader2 className="h-5 w-5 animate-spin text-slate-400" />}
          </div>
          {detectionStats && detectionStats.totalDetections > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={confidenceChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#64748b" />
                <YAxis stroke="#64748b" allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(148, 163, 184, 0.15)' }}
                  contentStyle={{
                    background: 'rgba(255, 255, 255, 0.95)',
                    borderRadius: '12px',
                    border: '1px solid rgba(148, 163, 184, 0.4)'
                  }}
                />
                <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                  {confidenceChartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-60 items-center justify-center text-sm text-slate-500">
              No detection data available for today yet.
            </div>
          )}
        </GlassCard>

        <GlassCard className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Detections · Last 24 Hours</h3>
              <p className="text-sm text-slate-500">Hourly detection volume across all confidence levels</p>
            </div>
            {loadingStats && <Loader2 className="h-5 w-5 animate-spin text-slate-400" />}
          </div>
          {detectionsTimeline.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={detectionsTimeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="hour" stroke="#64748b" />
                <YAxis stroke="#64748b" allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(255, 255, 255, 0.95)',
                    borderRadius: '12px',
                    border: '1px solid rgba(148, 163, 184, 0.4)'
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 4, fill: '#3b82f6' }}
                  name="Detections"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-60 items-center justify-center text-sm text-slate-500">
              No detection activity recorded in the last 24 hours.
            </div>
          )}
        </GlassCard>

        <GlassCard className="p-6 xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Device Activity</h3>
              <p className="text-sm text-slate-500">
                Heartbeat recency and detection throughput for every registered device
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[540px]">
              <thead>
                <tr className="border-b border-slate-200/70">
                  <th className="py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Device
                  </th>
                  <th className="py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Last Heartbeat
                  </th>
                  <th className="py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Detections Today
                  </th>
                  <th className="py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {loadingStats ? (
                  <tr>
                    <td className="py-10 text-center text-sm text-slate-500" colSpan={4}>
                      <Loader2 className="mx-auto h-5 w-5 animate-spin text-slate-400" />
                    </td>
                  </tr>
                ) : detectionStats && detectionStats.deviceActivity.length > 0 ? (
                  detectionStats.deviceActivity.map((device) => (
                    <tr key={device.deviceId} className="border-b border-slate-200/60 last:border-0">
                      <td className="py-3">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-slate-900">
                            {device.deviceName ?? 'Unnamed Device'}
                          </span>
                          <span className="text-xs text-slate-500">
                            {device.deviceCode ? `Code ${device.deviceCode}` : device.deviceId.slice(0, 8)}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 text-sm text-slate-600">{formatRelativeTime(device.lastHeartbeat)}</td>
                      <td className="py-3 text-sm text-slate-600">{device.detectionCount}</td>
                      <td className="py-3 text-sm text-slate-600">
                        <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-medium capitalize text-slate-700 shadow-sm">
                          <span
                            className={`h-2.5 w-2.5 rounded-full ${
                              DEVICE_STATUS_STYLES[device.status] ?? 'bg-slate-400'
                            }`}
                          />
                          {device.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="py-10 text-center text-sm text-slate-500" colSpan={4}>
                      No devices have reported activity today.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>

        <GlassCard
          className={`p-6 xl:col-span-2 transition ${
            highlightQueue ? 'ring-2 ring-violet-400/40' : ''
          }`}
        >
          <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Pending Approvals Queue</h3>
              <p className="text-sm text-slate-500">
                Items awaiting manual review from low-confidence detections
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Showing {filteredPendingItems.length} of {pendingItems.length} pending items
              </p>
            </div>
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-500" />
                <div className="flex items-center gap-2 rounded-full bg-white/60 px-1 py-1">
                  {CONFIDENCE_FILTERS.map((filter) => {
                    const isActive = filter.id === confidenceFilter;
                    return (
                      <button
                        key={filter.id}
                        onClick={() => setConfidenceFilter(filter.id)}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                          isActive
                            ? 'bg-slate-900 text-white shadow'
                            : 'text-slate-600 hover:bg-white'
                        }`}
                      >
                        {filter.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <Input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by user or product..."
                className="bg-white/70 text-sm text-slate-700 placeholder:text-slate-400"
              />
            </div>
          </div>

          {queueError && (
            <GlassCard className="mb-4 border border-rose-200 bg-rose-50/80 p-4 text-rose-700">
              <p className="text-sm">{queueError}</p>
            </GlassCard>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px]">
              <thead>
                <tr className="border-b border-slate-200/70">
                  <th className="py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    User
                  </th>
                  <th className="py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Item
                  </th>
                  <th className="py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Confidence
                  </th>
                  <th className="py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Time Pending
                  </th>
                  <th className="py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Device
                  </th>
                  <th className="py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Quick View
                  </th>
                </tr>
              </thead>
              <tbody>
                {loadingQueue ? (
                  <tr>
                    <td className="py-10 text-center text-sm text-slate-500" colSpan={6}>
                      <Loader2 className="mx-auto h-5 w-5 animate-spin text-slate-400" />
                    </td>
                  </tr>
                ) : filteredPendingItems.length > 0 ? (
                  filteredPendingItems.map((item) => (
                    <tr key={item.id} className="border-b border-slate-200/60 last:border-0 hover:bg-slate-50/60">
                      <td className="py-3 text-sm text-slate-700">
                        <div className="flex flex-col">
                          <span className="font-medium">{item.userEmail ?? 'Unknown user'}</span>
                          <span className="text-xs text-slate-500">{item.userName ?? '—'}</span>
                        </div>
                      </td>
                      <td className="py-3 text-sm text-slate-700">
                        <div className="flex flex-col">
                          <span className="font-medium">{item.productName ?? 'Unnamed item'}</span>
                          <span className="text-xs text-slate-500">Qty {item.quantity}</span>
                        </div>
                      </td>
                      <td className="py-3 text-sm text-slate-700">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                            item.confidence >= 0.7
                              ? 'bg-emerald-100 text-emerald-700'
                              : item.confidence >= 0.5
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {formatConfidence(item.confidence)}
                        </span>
                      </td>
                      <td className="py-3 text-sm text-slate-700">{formatRelativeTime(item.timestamp)}</td>
                      <td className="py-3 text-sm text-slate-700">
                        <div className="flex flex-col">
                          <span>{item.deviceName ?? 'Unknown device'}</span>
                          <span className="text-xs text-slate-500">
                            {item.deviceCode ? `Code ${item.deviceCode}` : item.deviceId?.slice(0, 8) ?? '—'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 text-sm text-slate-700">
                        <button
                          onClick={() => setSelectedPendingId(item.id)}
                          className="rounded-lg bg-slate-900 px-3 py-1 text-xs font-medium text-white transition hover:bg-slate-800"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="py-10 text-center text-sm text-slate-500" colSpan={6}>
                      No pending approvals match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {showSelectedPending && selectedPendingItem && (
            <div className="mt-6 rounded-2xl border border-slate-200/60 bg-white/80 p-4 shadow-inner">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-900">Quick View</h4>
                <button
                  onClick={() => setSelectedPendingId(null)}
                  className="rounded-full p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  <CloseIcon className="h-4 w-4" />
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500">User</p>
                  <p className="text-sm text-slate-700">{selectedPendingItem.userEmail ?? 'Unknown user'}</p>
                  <p className="text-xs text-slate-500">{selectedPendingItem.userName ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500">Detected Item</p>
                  <p className="text-sm text-slate-700">{selectedPendingItem.productName ?? 'Unnamed item'}</p>
                  <p className="text-xs text-slate-500">Quantity {selectedPendingItem.quantity}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500">Confidence</p>
                  <p className="text-sm text-slate-700">{formatConfidence(selectedPendingItem.confidence)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500">Detected At</p>
                  <p className="text-sm text-slate-700">{formatTimestamp(selectedPendingItem.timestamp)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500">Device</p>
                  <p className="text-sm text-slate-700">{selectedPendingItem.deviceName ?? 'Unknown device'}</p>
                  <p className="text-xs text-slate-500">
                    {selectedPendingItem.deviceCode
                      ? `Code ${selectedPendingItem.deviceCode}`
                      : selectedPendingItem.deviceId?.slice(0, 12) ?? '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500">Last Device Heartbeat</p>
                  <p className="text-sm text-slate-700">
                    {formatRelativeTime(selectedPendingItem.deviceLastHeartbeat)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </GlassCard>
      </div>

      <GlassCard className="p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Approval Rate</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {formatPercentage(detectionStats?.approvalRate ?? 0)}
            </p>
            <p className="text-xs text-slate-500">Approved vs declined pending items today</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Average Confidence</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {formatConfidence(detectionStats?.avgConfidence ?? 0)}
            </p>
            <p className="text-xs text-slate-500">Across all detections in the last 24 hours</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Devices Reporting</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {detectionStats?.deviceActivity.length ?? 0}
            </p>
            <p className="text-xs text-slate-500">Devices with at least one detection today</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Queue Length</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{pendingItems.length}</p>
            <p className="text-xs text-slate-500">Low-confidence detections awaiting review</p>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
