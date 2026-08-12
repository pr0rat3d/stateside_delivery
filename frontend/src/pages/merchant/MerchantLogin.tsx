import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMerchants } from '../../api/client';
import { useMerchantSession } from '../../merchant/useMerchantSession';
import type { Merchant } from '../../types';

export default function MerchantLogin() {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { setMerchantId } = useMerchantSession();
  const navigate = useNavigate();

  useEffect(() => {
    getMerchants()
      .then(setMerchants)
      .catch(() => setError('Could not load merchants. Is the API running?'));
  }, []);

  function handleSelect(merchant: Merchant) {
    setMerchantId(merchant.id);
    navigate('/merchant/dashboard');
  }

  return (
    <div className="max-w-md mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Merchant Login</h1>
      <p className="text-gray-500 mb-6">Select your business to manage orders.</p>

      {error && <p className="text-red-600">{error}</p>}

      <div className="space-y-2">
        {merchants.map((m) => (
          <button
            key={m.id}
            onClick={() => handleSelect(m)}
            className="w-full text-left rounded-xl border border-gray-200 bg-white p-4 hover:border-indigo-400 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-900">{m.business_name}</span>
              <span className="text-xs uppercase tracking-wide text-indigo-700 bg-indigo-50 rounded-full px-2 py-0.5">
                {m.category}
              </span>
            </div>
            <p className="text-sm text-gray-500">
              {m.hours_open?.slice(0, 5)} – {m.hours_close?.slice(0, 5)}
            </p>
          </button>
        ))}
        {merchants.length === 0 && !error && <p className="text-gray-500">Loading merchants...</p>}
      </div>
    </div>
  );
}
