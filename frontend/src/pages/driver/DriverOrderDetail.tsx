import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getActiveOrder, submitDeliveryProof, updateOrderStatus } from '../../api/client';
import { useDriverSession } from '../../driver/useDriverSession';
import type { DriverOrder } from '../../types';

const COLD_CHAIN_LIMIT_MIN = 20;
const PICKUP_TS_PREFIX = 'stateside_pickup_ts_';

function getCurrentPosition(): Promise<GeolocationPosition | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos),
      () => resolve(null),
      { timeout: 4000 }
    );
  });
}

export default function DriverOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const { driverId } = useDriverSession();
  const navigate = useNavigate();

  const [order, setOrder] = useState<DriverOrder | null>(null);
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsedMin, setElapsedMin] = useState(0);

  useEffect(() => {
    if (!driverId) {
      navigate('/driver/login');
      return;
    }
    getActiveOrder(driverId).then((active) => {
      if (!active || String(active.id) !== id) {
        navigate('/driver/dashboard');
        return;
      }
      setOrder(active);
    });
  }, [driverId, id, navigate]);

  useEffect(() => {
    if (!order || order.status !== 'in_transit') return;
    const tick = () => {
      const ts = localStorage.getItem(PICKUP_TS_PREFIX + order.id);
      if (!ts) return;
      setElapsedMin(Math.floor((Date.now() - Number(ts)) / 60000));
    };
    tick();
    const interval = setInterval(tick, 15000);
    return () => clearInterval(interval);
  }, [order]);

  const deliveryMapsUrl = useMemo(() => {
    if (!order) return '#';
    return `https://www.google.com/maps/dir/?api=1&destination=${order.pin_latitude},${order.pin_longitude}`;
  }, [order]);

  const pickupMapsUrl = useMemo(() => {
    if (!order) return '#';
    const query = order.merchant_address || `${order.merchant_name}, St. Thomas, USVI`;
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`;
  }, [order]);

  if (!order) return <p className="max-w-2xl mx-auto px-4 py-6 text-gray-500">Loading order...</p>;

  const awaitingPickup = order.status !== 'in_transit' && order.status !== 'delivered';
  const inTransit = order.status === 'in_transit';
  const coldChainWarning = order.has_cold_items && inTransit && elapsedMin >= COLD_CHAIN_LIMIT_MIN;

  function toggleItem(itemId: number) {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }

  async function handleMarkPickedUp() {
    if (!order) return;
    setSubmitting(true);
    try {
      const updated = await updateOrderStatus(order.id, 'in_transit');
      localStorage.setItem(PICKUP_TS_PREFIX + order.id, String(Date.now()));
      setOrder({ ...order, ...updated });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCompleteDelivery() {
    if (!order || !driverId) return;
    setError(null);
    setSubmitting(true);
    try {
      const position = await getCurrentPosition();
      await submitDeliveryProof(order.id, {
        proof_type: 'gps',
        latitude: position?.coords.latitude ?? Number(order.pin_latitude),
        longitude: position?.coords.longitude ?? Number(order.pin_longitude),
        driver_id: driverId,
      });
      localStorage.removeItem(PICKUP_TS_PREFIX + order.id);
      navigate('/driver/dashboard');
    } catch {
      setError('Could not record delivery. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <button onClick={() => navigate('/driver/dashboard')} className="text-sm text-teal-700 mb-3">
        ← Dashboard
      </button>

      <h1 className="text-2xl font-bold text-gray-900 mb-1">Order #{order.id}</h1>
      <p className="text-gray-500 mb-4">
        {order.merchant_name} → {order.customer_name}
        {order.has_cold_items && <span className="ml-2 text-blue-700">❄ cold chain</span>}
      </p>

      {coldChainWarning && (
        <p className="bg-red-50 text-red-700 rounded-lg p-3 mb-4 text-sm font-medium">
          ⚠ This cold order has been in the vehicle for {elapsedMin} minutes — exceeds the {COLD_CHAIN_LIMIT_MIN} minute limit. Deliver as soon as possible.
        </p>
      )}

      <section className="mb-6">
        <h2 className="font-semibold text-gray-800 mb-2">Pickup checklist</h2>
        <div className="space-y-2">
          {order.items?.map((item) => (
            <label key={item.id} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3">
              <input
                type="checkbox"
                checked={checkedItems.has(item.id)}
                onChange={() => toggleItem(item.id)}
                className="w-4 h-4"
              />
              <span className={checkedItems.has(item.id) ? 'line-through text-gray-400' : 'text-gray-900'}>
                {item.quantity} × {item.name}
              </span>
            </label>
          ))}
        </div>
        <a
          href={pickupMapsUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-block text-sm text-teal-700 underline"
        >
          Navigate to pickup →
        </a>
      </section>

      <section className="mb-6 bg-white rounded-xl border border-gray-200 p-4 space-y-1 text-sm">
        <h2 className="font-semibold text-gray-800 mb-2">Delivery details</h2>
        {order.villa_building_name && <p><strong>Villa/building:</strong> {order.villa_building_name} {order.villa_unit}</p>}
        {order.gate_code && <p><strong>Gate code:</strong> {order.gate_code}</p>}
        {order.landmark && <p><strong>Landmark:</strong> {order.landmark}</p>}
        {order.delivery_notes && <p><strong>Notes:</strong> {order.delivery_notes}</p>}
        <p><strong>Substitutions:</strong> {order.substitution_policy.replace(/_/g, ' ')}</p>
        <p><strong>Contact:</strong> {order.contact_phone}</p>
      </section>

      <div className="flex gap-2 mb-6">
        <a
          href={deliveryMapsUrl}
          target="_blank"
          rel="noreferrer"
          className="flex-1 text-center rounded-full bg-gray-900 text-white py-2.5 text-sm font-medium"
        >
          Navigate to delivery pin
        </a>
        {order.contact_phone && (
          <a
            href={`sms:${order.contact_phone}?body=${encodeURIComponent("Hi, it's your Stateside Deliveries driver — I'm here!")}`}
            className="flex-1 text-center rounded-full border border-gray-300 text-gray-700 py-2.5 text-sm font-medium"
          >
            I'm here (text customer)
          </a>
        )}
      </div>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      {awaitingPickup && (
        <button
          onClick={handleMarkPickedUp}
          disabled={submitting}
          className="w-full rounded-full bg-teal-600 text-white py-3 font-medium disabled:opacity-50"
        >
          {submitting ? 'Updating...' : 'Mark picked up — heading to customer'}
        </button>
      )}

      {inTransit && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <label className="flex items-center gap-3 mb-3">
            <input
              type="checkbox"
              checked={confirmChecked}
              onChange={(e) => setConfirmChecked(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm text-gray-700">Order handed off / left at delivery location</span>
          </label>
          <button
            onClick={handleCompleteDelivery}
            disabled={!confirmChecked || submitting}
            className="w-full rounded-full bg-gray-900 text-white py-3 font-medium disabled:opacity-50"
          >
            {submitting ? 'Completing...' : 'Complete delivery'}
          </button>
        </div>
      )}
    </div>
  );
}
