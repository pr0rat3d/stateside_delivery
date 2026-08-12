import { useEffect, useState } from 'react';
import { getAdminMerchants, setMerchantActive } from '../../api/client';
import type { AdminMerchant } from '../../types';

export default function AdminMerchants() {
  const [merchants, setMerchants] = useState<AdminMerchant[]>([]);

  useEffect(() => {
    getAdminMerchants().then(setMerchants);
  }, []);

  async function toggleActive(merchant: AdminMerchant) {
    const updated = await setMerchantActive(merchant.id, !merchant.is_active);
    setMerchants((prev) => prev.map((m) => (m.id === merchant.id ? { ...m, ...updated } : m)));
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Merchants</h1>
      <div className="space-y-2">
        {merchants.map((m) => (
          <div key={m.id} className={`rounded-xl border p-4 flex items-center justify-between ${m.is_active ? 'border-gray-200 bg-white' : 'border-gray-200 bg-gray-50 opacity-70'}`}>
            <div>
              <p className="font-semibold text-gray-900">{m.business_name}</p>
              <p className="text-sm text-gray-500">
                {m.category} · {m.hours_open?.slice(0, 5)}–{m.hours_close?.slice(0, 5)} · {m.commission_percent}% commission · {m.delivered_orders} delivered
              </p>
            </div>
            <button
              onClick={() => toggleActive(m)}
              className={`rounded-full text-sm font-medium px-3 py-1.5 ${
                m.is_active ? 'border border-gray-300 text-gray-700' : 'bg-teal-600 text-white'
              }`}
            >
              {m.is_active ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        ))}
        {merchants.length === 0 && <p className="text-gray-500">No merchants yet.</p>}
      </div>
    </div>
  );
}
