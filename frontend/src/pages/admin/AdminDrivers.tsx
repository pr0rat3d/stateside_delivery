import { useEffect, useState } from 'react';
import { getAdminDrivers, setDriverActive } from '../../api/client';
import type { AdminDriver } from '../../types';

export default function AdminDrivers() {
  const [drivers, setDrivers] = useState<AdminDriver[]>([]);

  useEffect(() => {
    getAdminDrivers().then(setDrivers);
  }, []);

  async function toggleActive(driver: AdminDriver) {
    const updated = await setDriverActive(driver.id, !driver.is_active);
    setDrivers((prev) => prev.map((d) => (d.id === driver.id ? { ...d, ...updated } : d)));
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Drivers</h1>
      <div className="space-y-2">
        {drivers.map((d) => (
          <div key={d.id} className={`rounded-xl border p-4 flex items-center justify-between ${d.is_active ? 'border-gray-200 bg-white' : 'border-gray-200 bg-gray-50 opacity-70'}`}>
            <div>
              <p className="font-semibold text-gray-900">
                {d.full_name}
                {d.cooler_kit_status && <span className="ml-2 text-blue-700 text-sm">❄ cooler kit</span>}
              </p>
              <p className="text-sm text-gray-500">
                {d.phone} · {d.availability_status} · {d.total_deliveries} deliveries · ${Number(d.lifetime_earnings).toFixed(2)} lifetime earnings
              </p>
              <p className="text-sm text-gray-500">
                {d.license_verified ? '✓ license verified' : '✗ license not verified'} · {d.insurance_verified ? '✓ insurance verified' : '✗ insurance not verified'}
              </p>
            </div>
            <button
              onClick={() => toggleActive(d)}
              className={`rounded-full text-sm font-medium px-3 py-1.5 ${
                d.is_active ? 'border border-gray-300 text-gray-700' : 'bg-teal-600 text-white'
              }`}
            >
              {d.is_active ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        ))}
        {drivers.length === 0 && <p className="text-gray-500">No drivers yet.</p>}
      </div>
    </div>
  );
}
