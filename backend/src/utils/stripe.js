import Stripe from 'stripe';

function looksConfigured(key) {
  if (!key) return false;
  if (key === 'sk_test_your_stripe_key_here') return false;
  // A real Stripe secret key is much longer than the literal placeholder text.
  return key.startsWith('sk_') && key.length > 20;
}

export const stripeConfigured = looksConfigured(process.env.STRIPE_SECRET_KEY);

export const stripe = stripeConfigured ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

if (!stripeConfigured) {
  console.log('ℹ Stripe not configured (no real STRIPE_SECRET_KEY) — payments will use the mock flow.');
}
