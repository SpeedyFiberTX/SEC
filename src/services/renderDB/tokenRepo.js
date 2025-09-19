// 用於從資料庫取得 token
import pg from "pg";
import "dotenv/config";

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSLMODE === "require" ? { rejectUnauthorized: false } : false,
});

/** 依 state 取得最新一筆 token 記錄 */
export async function getTokenRowByState(state) {
  const sql = `
    SELECT id, app_user_id, ebay_user_id, state,
           access_token, access_token_expires_at,
           refresh_token, refresh_token_expires_at,
           scope, token_type, created_at, updated_at
    FROM ebay_tokens
    WHERE state = $1
    ORDER BY id DESC
    LIMIT 1;
  `;
  const { rows } = await pool.query(sql, [state]);
  return rows[0] || null;
}


// 更新 access_token（如有新的 refresh 也一起更新）
export async function updateTokensById(id, {
  accessToken,
  accessTokenExpiresAt,
}) {
  const sql = `
    UPDATE ebay_tokens
    SET
      access_token = $1,
      access_token_expires_at = $2,
      updated_at = NOW()
    WHERE id = $3
    RETURNING *;
  `;
  const params = [
    accessToken,
    accessTokenExpiresAt,
    id,
  ];
  const { rows } = await pool.query(sql, params);
  return rows[0];
}