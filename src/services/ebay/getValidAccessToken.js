import "dotenv/config";
import getTokenRowByState from "../supabase/getTokenRowByState.js";
import updateTokensById from "../supabase/updateTokensById.js";
import { refreshAccessToken } from "./refreshAccessToken.js";

const SCOPES = process.env.EBAY_SCOPES;
const SKEW_MS = 5 * 60 * 1000; // 提前 5 分鐘續期

export async function getValidAccessTokenByState(state) {

  try {
    // 取得 database 已儲存的資料
    const row = await getTokenRowByState(state);
    if (!row) throw new Error("No token row for this state");

    const now = Date.now();

    // 先看 access token 是否尚未過期（加上緩衝）
    const accessExp = new Date(row.access_token_expires_at).getTime();
    if (Number.isFinite(accessExp) && now < accessExp - SKEW_MS) {
      return row.access_token; // 直接用現有的
    }

    // 3) access token 要續期 → 檢查 refresh token 是否還有效（加上緩衝）
    const refreshExp = new Date(row.refresh_token_expires_at).getTime();
    if (!row.refresh_token || !Number.isFinite(refreshExp) || now >= refreshExp - SKEW_MS) {
      // 沒有 refresh token 或已過期 → 需要重走授權
      throw new Error("Refresh token expired or missing. Re-auth required.");
    }


    // 更新 access token
    const data = await refreshAccessToken(row.refresh_token, SCOPES);
    const { access_token, expires_in } = data;
    const accessTokenExpiresAt = new Date(now + Number(expires_in) * 1000);

    //存入DB 
    await updateTokensById(row.id, {
      accessToken: access_token,
      accessTokenExpiresAt,
    });


    return access_token;


  } catch (err) {
    console.log(err?.response?.data || err.message)
  }

}