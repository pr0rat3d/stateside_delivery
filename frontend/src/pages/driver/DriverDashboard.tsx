import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  acceptOrder,
  declineOrder,
  getActiveOrder,
  getAvailableOrders,
  getDriver,
  getDriverDeliveries,
  setDriverAvailability,
  setDriverCoolerKit,
} from '../../api/client';
import { useDriverSession } from '../../driver/useDriverSession';
import type { Driver, DriverOrder } from '../../types';

const POLL_MS = 10000;

export default function DriverDashboard() {
  const { driverId, logout } = useDriverSession();
  const navigate = useNavigate();

  const [driver, setDriver] = useState<Driver | null>(null);
  const [activeOrder, setActiveOrder] = useState<DriverOrder | null>(null);
  const [offers, setOffers] = useState<DriverOrder[]>([]);
  const [earnings, setEarnings] = useState(0);
  const [busyOrderId, setBusyOrderId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!driverId) navigate('/driver/login');
  }, [driverId, navigate]);

  const refresh = useCallback(async () => {
    if (!driverId) return;
    try {
      const [driverData, active, deliveries] = await Promise.all([
        getDriver(driverId),
        getActiveOrder(driverId),
        getDriverDeliveries(driverId),
      ]);
      setDriver(driverData);
      setActiveOrder(active);
      setEarnings(deliveries.earnings);

      if (!active && driverData.availability_status === 'online') {
        setOffers(await getAvailableOrders(driverId));
      } else {
        setOffers([]);
      }
    } catch {
      setError('Could not reach the API.');
    }
  }, [driverId]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, POLL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  if (!driverId || !driver) return <p className="max-w-2xl mx-auto px-4 py-6 text-gray-500">Loading...</p>;

  async function toggleAvailability() {
    if (!driver) return;
    const next = driver.availability_status === 'online' ? 'offline' : 'online';
    const updated = await setDriverAvailability(driver.id, next);
    setDriver(updated);
  }

  async function toggleCoolerKit() {
    if (!driver) return;
    const updated = await setDriverCoolerKit(driver.id, !driver.cooler_kit_status);
    setDriver(updated);
  }

  async function handleAccept(order: DriverOrder) {
    setBusyOrderId(order.id);
    try {
      await acceptOrder(driverId!, order.id);
      await refresh();
      navigate(`/driver/orders/${order.id}`);
    } catch {
      setError('That order was just taken by another driver.');
      await refresh();
    } finally {
      setBusyOrderId(null);
    }
  }

  async function handleDecline(order: DriverOrder) {
    setBusyOrderId(order.id);
    try {
      await declineOrder(driverId!, order.id);
      setOffers((prev) => prev.filter((o) => o.id !== order.id));
    } finally {
      setBusyOrderId(null);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{driver.full_name}</h1>
          <p className="text-sm text-gray-500">{driver.total_deliveries} lifetime deliveries · ${earnings.toFixed(2)} this period</p>
        </div>
        <button onClick={logout} className="text-sm text-gray-500 underline">
          Switch driver
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <button
          onClick={toggleAvailability}
          className={`rounded-xl border p-4 text-left ${
            driver.availability_status === 'online' ? 'bg-teal-600 text-white border-teal-600' : 'bg-white border-gray-300'
          }`}
        >
          <p className="text-xs uppercase tracking-wide opacity-80">Shift status</p>
          <p className="font-semibold">{driver.availability_status === 'online' ? 'Online — tap to go offline' : 'Offline — tap to go online'}</p>
        </button>
        <button
          onClick={toggleCoolerKit}
          className={`rounded-xl border p-4 text-left ${
            driver.cooler_kit_status ? 'bg-blue-50 border-blue-300 text-blue-800' : 'bg-white border-gray-300'
          }`}
        >
          <p className="text-xs uppercase tracking-wide opacity-80">Cooler kit</p>
          <p className="font-semibold">{driver.cooler_kit_status ? '❄ Confirmed' : 'Not confirmed'}</p>
        </button>
      </div>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      {activeOrder && (
        <button
          onClick={() => navigate(`/driver/orders/${activeOrder.id}`)}
          className="w-full text-left rounded-xl border-2 border-teal-500 bg-teal-50 p-4 mb-6"
        >
          <p className="text-xs uppercase tracking-wide text-teal-700 font-semibold">Active delivery</p>
          <p className="font-semibold text-gray-900">
            Order #{activeOrder.id} · {activeOrder.merchant_name}
          </p>
          <p className="text-sm text-gray-600">Status: {activeOrder.status.replace('_', ' ')} → tap to continue</p>
        </button>
      )}

      {!activeOrder && driver.availability_status !== 'online' && (
        <p className="text-gray-500">Go online to start receiving delivery offers.</p>
      )}

      {!activeOrder && driver.availability_status === 'online' && (
        <>
          <h2 className="font-semibold text-gray-800 mb-2">Available offers</h2>
          {offers.length === 0 && <p className="text-gray-500">No offers right now. This list refreshes automatically.</p>}
          <div className="space-y-3">
            {offers.map((order) => (
              <div key={order.id} className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-semibold text-gray-900">{order.merchant_name}</p>
                  {order.has_cold_items && <span className="text-xs text-blue-700 bg-blue-50 rounded-full px-2 py-0.5">❄ cold</span>}
                </div>
                <p className="text-sm text-gray-500 mb-1">
                  {order.order_type === 'scheduled' ? 'Scheduled delivery' : 'ASAP delivery'} · ${Number(order.delivery_fee).toFixed(2)} + tip
                </p>
                <p className="text-sm text-gray-500 mb-3">{order.villa_building_name || order.landmark || 'Pin location provided'}</p>
                <div className="flex gap-2">
                  <button
                    disabled={busyOrderId === order.id}
                    onClick={() => handleAccept(order)}
                    className="flex-1 rounded-full bg-teal-600 text-white text-sm font-medium py-2 disabled:opacity-50"
                  >
                    Accept
                  </button>
                  <button
                    disabled={busyOrderId === order.id}
                    onClick={() => handleDecline(order)}
                    className="flex-1 rounded-full border border-gray-300 text-gray-700 text-sm font-medium py-2 disabled:opacity-50"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <button
        onClick={() => navigate('/driver/history')}
        className="mt-8 w-full text-center rounded-full border border-gray-300 py-2 text-sm font-medium text-gray-700"
      >
        View delivery history
      </button>
    </div>
  );
}
