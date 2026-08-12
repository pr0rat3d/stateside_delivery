import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMerchants } from '../api/client';
import type { Merchant } from '../types';

const CATEGORIES: { value: Merchant['category'] | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'restaurant', label: 'Restaurants' },
  { value: 'grocery', label: 'Grocery' },
  { value: 'convenience', label: 'Convenience' },
  { value: 'provisioning', label: 'Provisioning' },
];

export default function MerchantList() {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [category, setCategory] = useState<Merchant['category'] | 'all'>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMerchants()
      .then(setMerchants)
      .catch(() => setError('Could not load merchants. Is the API running?'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return merchants.filter((m) => {
      const matchesCategory = category === 'all' || m.category === category;
      const matchesSearch = m.business_name.toLowerCase().includes(search.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [merchants, category, search]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Order from St. Thomas</h1>
      <p className="text-gray-500 mb-5">Food, grocery, and provisioning delivery, 8 AM – 10 PM.</p>

      <input
        type="text"
        placeholder="Search stores..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full rounded-lg border border-gray-300 px-4 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-teal-500"
      />

      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            onClick={() => setCategory(c.value)}
            className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium border transition-colors ${
              category === c.value
                ? 'bg-teal-600 text-white border-teal-600'
                : 'bg-white text-gray-700 border-gray-300 hover:border-teal-400'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {loading && <p className="text-gray-500">Loading merchants...</p>}
      {error && <p className="text-red-600">{error}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filtered.map((m) => (
          <Link
            key={m.id}
            to={`/merchants/${m.id}`}
            className="block rounded-xl border border-gray-200 bg-white p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-semibold text-gray-900">{m.business_name}</h2>
              <span className="text-xs uppercase tracking-wide text-teal-700 bg-teal-50 rounded-full px-2 py-0.5">
                {m.category}
              </span>
            </div>
            <p className="text-sm text-gray-500">
              {m.hours_open?.slice(0, 5)} – {m.hours_close?.slice(0, 5)}
            </p>
          </Link>
        ))}
        {!loading && !error && filtered.length === 0 && (
          <p className="text-gray-500 col-span-full">No stores match your search.</p>
        )}
      </div>
    </div>
  );
}
