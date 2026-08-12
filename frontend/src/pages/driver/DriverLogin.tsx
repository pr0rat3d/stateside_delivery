import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDrivers } from '../../api/client';
import { useDriverSession } from '../../driver/useDriverSession';
import type { Driver } from '../../types';

export default function DriverLogin() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { setDriverId } = useDriverSession();
  const navigate = useNavigate();

  useEffect(() => {
    getDrivers()
      .then(setDrivers)
      .catch(() => setError('Could not load drivers. Is the API running?'));
  }, []);

  function handleSelect(driver: Driver) {
    setDriverId(driver.id);
    navigate('/driver/dashboard');
  }

  return (
    <div className="max-w-md mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Driver Login</h1>
      <p className="text-gray-500 mb-6">Select your profile to start your shift.</p>

      {error && <p className="text-red-600">{error}</p>}

      <div className="space-y-2">
        {drivers.map((d) => (
          <button
            key={d.id}
            onClick={() => handleSelect(d)}
            className="w-full text-left rounded-xl border border-gray-200 bg-white p-4 hover:border-teal-400 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-900">{d.full_name}</span>
              <span className={`text-xs rounded-full px-2 py-0.5 ${d.availability_status === 'online' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {d.availability_status}
              </span>
            </div>
            <p className="text-sm text-gray-500">
              {d.total_deliveries} deliveries {d.cooler_kit_status ? '· ❄ cooler kit confirmed' : ''}
            </p>
          </button>
        ))}
        {drivers.length === 0 && !error && <p className="text-gray-500">Loading drivers...</p>}
      </div>
    </div>
  );
}
