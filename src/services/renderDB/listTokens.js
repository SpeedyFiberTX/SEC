// 列出資料表內容(前五筆)
import pg from "pg";
import "dotenv/config";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSLMODE === "require" ? { rejectUnauthorized: false } : false,
});

async function listTokens() {
  try {
    const { rows } = await pool.query(
      `SELECT id, app_user_id, ebay_user_id, state, access_token_expires_at, refresh_token_expires_at, created_at, updated_at
       FROM ebay_tokens
       ORDER BY id DESC
       LIMIT 10;`
    );

    console.table(rows);
  } catch (err) {
    console.error("❌ Query error:", err.message);
  } finally {
    await pool.end();
  }
}

listTokens();
