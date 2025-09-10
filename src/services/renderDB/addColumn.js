import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : false,
});

async function addColumn() {
  try {
    await pool.query(`ALTER TABLE ebay_tokens ADD COLUMN state VARCHAR(255);`);
    console.log("✅ state 欄位已新增");
  } catch (err) {
    console.error("❌ Error:", err.message);
  } finally {
    await pool.end();
  }
}

addColumn();