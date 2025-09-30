import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js'

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function getTokenRowByState(state) {
  try {
    const { data, error } = await supabase
      .from('ebay_tokens')
      .select(
        `id, app_user_id, ebay_user_id, state,
         access_token, access_token_expires_at,
         refresh_token, refresh_token_expires_at,
         scope, token_type, created_at, updated_at`
      )
      .eq('state', state)   // WHERE state = $1
      .order('id', { ascending: false }) // ORDER BY id DESC
      .limit(1);            // LIMIT 1

    if (error) {
      console.error("❌ Supabase 查詢錯誤：", error);
    } else {
      console.log("✅ 查詢成功");
      return data[0];
    }
  } catch (err) {
    console.error("❌ JS 錯誤：", err?.message || err);
  }
}