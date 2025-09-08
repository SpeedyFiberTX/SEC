import express from 'express';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import dayjs from 'dayjs';
import { oauth, EBAY_ENV, EBAY_API_BASE, scopes } from '../services/ebay/oauthClient.js';

const router = express.Router();

// 建議把暫存檔集中到 .data 目錄
const TOKENS_FILE = path.join(process.cwd(), '.data', 'ebay-tokens.json');
fs.mkdirSync(path.dirname(TOKENS_FILE), { recursive: true });

function readTokens() {
  try { return JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf8')); }
  catch { return { accessToken: null, accessTokenExp: 0, refreshToken: null }; }
}
function saveTokens(obj) { fs.writeFileSync(TOKENS_FILE, JSON.stringify(obj, null, 2)); }

async function getUserAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  const t = readTokens();
  if (t.accessToken && t.accessTokenExp - 60 > now) return t.accessToken;

  if (!t.refreshToken) throw new Error('No refresh token. Please /ebay/authorize first.');

  const res = await oauth.getAccessToken(EBAY_ENV, t.refreshToken, scopes);
  const next = {
    ...t,
    accessToken: res.access_token,
    accessTokenExp: now + Number(res.expires_in || 7200)
  };
  saveTokens(next);
  return next.accessToken;
}

/* -------------------- 除錯端點 -------------------- */

// A) 環境變數是否真的被讀到
router.get('/envcheck', (req, res) => {
  const { EBAY_CLIENT_ID, EBAY_CLIENT_SECRET, EBAY_RU_NAME, EBAY_ENV: ENV } = process.env;
  res.json({
    EBAY_ENV: ENV,
    EBAY_CLIENT_ID_PREFIX: (EBAY_CLIENT_ID || '').slice(0, 8),
    EBAY_CLIENT_SECRET_LEN: (EBAY_CLIENT_SECRET || '').length,
    EBAY_RU_NAME
  });
});

// B) 試著拿 application token（不需使用者授權）
router.get('/debug', async (req, res) => {
  try {
    const baseScope = EBAY_ENV === 'SANDBOX'
      ? 'https://api.sandbox.ebay.com/oauth/api_scope'
      : 'https://api.ebay.com/oauth/api_scope';
    const appTok = await oauth.getApplicationToken(EBAY_ENV, baseScope);
    res.json({
      ok: true,
      application_token_sample: (appTok.access_token || '').slice(0, 24) + '...'
    });
  } catch (e) {
    res.status(500).json({
      ok: false,
      message: 'Application token failed',
      error: e?.response?.data || e?.message || String(e)
    });
  }
});

/* -------------------- OAuth 流程 -------------------- */

// 1) 前往 eBay 同意頁
router.get('/authorize', (req, res) => {
  const url = oauth.generateUserAuthorizationUrl(EBAY_ENV, scopes, {
    prompt: 'login',
    state: `ebay-${Date.now()}`
  });
  return res.redirect(url);
});

// 2) eBay 回呼（Accepted URL 設為 https://你的網域/ebay/callback）
router.get('/callback', async (req, res) => {
  try {
    const { EBAY_CLIENT_ID, EBAY_CLIENT_SECRET, EBAY_RU_NAME } = process.env;
    const q = req.query; // 👈 所有回傳參數
    const code = q.code;

    // 顯示 eBay 回來的所有參數（方便判讀 error / state）
    console.log('[ebay/callback] full query:', q);

    const missing = [];
    if (!EBAY_CLIENT_ID) missing.push('EBAY_CLIENT_ID');
    if (!EBAY_CLIENT_SECRET) missing.push('EBAY_CLIENT_SECRET');
    if (!EBAY_RU_NAME) missing.push('EBAY_RU_NAME (RuName)');
    if (!code) missing.push('query.code');

    if (missing.length) {
      // 若缺 code，但有 error，就直接顯示錯誤資訊
      if (!code && (q.error || q.error_description)) {
        return res
          .status(400)
          .send(`OAuth error: ${q.error} - ${q.error_description || ''}`);
      }
      console.error('[ebay/callback] missing:', missing);
      return res.status(400).send('Missing: ' + missing.join(', '));
    }

    console.log('[ebay/callback] ENV OK', {
      ENV: EBAY_ENV,
      CLIENT_ID_PREFIX: EBAY_CLIENT_ID.slice(0, 8),
      RU_NAME: EBAY_RU_NAME
    });

    const now = Math.floor(Date.now() / 1000);
    const data = await oauth.exchangeCodeForAccessToken(EBAY_ENV, code);

    saveTokens({
      accessToken: data.access_token,
      accessTokenExp: now + Number(data.expires_in || 7200),
      refreshToken: data.refresh_token,
      refreshTokenExp: now + Number(data.refresh_token_expires_in || 47304000)
    });

    res.send('eBay 授權成功 ✅，可呼叫 GET /ebay/orders 測試拉單。');
  } catch (err) {
    console.error('[ebay/callback]', err?.response?.data || err);
    res.status(500).send('Exchange token failed.');
  }
});

// 3) 測試：拉近 7 天訂單（Sandbox/Production 皆可）
router.get('/orders', async (req, res) => {
  try {
    const accessToken = await getUserAccessToken();
    const from = dayjs().subtract(7, 'day').toISOString();
    const filter = `lastmodifieddate:[${from}..]`;

    const resp = await axios.get(`${EBAY_API_BASE}/sell/fulfillment/v1/order`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { filter, limit: 20 }
    });

    res.json(resp.data);
  } catch (err) {
    console.error('[ebay/orders]', err?.response?.data || err);
    res.status(500).json(err?.response?.data || { message: err.message });
  }
});

export default router;
