import { query } from '../src/config/db.js';
import { hashPassword } from '../src/utils/password.js';
import dotenv from 'dotenv';

dotenv.config();

const TEST_PASSWORD = 'password123';

async function seedData() {
  try {
    console.log('Seeding mock data...');

    // Clear existing data (careful in production!)
    await query('TRUNCATE TABLE users, customers, drivers, merchants, zones, menu_items, orders, order_items, payments, support_tickets RESTART IDENTITY CASCADE');

    const password_hash = await hashPassword(TEST_PASSWORD);

    // Create zones
    const zone1 = await query(
      `INSERT INTO zones (name, base_delivery_fee, service_level, min_order_value, max_delivery_time_minutes)
       VALUES ('Zone 1: Charlotte Amalie', 5.00, 'standard', 10.00, 30)
       RETURNING id`
    );
    const zoneId = zone1.rows[0].id;

    // Create merchants (restaurant)
    const user1 = await query(
      `INSERT INTO users (email, password_hash, full_name, phone, role) VALUES ('fruitbowl@test.com', $1, 'Fruit Bowl', '1-340-555-0001', 'merchant')
       RETURNING id`,
      [password_hash]
    );
    const merchant1 = await query(
      `INSERT INTO merchants (user_id, business_name, category, phone, hours_open, hours_close, commission_percent)
       VALUES ($1, 'Fruit Bowl', 'restaurant', '1-340-555-0001', '10:00', '22:00', 15.00)
       RETURNING id`,
      [user1.rows[0].id]
    );

    // Add menu items
    await query(
      `INSERT INTO menu_items (merchant_id, name, price, category, is_available)
       VALUES ($1, 'Island Fish Plate', 18.99, 'entree', true),
              ($1, 'Conch Salad', 12.99, 'appetizer', true),
              ($1, 'Fresh Mango Juice', 4.99, 'beverage', true)`,
      [merchant1.rows[0].id]
    );

    // Create merchants (grocery)
    const user2 = await query(
      `INSERT INTO users (email, password_hash, full_name, phone, role) VALUES ('costless@test.com', $1, 'Cost U Less', '1-340-555-0002', 'merchant')
       RETURNING id`,
      [password_hash]
    );
    const merchant2 = await query(
      `INSERT INTO merchants (user_id, business_name, category, phone, hours_open, hours_close, commission_percent)
       VALUES ($1, 'Cost U Less', 'grocery', '1-340-555-0002', '07:00', '20:00', 12.00)
       RETURNING id`,
      [user2.rows[0].id]
    );

    // Add grocery items
    await query(
      `INSERT INTO menu_items (merchant_id, name, price, category, is_available, is_cold_item)
       VALUES ($1, 'Milk (1 gallon)', 5.99, 'dairy', true, true),
              ($1, 'Fresh Eggs (dozen)', 7.99, 'dairy', true, true),
              ($1, 'Orange Juice (half-gallon)', 4.49, 'beverage', true, true),
              ($1, 'Frozen Pizza', 8.99, 'frozen', true, true),
              ($1, 'Bag of Apples', 6.99, 'produce', true, false)`,
      [merchant2.rows[0].id]
    );

    // Create test customer
    const userC = await query(
      `INSERT INTO users (email, password_hash, full_name, phone, role) VALUES ('guest@test.com', $1, 'Test Customer', '1-340-555-9999', 'customer')
       RETURNING id`,
      [password_hash]
    );
    const customer = await query(
      `INSERT INTO customers (user_id, default_pin_lat, default_pin_lng) VALUES ($1, 18.3372, -64.8977)
       RETURNING id`,
      [userC.rows[0].id]
    );

    // Create test driver
    const userD = await query(
      `INSERT INTO users (email, password_hash, full_name, phone, role) VALUES ('driver@test.com', $1, 'Test Driver', '1-340-555-8888', 'driver')
       RETURNING id`,
      [password_hash]
    );
    await query(
      `INSERT INTO drivers (user_id, license_number, license_verified, insurance_verified, cooler_kit_status, availability_status, total_deliveries)
       VALUES ($1, 'VI-DL-123456', true, true, true, 'online', 0)`,
      [userD.rows[0].id]
    );

    // Create test admin
    await query(
      `INSERT INTO users (email, password_hash, full_name, phone, role) VALUES ('admin@test.com', $1, 'Test Admin', '1-340-555-0000', 'admin')`,
      [password_hash]
    );

    console.log('✓ Mock data seeded successfully');
    console.log(`  Test login password for all seeded accounts: ${TEST_PASSWORD}`);
    console.log('  fruitbowl@test.com (merchant), costless@test.com (merchant),');
    console.log('  guest@test.com (customer), driver@test.com (driver), admin@test.com (admin)');
    process.exit(0);
  } catch (err) {
    console.error('✗ Seeding failed:', err);
    process.exit(1);
  }
}

seedData();
