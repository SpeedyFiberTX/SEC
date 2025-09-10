import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : false,
});

/**
 * 儲存 eBay token（簡版：每次授權新增一筆）
 * @param {Object} tokenResponse - eBay token response
 * @param {string} state - OAuth state（可為 null）
 * @param {string|null} appUserId - 你系統的使用者 ID（可選）
 * @param {string|null} ebayUserId - eBay 使用者 ID（可選）
 */
export async function saveEbayTokens(tokenResponse, state, appUserId = null, ebayUserId = null) {
  const {
    access_token,
    expires_in,
    refresh_token,
    refresh_token_expires_in,
    scope = null,
    token_type,
  } = tokenResponse;

  const now = Date.now();
  const accessTokenExpiresAt = new Date(now + (expires_in ?? 0) * 1000);
  const refreshTokenExpiresAt = new Date(now + (refresh_token_expires_in ?? 0) * 1000);

  const sql = `
    INSERT INTO ebay_tokens (
      app_user_id,
      ebay_user_id,
      state,
      access_token,
      access_token_expires_at,
      refresh_token,
      refresh_token_expires_at,
      scope,
      token_type,
      created_at,
      updated_at
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW())
    RETURNING id, app_user_id, ebay_user_id, state, access_token_expires_at, refresh_token_expires_at, token_type;
  `;

  const values = [
    appUserId ?? null,
    ebayUserId ?? null,
    state ?? null,
    access_token,
    accessTokenExpiresAt,
    refresh_token,
    refreshTokenExpiresAt,
    scope ?? null,
    token_type,
  ];

  const { rows } = await pool.query(sql, values);
  return rows[0];
}
