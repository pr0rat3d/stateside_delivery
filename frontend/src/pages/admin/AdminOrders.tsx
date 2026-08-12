import { useCallback, useEffect, useState } from 'react';
import { assignDriver, getAdminDrivers, getAdminLiveOrders, issueRefund } from '../../api/client';
import LiveOrdersMap from '../../components/LiveOrdersMap';
import { formatNaiveTimestamp } from '../../utils/formatDate';
import type { AdminDriver, AdminOrder } from '../../types';

const POLL_MS = 10000;

export default function AdminOrders() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [drivers, setDrivers] = useState<AdminDriver[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<Record<number, number>>({});
  const [refundDraft, setRefundDraft] = useState<Record<number, string>>({});
  const [refundingId, setRefundingId] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [liveOrders, allDrivers] = await Promise.all([getAdminLiveOrders(), getAdminDrivers()]);
      setOrders(liveOrders);
      setDrivers(allDrivers);
    } catch {
      setError('Could not reach the API.');
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, POLL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  const onlineDrivers = drivers.filter((d) => d.is_active && d.availability_status === 'online');

  async function handleAssign(order: AdminOrder) {
    const driverId = selectedDriver[order.id];
    if (!driverId) return;
    setBusyId(order.id);
    try {
      await assignDriver(order.id, driverId);
      await refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function handleRefund(order: AdminOrder) {
    const reason = refundDraft[order.id]?.trim();
    if (!reason) return;
    setBusyId(order.id);
    try {
      await issueRefund(order.id, reason);
      setRefundingId(null);
      await refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Live orders</h1>
      {error && <p className="text-red-600 mb-4">{error}</p>}

      <div className="mb-6">
        <LiveOrdersMap orders={orders} />
      </div>

      <div className="space-y-2">
        {orders.map((order) => (
          <div key={order.id} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-gray-900">
                  Order #{order.id} · {order.merchant_name} → {order.customer_name}
                  {order.has_cold_items && <span className="ml-2 text-blue-700 text-sm">❄</span>}
                </p>
                <p className="text-sm text-gray-500">
                  ${Number(order.total).toFixed(2)} · Status: {order.status.replace('_', ' ')} · Driver: {order.driver_name || 'unassigned'}
                </p>
                <p className="text-sm text-gray-500">
                  {order.order_type === 'scheduled' && order.scheduled_delivery_time
                    ? `Scheduled ${formatNaiveTimestamp(order.scheduled_delivery_time)}`
                    : order.estimated_ready_time
                      ? `ETA ${formatNaiveTimestamp(order.estimated_ready_time)}`
                      : 'ASAP'}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                {!order.driver_id && (
                  <div className="flex gap-2">
                    <select
                      value={selectedDriver[order.id] ?? ''}
                      onChange={(e) => setSelectedDriver((p) => ({ ...p, [order.id]: Number(e.target.value) }))}
                      className="rounded-lg border border-gray-300 px-2 py-1 text-sm"
                    >
                      <option value="">Assign driver...</option>
                      {onlineDrivers.map((d) => (
                        <option key={d.id} value={d.id}>{d.full_name}</option>
                      ))}
                    </select>
                    <button
                      disabled={busyId === order.id || !selectedDriver[order.id]}
                      onClick={() => handleAssign(order)}
                      className="rounded-full bg-gray-900 text-white text-sm font-medium px-3 py-1 disabled:opacity-50"
                    >
                      Assign
                    </button>
                  </div>
                )}
                <button
                  onClick={() => setRefundingId(refundingId === order.id ? null : order.id)}
                  className="text-sm text-red-600 underline"
                >
                  Issue refund
                </button>
              </div>
            </div>
            {refundingId === order.id && (
              <div className="mt-3 flex gap-2 border-t border-gray-100 pt-3">
                <input
                  placeholder="Refund reason"
                  value={refundDraft[order.id] || ''}
                  onChange={(e) => setRefundDraft((p) => ({ ...p, [order.id]: e.target.value }))}
                  className="flex-1 rounded-lg border border-gray-300 px-2 py-1 text-sm"
                />
                <button
                  disabled={busyId === order.id || !refundDraft[order.id]?.trim()}
                  onClick={() => handleRefund(order)}
                  className="rounded-full bg-red-600 text-white text-sm font-medium px-3 py-1 disabled:opacity-50"
                >
                  Confirm refund
                </button>
              </div>
            )}
          </div>
        ))}
        {orders.length === 0 && <p className="text-gray-500">No live orders right now.</p>}
      </div>
    </div>
  );
}
