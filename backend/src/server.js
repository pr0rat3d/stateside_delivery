import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/logging.js';

// Routes
import healthRoutes from './routes/health.js';
import merchantRoutes from './routes/merchants.js';
import customerRoutes from './routes/customers.js';
import driverRoutes from './routes/drivers.js';
import orderRoutes from './routes/orders.js';
import zoneRoutes from './routes/zones.js';
import adminRoutes from './routes/admin.js';
import paymentRoutes from './routes/payments.js';
import supportRoutes from './routes/support.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors());
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

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler (last middleware)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`✓ Server running on http://localhost:${PORT}`);
});
