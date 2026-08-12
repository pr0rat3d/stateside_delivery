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

5. **Run migrations:**
   ```bash
   psql stateside_deliveries < migrations/001_init_schema.sql
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

## Next Steps

- Phase 2: Customer app (React + Google Maps)
- Phase 3: Driver app
- Phase 4: Merchant portal
- Phase 5: Admin dashboard
- Phase 6: Real integrations (Stripe, Google Maps, Twilio)
