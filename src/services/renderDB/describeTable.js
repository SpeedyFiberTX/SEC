// 查看資料表有哪些欄位
import pg from "pg";
import "dotenv/config";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSLMODE === "require" ? { rejectUnauthorized: false } : false,
});

async function describeTable(tableName = "ebay_tokens") {
  try {
    const sql = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = $1
      ORDER BY ordinal_position;
    `;
    const { rows } = await pool.query(sql, [tableName]);

    console.table(rows); // 漂亮地印出來
  } catch (err) {
    console.error("❌ Error describing table:", err.message);
  } finally {
    await pool.end();
  }
}

describeTable();
