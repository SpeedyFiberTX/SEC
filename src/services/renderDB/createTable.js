// 用於建立資料表
import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : false,
});

async function createTable() {
  const sql = `
CREATE TABLE IF NOT EXISTS ebay_tokens (
  id SERIAL PRIMARY KEY,
  app_user_id VARCHAR(255),
  ebay_user_id VARCHAR(255),
  access_token TEXT NOT NULL,
  access_token_expires_at TIMESTAMP NOT NULL,
  refresh_token TEXT NOT NULL,
  refresh_token_expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
  `;

  try {
    await pool.query(sql);
    console.log("✅ Table ebay_tokens created (if not exists).");
  } catch (err) {
    console.error("❌ Error creating table:", err.message);
  } finally {
    await pool.end();
  }
}

createTable();