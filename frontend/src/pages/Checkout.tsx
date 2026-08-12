import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { confirmMockPayment, createOrder, createPaymentIntent, getEta, getZones, type EtaResponse } from '../api/client';
import { useCart } from '../context/CartContext';
import LocationPicker from '../components/LocationPicker';
import GoogleLocationPicker from '../components/GoogleLocationPicker';
import StripeCheckoutForm from '../components/StripeCheckoutForm';
import { BUSINESS_HOURS, GOOGLE_MAPS_CONFIGURED, MAP_DEFAULT_CENTER, MOCK_CUSTOMER_ID } from '../config';
import type { SubstitutionPolicy, Zone } from '../types';

const TIP_PRESETS = [0, 0.1, 0.15, 0.2];

export default function Checkout() {
  const cart = useCart();
  const navigate = useNavigate();

  const [zones, setZones] = useState<Zone[]>([]);
  const [zoneId, setZoneId] = useState<number | null>(null);
  const [position, setPosition] = useState<[number, number]>(MAP_DEFAULT_CENTER);

  const [gateCode, setGateCode] = useState('');
  const [villaBuilding, setVillaBuilding] = useState('');
  const [villaUnit, setVillaUnit] = useState('');
  const [landmark, setLandmark] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [substitutionPolicy, setSubstitutionPolicy] = useState<SubstitutionPolicy>('customer_approval_required');

  const [orderType, setOrderType] = useState<'on_demand' | 'scheduled'>('on_demand');
  const [scheduledTime, setScheduledTime] = useState('');

  const [tipPercent, setTipPercent] = useState<number>(0.15);
  const [customTip, setCustomTip] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingOrderId, setPendingOrderId] = useState<number | null>(null);
  const [paymentClientSecret, setPaymentClientSecret] = useState<string | null>(null);
  const [eta, setEta] = useState<EtaResponse | null>(null);

  useEffect(() => {
    getZones().then((z) => {
      setZones(z);
      if (z.length > 0) setZoneId(z[0].id);
    });
  }, []);

  useEffect(() => {
    if (!zoneId || !cart.merchantId) return;
    getEta({ merchant_id: cart.merchantId, pin_latitude: position[0], pin_longitude: position[1], zone_id: zoneId })
      .then(setEta)
      .catch(() => setEta(null));
  }, [zoneId, position, cart.merchantId]);

  useEffect(() => {
    if (cart.items.length === 0) navigate('/');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const zone = zones.find((z) => z.id === zoneId) || null;
  const deliveryFee = zone ? Number(zone.base_delivery_fee) : 0;
  const serviceFee = cart.subtotal * 0.03;
  const tax = cart.subtotal * 0.05;
  const tip = customTip !== '' ? Number(customTip) || 0 : cart.subtotal * tipPercent;
  const total = cart.subtotal + deliveryFee + serviceFee + tax + tip;

  const belowMinimum = zone && cart.subtotal < Number(zone.min_order_value);

  function validateScheduledTime(value: string): string | null {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Choose a valid delivery time.';
    if (date.getTime() < Date.now() + 30 * 60 * 1000) return 'Scheduled delivery must be at least 30 minutes out.';
    const hour = date.getHours();
    if (hour < BUSINESS_HOURS.open || hour >= BUSINESS_HOURS.close) {
      return `We deliver between ${BUSINESS_HOURS.open}:00 AM and ${BUSINESS_HOURS.close - 12}:00 PM.`;
    }
    return null;
  }

  async function handleSubmit() {
    setError(null);

    if (!zoneId) {
      setError('Select a delivery zone.');
      return;
    }
    if (!contactPhone.trim()) {
      setError('A contact phone number is required.');
      return;
    }
    if (belowMinimum) {
      setError(`This zone requires a minimum order of $${Number(zone!.min_order_value).toFixed(2)}.`);
      return;
    }
    if (orderType === 'scheduled') {
      const err = validateScheduledTime(scheduledTime);
      if (err) {
        setError(err);
        return;
      }
    }

    setSubmitting(true);
    try {
      const order = await createOrder({
        customer_id: MOCK_CUSTOMER_ID,
        merchant_id: cart.merchantId!,
        zone_id: zoneId,
        pin_latitude: position[0],
        pin_longitude: position[1],
        delivery_notes: deliveryNotes,
        gate_code: gateCode,
        villa_building_name: villaBuilding,
        villa_unit: villaUnit,
        landmark,
        contact_phone: contactPhone,
        substitution_policy: substitutionPolicy,
        order_type: orderType,
        scheduled_delivery_time: orderType === 'scheduled' ? scheduledTime : null,
        tip: Math.round(tip * 100) / 100,
        order_items: cart.items.map((i) => ({
          menu_item_id: i.menu_item_id,
          name: i.name,
          quantity: i.quantity,
          price_per_unit: i.price_per_unit,
        })),
      });

      const paymentIntent = await createPaymentIntent(order.id, Number(order.total));

      if (paymentIntent.client_secret) {
        // Real Stripe is configured — hold off clearing the cart / navigating until the
        // card is actually confirmed below.
        setPendingOrderId(order.id);
        setPaymentClientSecret(paymentIntent.client_secret);
        setSubmitting(false);
        return;
      }

      await confirmMockPayment(paymentIntent.payment_id);
      cart.clearCart();
      navigate(`/orders/${order.id}`);
    } catch {
      setError('Something went wrong placing your order. Please try again.');
      setSubmitting(false);
    }
  }

  function handleStripeSuccess() {
    cart.clearCart();
    navigate(`/orders/${pendingOrderId}`);
  }

  if (cart.items.length === 0 && !pendingOrderId) return null;

  if (pendingOrderId && paymentClientSecret) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Payment</h1>
        <p className="text-gray-500 mb-6">Order #{pendingOrderId} · ${total.toFixed(2)}</p>
        <StripeCheckoutForm clientSecret={paymentClientSecret} orderId={pendingOrderId} onSuccess={handleStripeSuccess} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-40">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Checkout</h1>
      <p className="text-gray-500 mb-6">Ordering from {cart.merchantName}</p>

      <section className="mb-6">
        <h2 className="font-semibold text-gray-800 mb-2">Your items</h2>
        <div className="space-y-2">
          {cart.items.map((item) => (
            <div key={item.menu_item_id} className="flex items-center justify-between bg-white rounded-lg border border-gray-200 p-3">
              <div>
                <p className="font-medium text-gray-900">{item.name}</p>
                <p className="text-sm text-gray-500">${item.price_per_unit.toFixed(2)} each</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => cart.updateQuantity(item.menu_item_id, item.quantity - 1)}
                  className="w-7 h-7 rounded-full border border-gray-300 text-gray-600"
                >
                  −
                </button>
                <span className="w-5 text-center">{item.quantity}</span>
                <button
                  onClick={() => cart.updateQuantity(item.menu_item_id, item.quantity + 1)}
                  className="w-7 h-7 rounded-full border border-gray-300 text-gray-600"
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
        {cart.hasColdItems && (
          <p className="text-sm text-blue-700 bg-blue-50 rounded-lg p-2 mt-2">
            ❄ This order includes cold items and will be handled with our cold-chain protocol.
          </p>
        )}
      </section>

      <section className="mb-6">
        <h2 className="font-semibold text-gray-800 mb-2">Delivery pin</h2>
        <p className="text-sm text-gray-500 mb-2">Click the map or drag the pin to your exact location.</p>
        {GOOGLE_MAPS_CONFIGURED ? (
          <GoogleLocationPicker position={position} onChange={setPosition} />
        ) : (
          <LocationPicker position={position} onChange={setPosition} />
        )}
      </section>

      <section className="mb-6">
        <h2 className="font-semibold text-gray-800 mb-2">Delivery zone</h2>
        <select
          value={zoneId ?? ''}
          onChange={(e) => setZoneId(Number(e.target.value))}
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
        >
          {zones.map((z) => (
            <option key={z.id} value={z.id}>
              {z.name} — ${Number(z.base_delivery_fee).toFixed(2)} delivery
            </option>
          ))}
        </select>
        {belowMinimum && (
          <p className="text-sm text-red-600 mt-1">
            Minimum order for this zone is ${Number(zone!.min_order_value).toFixed(2)}.
          </p>
        )}
        {eta && (
          <p className="text-sm text-gray-500 mt-1">
            Estimated delivery time: {eta.duration_text}
            {eta.source === 'zone_estimate' && ' (estimate)'}
          </p>
        )}
      </section>

      <section className="mb-6 grid grid-cols-2 gap-3">
        <input
          placeholder="Gate code (optional)"
          value={gateCode}
          onChange={(e) => setGateCode(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 col-span-1"
        />
        <input
          placeholder="Contact phone"
          value={contactPhone}
          onChange={(e) => setContactPhone(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 col-span-1"
        />
        <input
          placeholder="Villa / building name"
          value={villaBuilding}
          onChange={(e) => setVillaBuilding(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 col-span-1"
        />
        <input
          placeholder="Unit #"
          value={villaUnit}
          onChange={(e) => setVillaUnit(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 col-span-1"
        />
        <input
          placeholder="Nearby landmark"
          value={landmark}
          onChange={(e) => setLandmark(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 col-span-2"
        />
        <textarea
          placeholder="Delivery notes (e.g. leave at door, dog on property)"
          value={deliveryNotes}
          onChange={(e) => setDeliveryNotes(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 col-span-2"
          rows={2}
        />
      </section>

      <section className="mb-6">
        <h2 className="font-semibold text-gray-800 mb-2">If an item is unavailable</h2>
        <select
          value={substitutionPolicy}
          onChange={(e) => setSubstitutionPolicy(e.target.value as SubstitutionPolicy)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
        >
          <option value="customer_approval_required">Contact me to approve a substitute</option>
          <option value="shopper_discretion">Let the shopper choose a substitute</option>
          <option value="exact_only">Refund that item — no substitutes</option>
        </select>
      </section>

      <section className="mb-6">
        <h2 className="font-semibold text-gray-800 mb-2">When</h2>
        <div className="flex gap-2 mb-2">
          <button
            onClick={() => setOrderType('on_demand')}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${
              orderType === 'on_demand' ? 'bg-teal-600 text-white border-teal-600' : 'border-gray-300 text-gray-700'
            }`}
          >
            As soon as possible
          </button>
          <button
            onClick={() => setOrderType('scheduled')}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${
              orderType === 'scheduled' ? 'bg-teal-600 text-white border-teal-600' : 'border-gray-300 text-gray-700'
            }`}
          >
            Schedule for later
          </button>
        </div>
        {orderType === 'scheduled' && (
          <input
            type="datetime-local"
            value={scheduledTime}
            onChange={(e) => setScheduledTime(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        )}
      </section>

      <section className="mb-6">
        <h2 className="font-semibold text-gray-800 mb-2">Tip your driver</h2>
        <div className="flex gap-2">
          {TIP_PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => {
                setTipPercent(p);
                setCustomTip('');
              }}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${
                customTip === '' && tipPercent === p ? 'bg-teal-600 text-white border-teal-600' : 'border-gray-300 text-gray-700'
              }`}
            >
              {p === 0 ? 'No tip' : `${p * 100}%`}
            </button>
          ))}
        </div>
        <input
          type="number"
          min={0}
          step={0.5}
          placeholder="Custom tip amount ($)"
          value={customTip}
          onChange={(e) => setCustomTip(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 mt-2"
        />
      </section>

      <section className="mb-6 bg-white rounded-xl border border-gray-200 p-4 space-y-1 text-sm">
        <div className="flex justify-between"><span>Subtotal</span><span>${cart.subtotal.toFixed(2)}</span></div>
        <div className="flex justify-between"><span>Delivery fee</span><span>${deliveryFee.toFixed(2)}</span></div>
        <div className="flex justify-between"><span>Service fee</span><span>${serviceFee.toFixed(2)}</span></div>
        <div className="flex justify-between"><span>Tax</span><span>${tax.toFixed(2)}</span></div>
        <div className="flex justify-between"><span>Tip</span><span>${tip.toFixed(2)}</span></div>
        <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-200"><span>Total</span><span>${total.toFixed(2)}</span></div>
      </section>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={handleSubmit}
            disabled={submitting || !!belowMinimum}
            className="w-full rounded-full bg-gray-900 text-white py-3 font-medium disabled:opacity-50"
          >
            {submitting ? 'Placing order...' : `Place order · $${total.toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
