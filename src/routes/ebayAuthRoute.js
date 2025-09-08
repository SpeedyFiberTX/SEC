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

// 1) 前往 eBay 同意頁
router.get('/authorize', (req, res) => {
  const url = oauth.generateUserAuthorizationUrl(EBAY_ENV, scopes, {
    prompt: 'login',
    state: `ebay-${Date.now()}`
  });
  return res.redirect(url);
});

// 2) eBay 回呼（請在 Sign-in Settings 的 Accepted URL 設為 https://你的網域/ebay/callback）
router.get('/callback', async (req, res) => {
  try {
    const code = req.query.code;
    if (!code) return res.status(400).send('Missing ?code');

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
