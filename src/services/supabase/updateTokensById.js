import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js'

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function updateTokensById(id, {
  accessToken,
  accessTokenExpiresAt,
}) {
  try {
    const { data, error } = await supabase
      .from('ebay_tokens')
      .update({
        access_token: accessToken,
        access_token_expires_at: accessTokenExpiresAt,
        updated_at: new Date().toISOString(), // 對應 NOW()
      })
      .eq('id', id) // WHERE id = $3
      .select('*')  // RETURNING *
      .single();    // 只回傳一筆

    if (error) {
      console.error("❌ Supabase 更新錯誤：", error);
      return null;
    }

    console.log("✅ 更新完成");
    return data;
  } catch (err) {
    console.error("❌ JS 錯誤：", err?.message || err);
    return null;
  }
}