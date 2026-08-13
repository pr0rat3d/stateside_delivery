export const MAP_DEFAULT_CENTER: [number, number] = [18.3358, -64.8963];
export const BUSINESS_HOURS = { open: 8, close: 22 };

const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';
export const STRIPE_PUBLISHABLE_KEY = stripeKey;
export const STRIPE_CONFIGURED = stripeKey.startsWith('pk_') && stripeKey !== 'pk_test_your_stripe_key_here';

const mapsKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
export const GOOGLE_MAPS_API_KEY = mapsKey;
export const GOOGLE_MAPS_CONFIGURED = mapsKey.length > 10 && mapsKey !== 'your_google_maps_key_here';
