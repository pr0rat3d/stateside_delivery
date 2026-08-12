import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMerchantHistory } from '../../api/client';
import { useMerchantSession } from '../../merchant/useMerchantSession';
import { formatNaiveTimestamp } from '../../utils/formatDate';
import type { MerchantHistory as MerchantHistoryData } from '../../types';

const STATUS_STYLES: Record<string, string> = {
  delivered: 'text-green-700 bg-green-50',
  cancelled: 'text-gray-500 bg-gray-100',
  refunded: 'text-red-700 bg-red-50',
};

export default function MerchantHistory() {
  const { merchantId } = useMerchantSession();
  const navigate = useNavigate();
  const [data, setData] = useState<MerchantHistoryData | null>(null);

  useEffect(() => {
    if (!merchantId) {
      navigate('/merchant/login');
      return;
    }
    getMerchantHistory(merchantId).then(setData);
  }, [merchantId, navigate]);

  if (!data) return <p className="max-w-2xl mx-auto px-4 py-6 text-gray-500">Loading history...</p>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Order history</h1>
      <p className="text-gray-500 mb-6">
        {data.summary.delivered_count} delivered · ${data.summary.gross_subtotal.toFixed(2)} gross · $
        {data.summary.net_revenue.toFixed(2)} net after {data.summary.commission_percent}% commission
      </p>

      <div className="space-y-2">
        {data.orders.map((order) => (
          <div key={order.id} className="rounded-lg border border-gray-200 bg-white p-3 flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Order #{order.id} · {order.customer_name}</p>
              <p className="text-sm text-gray-500">
                {order.delivered_at ? formatNaiveTimestamp(order.delivered_at) : 'Not delivered'}
              </p>
            </div>
            <div className="text-right">
              <p className="font-medium text-gray-900">${Number(order.subtotal).toFixed(2)}</p>
              <span className={`text-xs rounded-full px-2 py-0.5 ${STATUS_STYLES[order.status] || 'text-gray-500 bg-gray-100'}`}>
                {order.status}
              </span>
            </div>
          </div>
        ))}
        {data.orders.length === 0 && <p className="text-gray-500">No completed orders yet.</p>}
      </div>
    </div>
  );
}
