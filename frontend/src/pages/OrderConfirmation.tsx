import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { createSupportTicket, getOrder, respondToSubstitution } from '../api/client';
import { formatNaiveTimestamp } from '../utils/formatDate';
import type { Order } from '../types';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Order received',
  accepted: 'Accepted by merchant',
  preparing: 'Being prepared',
  ready_pickup: 'Ready for pickup',
  in_transit: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

const POLL_MS = 15000;

export default function OrderConfirmation() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyItemId, setBusyItemId] = useState<number | null>(null);
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [issueText, setIssueText] = useState('');
  const [issueSubmitted, setIssueSubmitted] = useState(false);

  const refresh = useCallback(() => {
    if (!id) return;
    getOrder(id)
      .then(setOrder)
      .catch(() => setError('Could not find that order.'));
  }, [id]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, POLL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  if (error) return <p className="max-w-2xl mx-auto px-4 py-6 text-red-600">{error}</p>;
  if (!order) return <p className="max-w-2xl mx-auto px-4 py-6 text-gray-500">Loading order...</p>;

  const pendingSubstitutions = order.items?.filter((i) => i.substitution_status === 'awaiting_approval') || [];

  async function handleSubstitutionResponse(itemId: number, approved: boolean) {
    if (!order) return;
    setBusyItemId(itemId);
    try {
      const updated = await respondToSubstitution(order.id, itemId, approved);
      setOrder(updated);
    } finally {
      setBusyItemId(null);
    }
  }

  async function handleReportIssue() {
    if (!order || !issueText.trim()) return;
    await createSupportTicket({
      order_id: order.id,
      customer_id: order.customer_id,
      issue_type: 'other',
      description: issueText.trim(),
    });
    setIssueSubmitted(true);
    setShowIssueForm(false);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 text-center">
      <div className="text-5xl mb-4">✅</div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Order #{order.id} confirmed</h1>
      <p className="text-gray-500 mb-6">{STATUS_LABELS[order.status] || order.status}</p>

      {pendingSubstitutions.length > 0 && (
        <div className="text-left bg-amber-50 border border-amber-300 rounded-xl p-4 mb-6 space-y-4">
          <h2 className="font-semibold text-amber-900">The merchant needs your approval</h2>
          {pendingSubstitutions.map((item) => (
            <div key={item.id} className="bg-white rounded-lg p-3">
              <p className="font-medium text-gray-900">{item.name} is unavailable</p>
              {item.substitution_notes && <p className="text-sm text-gray-600 mt-1">"{item.substitution_notes}"</p>}
              <div className="flex gap-2 mt-3">
                <button
                  disabled={busyItemId === item.id}
                  onClick={() => handleSubstitutionResponse(item.id, true)}
                  className="flex-1 rounded-full bg-teal-600 text-white text-sm font-medium py-2 disabled:opacity-50"
                >
                  Accept substitute
                </button>
                <button
                  disabled={busyItemId === item.id}
                  onClick={() => handleSubstitutionResponse(item.id, false)}
                  className="flex-1 rounded-full border border-gray-300 text-gray-700 text-sm font-medium py-2 disabled:opacity-50"
                >
                  No thanks, refund it
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="text-left bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <h2 className="font-semibold text-gray-800 mb-2">Items</h2>
        <div className="space-y-1 text-sm mb-4">
          {order.items?.map((item) => (
            <div key={item.id} className="flex justify-between">
              <span>
                {item.quantity} × {item.name}
                {item.substitution_status === 'approved' && <span className="text-teal-700 text-xs ml-2">substitute approved</span>}
                {item.substitution_status === 'refunded' && <span className="text-red-600 text-xs ml-2">refunded</span>}
              </span>
              <span>${(Number(item.price_per_unit) * item.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>
        <div className="space-y-1 text-sm border-t border-gray-200 pt-2">
          <div className="flex justify-between"><span>Subtotal</span><span>${Number(order.subtotal).toFixed(2)}</span></div>
          <div className="flex justify-between"><span>Delivery fee</span><span>${Number(order.delivery_fee).toFixed(2)}</span></div>
          <div className="flex justify-between"><span>Service fee</span><span>${Number(order.service_fee).toFixed(2)}</span></div>
          <div className="flex justify-between"><span>Tax</span><span>${Number(order.tax).toFixed(2)}</span></div>
          <div className="flex justify-between"><span>Tip</span><span>${Number(order.tip).toFixed(2)}</span></div>
          <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-200"><span>Total</span><span>${Number(order.total).toFixed(2)}</span></div>
        </div>
      </div>

      {order.order_type === 'scheduled' && order.scheduled_delivery_time && (
        <p className="text-gray-700 mb-4">
          Scheduled for {formatNaiveTimestamp(order.scheduled_delivery_time)}
        </p>
      )}

      <Link to="/" className="inline-block rounded-full bg-teal-600 text-white px-6 py-2 font-medium mb-6">
        Order something else
      </Link>

      <div className="text-left">
        {issueSubmitted && (
          <p className="text-sm text-teal-700 bg-teal-50 rounded-lg p-3">
            Thanks — we've logged your issue and support will follow up.
          </p>
        )}
        {!issueSubmitted && !showIssueForm && (
          <button onClick={() => setShowIssueForm(true)} className="text-sm text-gray-500 underline">
            Report an issue with this order
          </button>
        )}
        {!issueSubmitted && showIssueForm && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <textarea
              placeholder="What went wrong?"
              value={issueText}
              onChange={(e) => setIssueText(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm mb-2"
            />
            <button
              onClick={handleReportIssue}
              disabled={!issueText.trim()}
              className="rounded-full bg-gray-900 text-white text-sm font-medium px-4 py-2 disabled:opacity-50"
            >
              Submit
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
