import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { acceptMerchantOrder, getIncomingOrders, rejectMerchantOrder, updateOrderStatus } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { formatNaiveTimestamp } from '../../utils/formatDate';
import type { MerchantOrderSummary } from '../../types';

const POLL_MS = 10000;

const NEXT_STATUS: Record<string, { label: string; next: string } | undefined> = {
  accepted: { label: 'Start preparing', next: 'preparing' },
  preparing: { label: 'Mark ready for pickup', next: 'ready_pickup' },
};

export default function MerchantDashboard() {
  const { auth } = useAuth();
  const merchantId = auth!.merchantId!;
  const navigate = useNavigate();

  const [incoming, setIncoming] = useState<MerchantOrderSummary[]>([]);
  const [inProgress, setInProgress] = useState<MerchantOrderSummary[]>([]);
  const [prepMinutes, setPrepMinutes] = useState<Record<number, number>>({});
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const feed = await getIncomingOrders(merchantId);
      setIncoming(feed.incoming);
      setInProgress(feed.in_progress);
    } catch {
      setError('Could not reach the API.');
    }
  }, [merchantId]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, POLL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  async function handleAccept(order: MerchantOrderSummary) {
    setBusyId(order.id);
    try {
      await acceptMerchantOrder(order.id, prepMinutes[order.id] ?? 15);
      await refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(order: MerchantOrderSummary) {
    setBusyId(order.id);
    try {
      await rejectMerchantOrder(order.id);
      await refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function handleAdvance(order: MerchantOrderSummary) {
    const step = NEXT_STATUS[order.status];
    if (!step) return;
    setBusyId(order.id);
    try {
      await updateOrderStatus(order.id, step.next);
      await refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Orders</h1>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      <section className="mb-8">
        <h2 className="font-semibold text-gray-800 mb-2">New orders</h2>
        {incoming.length === 0 && <p className="text-gray-500">No new orders. This list refreshes automatically.</p>}
        <div className="space-y-3">
          {incoming.map((order) => (
            <div key={order.id} className="rounded-xl border border-gray-200 bg-white p-4">
              <button onClick={() => navigate(`/merchant/orders/${order.id}`)} className="text-left w-full mb-2">
                <p className="font-semibold text-gray-900">Order #{order.id} · {order.customer_name}</p>
                <p className="text-sm text-gray-500">
                  ${Number(order.total).toFixed(2)} · {order.order_type === 'scheduled' ? `Scheduled ${formatNaiveTimestamp(order.scheduled_delivery_time!)}` : 'ASAP'}
                </p>
              </button>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Prep time</label>
                <select
                  value={prepMinutes[order.id] ?? 15}
                  onChange={(e) => setPrepMinutes((p) => ({ ...p, [order.id]: Number(e.target.value) }))}
                  className="rounded-lg border border-gray-300 px-2 py-1 text-sm"
                >
                  {[10, 15, 20, 30, 45].map((m) => (
                    <option key={m} value={m}>{m} min</option>
                  ))}
                </select>
                <button
                  disabled={busyId === order.id}
                  onClick={() => handleAccept(order)}
                  className="ml-auto rounded-full bg-teal-600 text-white text-sm font-medium px-4 py-1.5 disabled:opacity-50"
                >
                  Accept
                </button>
                <button
                  disabled={busyId === order.id}
                  onClick={() => handleReject(order)}
                  className="rounded-full border border-gray-300 text-gray-700 text-sm font-medium px-4 py-1.5 disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-semibold text-gray-800 mb-2">In progress</h2>
        {inProgress.length === 0 && <p className="text-gray-500">Nothing in progress.</p>}
        <div className="space-y-3">
          {inProgress.map((order) => {
            const step = NEXT_STATUS[order.status];
            return (
              <div key={order.id} className="rounded-xl border border-gray-200 bg-white p-4">
                <button onClick={() => navigate(`/merchant/orders/${order.id}`)} className="text-left w-full mb-2">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900">Order #{order.id} · {order.customer_name}</p>
                    {order.has_pending_substitution && (
                      <span className="text-xs text-amber-700 bg-amber-50 rounded-full px-2 py-0.5">
                        needs substitution response
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    Status: {order.status.replace('_', ' ')}
                    {order.estimated_ready_time && ` · ready ${formatNaiveTimestamp(order.estimated_ready_time)}`}
                  </p>
                  <p className="text-sm text-gray-500">
                    Driver: {order.driver_name || 'unassigned'}
                  </p>
                </button>
                {step && (
                  <button
                    disabled={busyId === order.id}
                    onClick={() => handleAdvance(order)}
                    className="rounded-full bg-gray-900 text-white text-sm font-medium px-4 py-1.5 disabled:opacity-50"
                  >
                    {step.label}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
