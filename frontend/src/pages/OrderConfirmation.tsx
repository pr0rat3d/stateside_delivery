import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getOrder } from '../api/client';
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

export default function OrderConfirmation() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getOrder(id)
      .then(setOrder)
      .catch(() => setError('Could not find that order.'));
  }, [id]);

  if (error) return <p className="max-w-2xl mx-auto px-4 py-6 text-red-600">{error}</p>;
  if (!order) return <p className="max-w-2xl mx-auto px-4 py-6 text-gray-500">Loading order...</p>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 text-center">
      <div className="text-5xl mb-4">✅</div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Order #{order.id} confirmed</h1>
      <p className="text-gray-500 mb-6">{STATUS_LABELS[order.status] || order.status}</p>

      <div className="text-left bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <h2 className="font-semibold text-gray-800 mb-2">Items</h2>
        <div className="space-y-1 text-sm mb-4">
          {order.items?.map((item) => (
            <div key={item.id} className="flex justify-between">
              <span>{item.quantity} × {item.name}</span>
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

      <Link to="/" className="inline-block rounded-full bg-teal-600 text-white px-6 py-2 font-medium">
        Order something else
      </Link>
    </div>
  );
}
