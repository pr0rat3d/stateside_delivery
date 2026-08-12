import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  acceptMerchantOrder,
  getOrder,
  proposeSubstitution,
  rejectMerchantOrder,
  updateOrderStatus,
} from '../../api/client';
import { formatNaiveTimestamp } from '../../utils/formatDate';
import type { Order } from '../../types';

const NEXT_STATUS: Record<string, { label: string; next: string } | undefined> = {
  accepted: { label: 'Start preparing', next: 'preparing' },
  preparing: { label: 'Mark ready for pickup', next: 'ready_pickup' },
};

const SUBSTITUTION_LABELS: Record<string, string> = {
  awaiting_approval: 'Waiting on customer response',
  approved: 'Customer approved substitute',
  refunded: 'Customer declined — refunded',
};

export default function MerchantOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [prepMinutes, setPrepMinutes] = useState(15);
  const [subNoteDrafts, setSubNoteDrafts] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mapUrl = order
    ? `https://www.openstreetmap.org/?mlat=${order.pin_latitude}&mlon=${order.pin_longitude}#map=17/${order.pin_latitude}/${order.pin_longitude}`
    : '#';

  async function refresh() {
    if (!id) return;
    try {
      setOrder(await getOrder(id));
    } catch {
      setError('Could not load this order.');
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (error) return <p className="max-w-2xl mx-auto px-4 py-6 text-red-600">{error}</p>;
  if (!order) return <p className="max-w-2xl mx-auto px-4 py-6 text-gray-500">Loading order...</p>;

  const step = NEXT_STATUS[order.status];

  async function handleAccept() {
    setBusy(true);
    try {
      await acceptMerchantOrder(order!.id, prepMinutes);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleReject() {
    setBusy(true);
    try {
      await rejectMerchantOrder(order!.id);
      navigate('/merchant/dashboard');
    } finally {
      setBusy(false);
    }
  }

  async function handleAdvance() {
    if (!step) return;
    setBusy(true);
    try {
      await updateOrderStatus(order!.id, step.next);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleProposeSubstitution(itemId: number) {
    const note = subNoteDrafts[itemId];
    if (!note?.trim()) return;
    setBusy(true);
    try {
      await proposeSubstitution(order!.id, itemId, note.trim());
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <button onClick={() => navigate('/merchant/dashboard')} className="text-sm text-indigo-700 mb-3">
        ← Orders
      </button>

      <h1 className="text-2xl font-bold text-gray-900 mb-1">Order #{order.id}</h1>
      <p className="text-gray-500 mb-4">
        {order.customer_name} · {order.order_type === 'scheduled' && order.scheduled_delivery_time
          ? `Scheduled ${formatNaiveTimestamp(order.scheduled_delivery_time)}`
          : 'ASAP delivery'}
      </p>

      <section className="mb-6 bg-white rounded-xl border border-gray-200 p-4 space-y-1 text-sm">
        <h2 className="font-semibold text-gray-800 mb-2">Delivery details</h2>
        {order.villa_building_name && <p><strong>Villa/building:</strong> {order.villa_building_name} {order.villa_unit}</p>}
        {order.gate_code && <p><strong>Gate code:</strong> {order.gate_code}</p>}
        {order.landmark && <p><strong>Landmark:</strong> {order.landmark}</p>}
        {order.delivery_notes && <p><strong>Notes:</strong> {order.delivery_notes}</p>}
        <p><strong>Contact:</strong> {order.contact_phone}</p>
        <a href={mapUrl} target="_blank" rel="noreferrer" className="text-indigo-700 underline inline-block mt-1">
          View delivery pin on map →
        </a>
      </section>

      <section className="mb-6">
        <h2 className="font-semibold text-gray-800 mb-2">Items</h2>
        <div className="space-y-2">
          {order.items?.map((item) => (
            <div key={item.id} className="rounded-lg border border-gray-200 bg-white p-3">
              <div className="flex items-center justify-between">
                <p className="font-medium text-gray-900">{item.quantity} × {item.name}</p>
                <p className="text-sm text-gray-700">${(Number(item.price_per_unit) * item.quantity).toFixed(2)}</p>
              </div>
              {item.substitution_status === 'none' && (order.status === 'accepted' || order.status === 'preparing') && (
                <div className="mt-2 flex gap-2">
                  <input
                    placeholder="Out of stock — propose a substitute or note"
                    value={subNoteDrafts[item.id] || ''}
                    onChange={(e) => setSubNoteDrafts((p) => ({ ...p, [item.id]: e.target.value }))}
                    className="flex-1 rounded-lg border border-gray-300 px-2 py-1 text-sm"
                  />
                  <button
                    disabled={busy}
                    onClick={() => handleProposeSubstitution(item.id)}
                    className="rounded-full border border-amber-400 text-amber-700 text-sm px-3 py-1 disabled:opacity-50"
                  >
                    Mark unavailable
                  </button>
                </div>
              )}
              {item.substitution_status !== 'none' && (
                <div className="mt-2 text-sm">
                  <span className="text-amber-700 bg-amber-50 rounded-full px-2 py-0.5">
                    {SUBSTITUTION_LABELS[item.substitution_status]}
                  </span>
                  {item.substitution_notes && <p className="text-gray-500 mt-1">"{item.substitution_notes}"</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="mb-6 bg-white rounded-xl border border-gray-200 p-4 text-sm">
        <h2 className="font-semibold text-gray-800 mb-2">Fulfillment</h2>
        <p><strong>Status:</strong> {order.status.replace('_', ' ')}</p>
        {order.estimated_ready_time && <p><strong>Ready by:</strong> {formatNaiveTimestamp(order.estimated_ready_time)}</p>}
        <p><strong>Driver:</strong> {order.driver_name || 'Not yet assigned'}</p>
        <p><strong>Total:</strong> ${Number(order.total).toFixed(2)}</p>
      </section>

      {order.status === 'pending' && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <label className="text-sm text-gray-600">Prep time</label>
            <select
              value={prepMinutes}
              onChange={(e) => setPrepMinutes(Number(e.target.value))}
              className="rounded-lg border border-gray-300 px-2 py-1 text-sm"
            >
              {[10, 15, 20, 30, 45].map((m) => (
                <option key={m} value={m}>{m} min</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button
              disabled={busy}
              onClick={handleAccept}
              className="flex-1 rounded-full bg-teal-600 text-white font-medium py-2.5 disabled:opacity-50"
            >
              Accept order
            </button>
            <button
              disabled={busy}
              onClick={handleReject}
              className="flex-1 rounded-full border border-gray-300 text-gray-700 font-medium py-2.5 disabled:opacity-50"
            >
              Reject
            </button>
          </div>
        </div>
      )}

      {step && (
        <button
          disabled={busy}
          onClick={handleAdvance}
          className="w-full rounded-full bg-gray-900 text-white py-3 font-medium disabled:opacity-50"
        >
          {step.label}
        </button>
      )}
    </div>
  );
}
