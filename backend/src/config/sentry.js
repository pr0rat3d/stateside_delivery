import * as Sentry from '@sentry/node';

export const sentryConfigured = Boolean(process.env.SENTRY_DSN) && process.env.SENTRY_DSN !== 'your_sentry_dsn_here';

if (sentryConfigured) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.2,
  });
} else {
  console.log('ℹ Sentry not configured — errors will only be logged to the console.');
}

export { Sentry };
