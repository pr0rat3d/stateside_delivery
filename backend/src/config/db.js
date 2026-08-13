import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Stateside Deliveries operates in a single timezone (AST). "timestamp without time zone"
// columns should round-trip as plain wall-clock strings, not get silently reinterpreted
// through whatever timezone the Node process or a client happens to be running in.
pg.types.setTypeParser(1114, (value) => value);

// DATABASE_URL (a full connection string, as hosted Postgres providers like Neon give
// you) takes priority when present. Cloud providers require SSL; a local Postgres
// doesn't support it at all, so only enable SSL when the URL isn't pointing at localhost.
const isLocalDatabaseUrl = /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL || '');

export const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: isLocalDatabaseUrl ? false : { rejectUnauthorized: false },
    })
  : new Pool({
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
