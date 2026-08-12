# Stateside Deliveries Backend

## Setup

1. **Install PostgreSQL** (Mac: `brew install postgresql-15`, or Docker)
2. **Create database:**
   ```bash
   createdb stateside_deliveries
   ```

3. **Copy .env:**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials and API keys
   ```

4. **Install dependencies:**
   ```bash
   npm install
   ```

5. **Run migrations (in order):**
   ```bash
   psql stateside_deliveries < migrations/001_init_schema.sql
   psql stateside_deliveries < migrations/002_add_prep_time.sql
   psql stateside_deliveries < migrations/003_driver_active_flag.sql
   ```

6. **Seed mock data:**
   ```bash
   npm run seed
   ```

7. **Start dev server:**
   ```bash
   npm run dev
   ```

Server running on http://localhost:5000

## Health Check

```bash
curl http://localhost:5000/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": { "now": "2024-..." },
  "environment": "development"
}
```

## Enabling real integrations

Stripe, Google Maps, and Twilio all currently run in **mock mode** — the app is fully
functional without any of these accounts. Each one detects whether its env vars hold a
real key (vs. the `.env.example` placeholder) and automatically switches from mock
behavior to the real API call. No code changes needed — just drop in real keys and
restart the server.

### Stripe (real payments)

1. Create a free account at https://dashboard.stripe.com/register
2. Go to **Developers → API keys** and copy the **test mode** Secret key and Publishable key
3. Set `STRIPE_SECRET_KEY` (backend `.env`) and `VITE_STRIPE_PUBLISHABLE_KEY` (frontend `.env`)
4. For the webhook (so payment confirmations update the DB even if the customer closes
   the tab before the redirect completes):
   - Install the [Stripe CLI](https://docs.stripe.com/stripe-cli) and run
     `stripe listen --forward-to localhost:5000/api/payments/webhook`
   - Copy the `whsec_...` signing secret it prints into `STRIPE_WEBHOOK_SECRET`
   - In production, create the webhook endpoint in the Stripe Dashboard instead
     (**Developers → Webhooks**) pointing at `https://your-domain/api/payments/webhook`,
     subscribed to `payment_intent.succeeded` and `payment_intent.payment_failed`
5. Restart the backend — checkout will now show a real Stripe card form instead of the
   one-click mock payment

### Google Maps (real maps + ETAs)

1. Create a project at https://console.cloud.google.com/, enable billing (Google gives a
   recurring free monthly credit that covers typical dev/small-business usage)
2. Enable the **Maps JavaScript API** and **Distance Matrix API** (APIs & Services → Library)
3. Create two API keys (APIs & Services → Credentials):
   - A **browser key** restricted by HTTP referrer to your domain(s) — set as
     `VITE_GOOGLE_MAPS_API_KEY` (frontend `.env`)
   - A **server key** restricted by IP (or unrestricted for local dev only) — set as
     `GOOGLE_MAPS_SERVER_KEY` (backend `.env`)
4. Restart both servers — pin-drop, the admin live map, and delivery ETAs will switch
   from Leaflet/OpenStreetMap and flat zone estimates to real Google Maps and live
   drive-time estimates
5. Note: real ETAs also need a merchant `address` on file (currently null in the seed
   data) — without one, the ETA endpoint falls back to the zone's flat estimate even
   with Maps configured

### Twilio (real SMS)

1. Create a free trial account at https://www.twilio.com/try-twilio
2. Buy or use the trial phone number (Console → Phone Numbers)
3. Copy the Account SID and Auth Token from the Console dashboard
4. Set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` (backend `.env`)
5. Restart the backend — order-accepted, driver-assigned, and delivered notifications
   will send real texts instead of logging `[SMS mock] ...` to the console
6. Trial accounts can only text verified numbers — verify your test phone number in the
   Twilio Console before testing

## Security notes

- Rate limiting is applied globally and more strictly on write endpoints
  (`src/middleware/rateLimit.js`)
- Order creation prices and validates every line item server-side against `menu_items`
  — client-supplied price/name are never trusted
- Request bodies on high-risk endpoints are validated with `zod` (`src/utils/schemas.js`)
- `CORS_ORIGIN` restricts which frontend origin(s) may call the API — set this to your
  real domain(s) before deploying
- There is still no real authentication (every role uses a mock identity picker in the
  frontend) — every `/api/admin/*`, `/api/merchants/:id/menu/*`, etc. endpoint is
  currently reachable by anyone who can reach the API. Add JWT-based auth and
  role-checked route guards before any real deployment.

## API Endpoints (Phase 1)

### Merchants
- GET /api/merchants
- GET /api/merchants/:id (includes menu)
- POST /api/merchants

### Customers
- GET /api/customers/:id
- POST /api/customers

### Drivers
- GET /api/drivers
- GET /api/drivers/:id
- PATCH /api/drivers/:id/availability
- PATCH /api/drivers/:id/cooler-kit

### Orders
- POST /api/orders
- GET /api/orders/:id
- PATCH /api/orders/:id/status

### Zones
- GET /api/zones
- POST /api/zones

### Admin
- GET /api/admin/stats
- GET /api/admin/orders (live)
- POST /api/admin/refunds/:order_id

### Payments
- POST /api/payments/intent

Phases 2–5 added many more endpoints (driver dispatch, merchant order management,
substitutions, admin zone/merchant/driver management, reports, support tickets) — see
the route files under `src/routes/` for the full current list.

## Next Steps

- Phase 1: Foundation & infrastructure — done
- Phase 2: Customer app — done
- Phase 3: Driver app & dispatch — done
- Phase 4: Merchant portal — done
- Phase 5: Admin dashboard — done
- Phase 6: Real integrations (Stripe, Google Maps, Twilio) + security hardening — done;
  real credentials still need to be added per "Enabling real integrations" above.
  Remaining from the original Phase 6 scope: real email receipts, staging environment
  + deployment pipeline, and performance monitoring/error tracking.
