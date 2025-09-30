import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js'

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function saveEbayTokens(tokenResponse, state, appUserId = null, ebayUserId = null) {
  const {
    access_token,
    expires_in,
    refresh_token,
    refresh_token_expires_in,
    scope = null,
    token_type,
  } = tokenResponse

  const now = Date.now()
  const accessTokenExpiresAt = new Date(now + (expires_in ?? 0) * 1000).toISOString()
  const refreshTokenExpiresAt = new Date(now + (refresh_token_expires_in ?? 0) * 1000).toISOString()

  const row = {
    app_user_id: appUserId,
    ebay_user_id: ebayUserId,
    state,
    access_token: access_token,
    access_token_expires_at: accessTokenExpiresAt,
    refresh_token: refresh_token,
    refresh_token_expires_at: refreshTokenExpiresAt,
    scope,
    token_type,
  }

  const { data, error } = await supabase
    .from('ebay_tokens')
    .insert(row)
    .select(`
      id, app_user_id, ebay_user_id, state,
      access_token_expires_at, refresh_token_expires_at,
      token_type, created_at, updated_at
    `)
    .single()

  if (error) {
    console.error('❌ Supabase 插入錯誤：', error)
    throw error
  }

  console.log('✅ 已儲存使用者資料')
  return data
}