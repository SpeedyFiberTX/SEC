// routes/ebayAuthRoute.js
import express from 'express';
import {
  buildConsentUrl,
  exchangeCodeForUserToken,
  ensureUserAccessToken,
  tokenStore,
} from '../services/ebayAuth.js';
import { createSignedState, verifySignedState } from '../services/ebay/stateSigner.js';

const router = express.Router();

// 可選：防重放，一次性使用清單（正式環境建議改 Redis）
const usedJti = new Set();
const USED_TTL_MS = (Number(process.env.EBAY_STATE_TTL_SEC ?? 900) + 60) * 1000;

// 產生授權連結：可傳 userId 綁定到你系統的使用者
// e.g. GET /ebay/connect?userId=abc123
router.get('/connect', (req, res) => {
  try {
    const userId = req.query.userId || null;
    const state = createSignedState({ userId });

    // 把我們簽好的 state 放進 eBay 授權 URL
    const { url } = buildConsentUrl({ state });
    res.json({ ok: true, url, state });
  } catch (err) {
    res.status(500).json({ ok: false, message: String(err?.message || err) });
  }
});

// eBay 回呼
router.get('/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code || !state) return res.status(400).send('缺少 code 或 state');

    // 驗證「簽名 state」
    const payload = verifySignedState(state); // 會丟錯就被 catch
    if (usedJti.has(payload.jti)) {
      return res.status(400).send('state 已使用過，請重新連結流程');
    }
    // 標記為已用，TTL 到就移除（簡易作法）
    usedJti.add(payload.jti);
    setTimeout(() => usedJti.delete(payload.jti), USED_TTL_MS);

    // 兌換 user token
    const token = await exchangeCodeForUserToken({ code });

    // TODO：把 token 與 payload.uid 綁定存 DB
    // e.g. await saveEbayTokens({ userId: payload.uid, ...token })

    res.status(200).send(`
      <h3>eBay 綁定成功 🎉</h3>
      <p>User: ${payload.uid ?? '(未提供)'}</p>
      <p>access_token 將於 ${Math.round((token.accessTokenExpAt - Date.now())/1000)} 秒後到期。</p>
      <p>refresh_token 已保存（示範：記在記憶體），請改為你的資料庫。</p>
    `);
  } catch (err) {
    console.error('[ebay/callback] state 驗證失敗或逾時：', err);
    res.status(400).send(`state 驗證失敗或逾時，請重試連結流程`);
  }
});

// 測試用
router.get('/demo/me', async (req, res) => {
  try {
    const accessToken = await ensureUserAccessToken();
    res.json({ ok: true, tokenPreview: accessToken?.slice(0, 24) + '...', tokenMeta: tokenStore.get() });
  } catch (err) {
    res.status(401).json({ ok: false, message: String(err?.message || err) });
  }
});

export default router;
