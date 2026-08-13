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

## Authentication

Every role (customer, driver, merchant, admin) has a real account with a bcrypt-hashed
password and a JWT issued on login. The frontend attaches it as `Authorization: Bearer
<token>` on every request (`src/middleware/auth.js` on the backend, an axios interceptor
on the frontend). Token payload carries `role` plus the role-specific id
(`customer_id`/`driver_id`/`merchant_id`), so route guards can check ownership without
an extra DB lookup.

- **Customer, driver, and merchant** accounts are self-service — anyone can register.
  Driver and merchant accounts start unverified/inactive respectively (see the existing
  `license_verified`, `insurance_verified`, `is_active` columns) until an admin approves
  them; a merchant's storefront stays hidden from customer browsing until then.
- **Admin** accounts are never self-service — there is no public registration endpoint
  for the `admin` role. Create one via the seed script or directly in the database.
- Route guards (`requireAuth`, `requireRole`, `requireSelfOrAdmin`, and a few bespoke
  order-ownership checks in `routes/orders.js`) are applied across every route file —
  a driver can only act on their own deliveries, a merchant only on their own orders and
  menu, a customer only on their own orders, and `/api/admin/*` is admin-only throughout.
- Login: `POST /api/auth/login` (any role). Register: `POST /api/auth/register/customer`,
  `/register/driver`, `/register/merchant`. `GET /api/auth/me` returns the decoded token.

**Test credentials** (after `npm run seed`), password `password123` for all:
`fruitbowl@test.com` / `costless@test.com` (merchant), `guest@test.com` (customer),
`driver@test.com` (driver), `admin@test.com` (admin).

## Security notes

- Rate limiting is applied globally and more strictly on write endpoints
  (`src/middleware/rateLimit.js`), with a tighter limit on `/api/auth/*` for brute-force
  protection
- Order creation prices and validates every line item server-side against `menu_items`
  — client-supplied price/name are never trusted
- Request bodies on high-risk endpoints are validated with `zod` (`src/utils/schemas.js`)
- `CORS_ORIGIN` restricts which frontend origin(s) may call the API — set this to your
  real domain(s) before deploying
- `JWT_SECRET` ships with a placeholder default that works fine locally but **must** be
  rotated to a real random secret before any real deployment

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
- Phase 6: Real integrations (Stripe, Google Maps, Twilio) + security hardening
  (including JWT auth and role-checked route guards, added after the initial Phase 6
  pass) — done; real credentials still need to be added per "Enabling real
  integrations" above. Remaining from the original Phase 6 scope: real email receipts,
  staging environment + deployment pipeline, and performance monitoring/error tracking.
