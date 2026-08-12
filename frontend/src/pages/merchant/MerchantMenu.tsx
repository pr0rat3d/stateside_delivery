import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFullMenu, updateMenuItem } from '../../api/client';
import { useMerchantSession } from '../../merchant/useMerchantSession';
import type { MenuItem } from '../../types';

export default function MerchantMenu() {
  const { merchantId } = useMerchantSession();
  const navigate = useNavigate();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [priceDrafts, setPriceDrafts] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!merchantId) {
      navigate('/merchant/login');
      return;
    }
    getFullMenu(merchantId).then(setItems);
  }, [merchantId, navigate]);

  if (!merchantId) return null;

  async function toggleAvailability(item: MenuItem) {
    const updated = await updateMenuItem(merchantId!, item.id, { is_available: !item.is_available });
    setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
  }

  async function savePrice(item: MenuItem) {
    const draft = priceDrafts[item.id];
    if (draft === undefined) return;
    const price = Number(draft);
    if (Number.isNaN(price) || price <= 0) return;
    const updated = await updateMenuItem(merchantId!, item.id, { price });
    setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
    setPriceDrafts((prev) => {
      const next = { ...prev };
      delete next[item.id];
      return next;
    });
  }

  const byCategory = items.reduce<Record<string, MenuItem[]>>((acc, item) => {
    const key = item.category || 'Other';
    acc[key] = acc[key] || [];
    acc[key].push(item);
    return acc;
  }, {});

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Menu management</h1>

      {Object.entries(byCategory).map(([category, catItems]) => (
        <section key={category} className="mb-6">
          <h2 className="font-semibold text-gray-800 mb-2 capitalize">{category}</h2>
          <div className="space-y-2">
            {catItems.map((item) => (
              <div
                key={item.id}
                className={`flex items-center justify-between rounded-lg border p-3 ${
                  item.is_available ? 'border-gray-200 bg-white' : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div>
                  <p className={`font-medium ${item.is_available ? 'text-gray-900' : 'text-gray-400 line-through'}`}>
                    {item.name}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-sm text-gray-500">$</span>
                    <input
                      type="number"
                      step="0.01"
                      defaultValue={item.price}
                      onChange={(e) => setPriceDrafts((p) => ({ ...p, [item.id]: e.target.value }))}
                      onBlur={() => savePrice(item)}
                      className="w-20 text-sm border border-gray-300 rounded px-1 py-0.5"
                    />
                  </div>
                </div>
                <button
                  onClick={() => toggleAvailability(item)}
                  className={`rounded-full text-sm font-medium px-3 py-1.5 ${
                    item.is_available
                      ? 'border border-gray-300 text-gray-700'
                      : 'bg-teal-600 text-white'
                  }`}
                >
                  {item.is_available ? 'Mark sold out' : 'Mark in stock'}
                </button>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
