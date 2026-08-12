-- Users base table (customers, drivers, merchants, admins share this)
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  password_hash VARCHAR(255),
  role VARCHAR(50) NOT NULL CHECK (role IN ('customer', 'driver', 'merchant', 'admin')),
  full_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customers
CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  user_id INT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  default_address TEXT,
  default_pin_lat DECIMAL(10, 8),
  default_pin_lng DECIMAL(11, 8),
  preferred_substitution_policy VARCHAR(50) DEFAULT 'customer_approval_required',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Drivers
CREATE TABLE drivers (
  id SERIAL PRIMARY KEY,
  user_id INT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  license_number VARCHAR(50),
  license_verified BOOLEAN DEFAULT FALSE,
  vehicle_make VARCHAR(50),
  vehicle_model VARCHAR(50),
  vehicle_year INT,
  vehicle_plate VARCHAR(20),
  insurance_verified BOOLEAN DEFAULT FALSE,
  insurance_provider VARCHAR(100),
  background_check_verified BOOLEAN DEFAULT FALSE,
  cooler_kit_status BOOLEAN DEFAULT FALSE,
  availability_status VARCHAR(50) DEFAULT 'offline' CHECK (availability_status IN ('offline', 'online', 'on_delivery', 'on_break')),
  total_deliveries INT DEFAULT 0,
  avg_rating DECIMAL(3, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Merchants
CREATE TABLE merchants (
  id SERIAL PRIMARY KEY,
  user_id INT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('restaurant', 'grocery', 'convenience', 'provisioning')),
  address TEXT,
  phone VARCHAR(20),
  hours_open TIME,
  hours_close TIME,
  commission_percent DECIMAL(5, 2) DEFAULT 15.00,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Zones
CREATE TABLE zones (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  base_delivery_fee DECIMAL(10, 2),
  service_level VARCHAR(50) DEFAULT 'standard' CHECK (service_level IN ('standard', 'priority', 'scheduled_only')),
  polygon_coords JSONB, -- Store GeoJSON polygon for future map-based queries
  min_order_value DECIMAL(10, 2),
  max_delivery_time_minutes INT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Menu items (restaurants & grocery)
CREATE TABLE menu_items (
  id SERIAL PRIMARY KEY,
  merchant_id INT NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  category VARCHAR(100),
  is_available BOOLEAN DEFAULT TRUE,
  is_cold_item BOOLEAN DEFAULT FALSE, -- For grocery cold-chain tracking
  allergen_info TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  customer_id INT NOT NULL REFERENCES customers(id),
  merchant_id INT NOT NULL REFERENCES merchants(id),
  driver_id INT REFERENCES drivers(id),
  zone_id INT NOT NULL REFERENCES zones(id),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'preparing', 'ready_pickup', 'in_transit', 'delivered', 'cancelled', 'refunded')),
  order_type VARCHAR(50) DEFAULT 'on_demand' CHECK (order_type IN ('on_demand', 'scheduled')),
  scheduled_delivery_time TIMESTAMP,
  pin_latitude DECIMAL(10, 8),
  pin_longitude DECIMAL(11, 8),
  delivery_notes TEXT,
  gate_code VARCHAR(50),
  villa_building_name VARCHAR(100),
  villa_unit VARCHAR(50),
  landmark VARCHAR(255),
  contact_phone VARCHAR(20),
  substitution_policy VARCHAR(50) DEFAULT 'exact_only',
  subtotal DECIMAL(10, 2),
  delivery_fee DECIMAL(10, 2),
  service_fee DECIMAL(10, 2),
  tax DECIMAL(10, 2),
  tip DECIMAL(10, 2) DEFAULT 0,
  total DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  delivered_at TIMESTAMP
);

-- Order items (line items in an order)
CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id INT NOT NULL REFERENCES menu_items(id),
  name VARCHAR(255),
  quantity INT DEFAULT 1,
  price_per_unit DECIMAL(10, 2),
  substitution_status VARCHAR(50) DEFAULT 'none' CHECK (substitution_status IN ('none', 'awaiting_approval', 'approved', 'refunded')),
  substitution_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payments
CREATE TABLE payments (
  id SERIAL PRIMARY KEY,
  order_id INT NOT NULL REFERENCES orders(id),
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  payment_method VARCHAR(50) DEFAULT 'card' CHECK (payment_method IN ('card', 'cash', 'wallet')),
  stripe_payment_intent_id VARCHAR(255),
  stripe_charge_id VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Driver payouts
CREATE TABLE driver_payouts (
  id SERIAL PRIMARY KEY,
  driver_id INT NOT NULL REFERENCES drivers(id),
  order_id INT REFERENCES orders(id),
  amount DECIMAL(10, 2),
  payout_status VARCHAR(50) DEFAULT 'pending' CHECK (payout_status IN ('pending', 'processing', 'completed', 'failed')),
  payout_method VARCHAR(50) DEFAULT 'stripe',
  stripe_payout_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

-- Support tickets
CREATE TABLE support_tickets (
  id SERIAL PRIMARY KEY,
  order_id INT REFERENCES orders(id),
  customer_id INT REFERENCES customers(id),
  issue_type VARCHAR(100),
  description TEXT,
  resolution TEXT,
  status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Delivery proof (photos, signatures)
CREATE TABLE delivery_proofs (
  id SERIAL PRIMARY KEY,
  order_id INT NOT NULL REFERENCES orders(id),
  proof_type VARCHAR(50) CHECK (proof_type IN ('photo', 'signature', 'gps')),
  proof_url TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cold-chain temperature logs
CREATE TABLE temperature_logs (
  id SERIAL PRIMARY KEY,
  order_id INT NOT NULL REFERENCES orders(id),
  driver_id INT NOT NULL REFERENCES drivers(id),
  temperature_f DECIMAL(5, 2),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  location VARCHAR(50) CHECK (location IN ('cooler_pre_pickup', 'cooler_pre_delivery', 'customer_handoff'))
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_customers_user_id ON customers(user_id);
CREATE INDEX idx_drivers_user_id ON drivers(user_id);
CREATE INDEX idx_drivers_availability ON drivers(availability_status);
CREATE INDEX idx_merchants_user_id ON merchants(user_id);
CREATE INDEX idx_merchants_category ON merchants(category);
CREATE INDEX idx_menu_items_merchant ON menu_items(merchant_id);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_merchant ON orders(merchant_id);
CREATE INDEX idx_orders_driver ON orders(driver_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_zone ON orders(zone_id);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_support_order ON support_tickets(order_id);
