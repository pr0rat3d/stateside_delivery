import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/logging.js';
import { generalLimiter } from './middleware/rateLimit.js';

// Routes
import healthRoutes from './routes/health.js';
import merchantRoutes from './routes/merchants.js';
import customerRoutes from './routes/customers.js';
import driverRoutes from './routes/drivers.js';
import orderRoutes from './routes/orders.js';
import zoneRoutes from './routes/zones.js';
import adminRoutes from './routes/admin.js';
import paymentRoutes, { stripeWebhookHandler } from './routes/payments.js';
import supportRoutes from './routes/support.js';
import mapsRoutes from './routes/maps.js';
import authRoutes from './routes/auth.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim());

// Middleware
app.use(helmet());
app.use(cors({ origin: corsOrigins }));
app.use(generalLimiter);

// Stripe webhook needs the raw body for signature verification, so it's mounted
// before the JSON body parser applies to everything else.
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), stripeWebhookHandler);

app.use(express.json());
app.use(requestLogger);

// Database connection
try {
  await connectDB();
  console.log('✓ Database connected');
} catch (err) {
  console.error('✗ Database connection failed:', err);
  process.exit(1);
}

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/merchants', merchantRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/zones', zoneRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/support-tickets', supportRoutes);
app.use('/api/maps', mapsRoutes);
app.use('/api/auth', authRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler (last middleware)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`✓ Server running on http://localhost:${PORT}`);
});
