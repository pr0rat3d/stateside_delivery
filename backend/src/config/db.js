import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Stateside Deliveries operates in a single timezone (AST). "timestamp without time zone"
// columns should round-trip as plain wall-clock strings, not get silently reinterpreted
// through whatever timezone the Node process or a client happens to be running in.
pg.types.setTypeParser(1114, (value) => value);

export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'stateside_deliveries',
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export async function connectDB() {
  try {
    const res = await pool.query('SELECT NOW()');
    console.log('Database time:', res.rows[0]);
  } catch (err) {
    console.error('Database connection error:', err);
    throw err;
  }
}

export async function query(text, params) {
  try {
    return await pool.query(text, params);
  } catch (err) {
    console.error('Query error:', err);
    throw err;
  }
}
