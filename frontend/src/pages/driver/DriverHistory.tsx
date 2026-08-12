import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDriverDeliveries } from '../../api/client';
import { useDriverSession } from '../../driver/useDriverSession';
import { formatNaiveTimestamp } from '../../utils/formatDate';
import type { Delivery } from '../../types';

export default function DriverHistory() {
  const { driverId } = useDriverSession();
  const navigate = useNavigate();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [earnings, setEarnings] = useState(0);

  useEffect(() => {
    if (!driverId) {
      navigate('/driver/login');
      return;
    }
    getDriverDeliveries(driverId).then((data) => {
      setDeliveries(data.deliveries);
      setEarnings(data.earnings);
    });
  }, [driverId, navigate]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <button onClick={() => navigate('/driver/dashboard')} className="text-sm text-teal-700 mb-3">
        ← Dashboard
      </button>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Delivery history</h1>
      <p className="text-gray-500 mb-6">${earnings.toFixed(2)} earned from {deliveries.length} completed deliveries</p>

      <div className="space-y-2">
        {deliveries.map((d) => (
          <div key={d.id} className="rounded-lg border border-gray-200 bg-white p-3 flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Order #{d.id} · {d.merchant_name}</p>
              <p className="text-sm text-gray-500">{formatNaiveTimestamp(d.delivered_at)}</p>
            </div>
            <p className="font-medium text-gray-900">${(Number(d.delivery_fee) + Number(d.tip)).toFixed(2)}</p>
          </div>
        ))}
        {deliveries.length === 0 && <p className="text-gray-500">No completed deliveries yet.</p>}
      </div>
    </div>
  );
}
