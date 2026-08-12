import { useState } from 'react';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { STRIPE_PUBLISHABLE_KEY } from '../config';

const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);

interface Props {
  clientSecret: string;
  orderId: number;
  onSuccess: () => void;
}

function InnerForm({ orderId, onSuccess }: Props) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);

    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/orders/${orderId}` },
      redirect: 'if_required',
    });

    if (confirmError) {
      setError(confirmError.message || 'Payment failed. Please try another card.');
      setSubmitting(false);
      return;
    }

    if (paymentIntent?.status === 'succeeded') {
      onSuccess();
    } else {
      setError('Payment did not complete. Please try again.');
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <PaymentElement />
      {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
      <button
        onClick={handleSubmit}
        disabled={!stripe || submitting}
        className="w-full mt-4 rounded-full bg-gray-900 text-white py-3 font-medium disabled:opacity-50"
      >
        {submitting ? 'Processing payment...' : 'Pay now'}
      </button>
    </div>
  );
}

export default function StripeCheckoutForm(props: Props) {
  return (
    <Elements stripe={stripePromise} options={{ clientSecret: props.clientSecret }}>
      <InnerForm {...props} />
    </Elements>
  );
}
