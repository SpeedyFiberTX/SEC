// routes/ebayAuthRoute.js
import express from 'express';
import crypto from 'crypto';
import {
  buildConsentUrl,
  exchangeCodeForUserToken,
  ensureUserAccessToken,
  tokenStore,
} from '../services/ebayAuth.js';

const router = express.Router();

// In-memory anti-CSRF state（實務上請用 session/redis）
const stateCache = new Map();  // state -> createdAt(ms)
const STATE_TTL_MS = 5 * 60 * 1000;

// 產生授權連結（前端可以直接打這支 API，拿到 URL 後導向）
router.get('/connect', (req, res) => {
  try {
    const state = crypto.randomUUID();
    const { url } = buildConsentUrl({ state });
    stateCache.set(state, Date.now());
    res.json({ ok: true, url, state });
  } catch (err) {
    res.status(500).json({ ok: false, message: String(err?.message || err) });
  }
});

// eBay 回呼（請到 eBay Dev Portal 把 RuName 指到這支路由的對應網址）
// 注意：真正的 redirect_uri 是 RuName 字串，eBay 會把使用者導回 RuName 設定的 URL
router.get('/callback', async (req, res) => {
  try {
    const { code, state, expires_in } = req.query;

    // 驗證 state
    const ts = stateCache.get(state);
    stateCache.delete(state);
    if (!ts || (Date.now() - ts) > STATE_TTL_MS) {
      return res.status(400).send('state 驗證失敗或逾時，請重試連結流程');
    }

    if (!code) {
      return res.status(400).send('缺少 code');
    }

    const token = await exchangeCodeForUserToken({ code });

    // 你可以在這裡 redirect 到前端頁面，或直接顯示綁定成功
    res.status(200).send(`
      <h3>eBay 綁定成功 🎉</h3>
      <p>access_token 將於 ${Math.round((token.accessTokenExpAt - Date.now())/1000)} 秒後到期。</p>
      <p>refresh_token 已保存（示範：記在記憶體），請改為你的資料庫。</p>
    `);
  } catch (err) {
    console.error('[ebay/callback] Error:', err);
    res.status(500).send(`綁定失敗：${String(err?.message || err)}`);
  }
});

// 範例：之後要呼叫賣家相關 API 前，先確保 access_token 可用
router.get('/demo/me', async (req, res) => {
  try {
    const accessToken = await ensureUserAccessToken();
    // 這裡只是示範；你可以改成呼叫 Sell Fulfillment API / Inventory API 等等
    res.json({
      ok: true,
      usingAccessToken: accessToken ? 'Yes' : 'No',
      tokenMeta: tokenStore.get(),
    });
  } catch (err) {
    res.status(401).json({ ok: false, message: String(err?.message || err) });
  }
});

export default router;
