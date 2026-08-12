import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getMerchant } from '../api/client';
import { useCart } from '../context/CartContext';
import type { MerchantWithMenu } from '../types';

export default function MerchantDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const cart = useCart();
  const [merchant, setMerchant] = useState<MerchantWithMenu | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getMerchant(id)
      .then(setMerchant)
      .catch(() => setError('Could not load this store.'));
  }, [id]);

  if (error) return <p className="max-w-5xl mx-auto px-4 py-6 text-red-600">{error}</p>;
  if (!merchant) return <p className="max-w-5xl mx-auto px-4 py-6 text-gray-500">Loading menu...</p>;

  const itemsByCategory = merchant.menu_items.reduce<Record<string, typeof merchant.menu_items>>((acc, item) => {
    const key = item.category || 'Other';
    acc[key] = acc[key] || [];
    acc[key].push(item);
    return acc;
  }, {});

  const handleAdd = (item: (typeof merchant.menu_items)[number]) => {
    if (cart.merchantId !== null && cart.merchantId !== merchant.id) {
      const ok = window.confirm(
        `Your cart has items from ${cart.merchantName}. Start a new order from ${merchant.business_name} and clear the current cart?`
      );
      if (!ok) return;
    }
    cart.addItem(merchant.id, merchant.business_name, {
      menu_item_id: item.id,
      name: item.name,
      price_per_unit: Number(item.price),
      quantity: 1,
      is_cold_item: item.is_cold_item,
    });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <button onClick={() => navigate(-1)} className="text-sm text-teal-700 mb-3">
        ← Back
      </button>
      <h1 className="text-2xl font-bold text-gray-900">{merchant.business_name}</h1>
      <p className="text-sm text-gray-500 mb-6">
        {merchant.category} · {merchant.hours_open?.slice(0, 5)} – {merchant.hours_close?.slice(0, 5)}
      </p>

      {Object.entries(itemsByCategory).map(([category, items]) => (
        <section key={category} className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-2 capitalize">{category}</h2>
          <div className="space-y-2">
            {items.map((item) => {
              const inCart = cart.items.find((i) => i.menu_item_id === item.id);
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {item.name}
                      {item.is_cold_item && <span className="ml-2 text-xs text-blue-600">❄ cold</span>}
                    </p>
                    {item.description && <p className="text-sm text-gray-500">{item.description}</p>}
                    <p className="text-sm text-gray-700">${Number(item.price).toFixed(2)}</p>
                  </div>
                  <button
                    onClick={() => handleAdd(item)}
                    className="rounded-full bg-teal-600 text-white text-sm font-medium px-3 py-1.5 hover:bg-teal-700"
                  >
                    {inCart ? `Add another (${inCart.quantity})` : 'Add'}
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {cart.items.length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md">
          <button
            onClick={() => navigate('/checkout')}
            className="w-full rounded-full bg-gray-900 text-white py-3 font-medium shadow-lg flex items-center justify-between px-6"
          >
            <span>{cart.items.reduce((s, i) => s + i.quantity, 0)} items in cart</span>
            <span>${cart.subtotal.toFixed(2)} · Checkout →</span>
          </button>
        </div>
      )}
    </div>
  );
}
