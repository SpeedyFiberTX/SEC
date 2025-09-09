// services/ebayAuth.js
import 'dotenv/config';
import crypto from 'crypto';

const EBAY_ENV = (process.env.EBAY_ENV || 'SANDBOX').toUpperCase();
const isSandbox = EBAY_ENV === 'SANDBOX';

const AUTH_URL = isSandbox
  ? 'https://auth.sandbox.ebay.com/oauth2/authorize'
  : 'https://auth.ebay.com/oauth2/authorize';

const TOKEN_URL = isSandbox
  ? 'https://api.sandbox.ebay.com/identity/v1/oauth2/token'
  : 'https://api.ebay.com/identity/v1/oauth2/token';

const CLIENT_ID = (process.env.EBAY_CLIENT_ID ?? '').trim();
const CLIENT_SECRET = (process.env.EBAY_CLIENT_SECRET ?? '').trim();
const RUNAME = (process.env.EBAY_RU_NAME ?? '').trim();

// 你需要哪些 API，就把 scope 放進 .env 的 EBAY_SCOPES，以空白分隔
const DEFAULT_SCOPES = (process.env.EBAY_SCOPES ?? 'https://api.ebay.com/oauth/api_scope').trim();

// ====== Demo 用的簡單 Token Store（請換成 DB）======
const memoryStore = {
  // keyed by userId（或你的賣家識別符），這裡為示範只存一份
  user: {
    accessToken: null,
    accessTokenExpAt: 0,      // ms timestamp
    refreshToken: null,
    refreshTokenExpAt: 0,     // ms timestamp
    scopes: DEFAULT_SCOPES.split(' '),
  }
};
// ==================================================

export function buildConsentUrl({ state } = {}) {
  if (!CLIENT_ID || !RUNAME) {
    throw new Error('缺少 EBAY_CLIENT_ID / EBAY_RU_NAME');
  }
  const _state = state || crypto.randomUUID();
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: RUNAME,        // 注意：這裡是 RuName 字串
    response_type: 'code',
    scope: DEFAULT_SCOPES,
    state: _state,
  });
  return { url: `${AUTH_URL}?${params.toString()}`, state: _state };
}

export async function exchangeCodeForUserToken({ code }) {
  if (!CLIENT_ID || !CLIENT_SECRET || !RUNAME) {
    throw new Error('缺少 EBAY_CLIENT_ID / EBAY_CLIENT_SECRET / EBAY_RU_NAME');
  }
  const basic = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');

  const body = new URLSearchParams();
  body.set('grant_type', 'authorization_code');
  body.set('code', code);             // 直接帶回來的 code，不要再 encode
  body.set('redirect_uri', RUNAME);   // 必須與 authorize 時一致（RuName）

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`[exchangeCodeForUserToken] ${res.status} ${text}`);
  }
  const data = JSON.parse(text);

  // 計算過期時間（毫秒）
  const now = Date.now();
  const accessExpAt  = now + (Number(data.expires_in || 7200) * 1000);
  const refreshExpAt = now + (Number(data.refresh_token_expires_in || 0) * 1000);

  // 存到簡易 store（請換成 DB，並與你的 userId 關聯）
  memoryStore.user.accessToken = data.access_token;
  memoryStore.user.accessTokenExpAt = accessExpAt;
  memoryStore.user.refreshToken = data.refresh_token;
  memoryStore.user.refreshTokenExpAt = refreshExpAt;
  memoryStore.user.scopes = DEFAULT_SCOPES.split(' ');

  return {
    accessToken: data.access_token,
    accessTokenExpAt: accessExpAt,
    refreshToken: data.refresh_token,
    refreshTokenExpAt: refreshExpAt,
    tokenType: data.token_type, // "User Access Token"
    scope: data.scope,
  };
}

export async function refreshUserToken() {
  const user = memoryStore.user;
  if (!user?.refreshToken) throw new Error('尚未綁定使用者 refresh_token');

  const basic = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');

  const body = new URLSearchParams();
  body.set('grant_type', 'refresh_token');
  body.set('refresh_token', user.refreshToken);
  body.set('scope', user.scopes.join(' '));

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`[refreshUserToken] ${res.status} ${text}`);
  }
  const data = JSON.parse(text);
  const now = Date.now();
  memoryStore.user.accessToken = data.access_token;
  memoryStore.user.accessTokenExpAt = now + (Number(data.expires_in || 7200) * 1000);

  return {
    accessToken: data.access_token,
    accessTokenExpAt: memoryStore.user.accessTokenExpAt,
  };
}

// 提供一個保證可用的 user access token（快過期就自動 refresh）
export async function ensureUserAccessToken() {
  const user = memoryStore.user;
  if (!user?.accessToken) throw new Error('尚未完成授權碼流程，沒有 user access token');

  const now = Date.now();
  // 提前 60 秒續期
  if (now >= (user.accessTokenExpAt - 60_000)) {
    await refreshUserToken();
  }
  return memoryStore.user.accessToken;
}

// 你之後可以把這個換成 DB 版（以你的 userId 當 key）
export const tokenStore = {
  get: () => memoryStore.user,
  clear: () => {
    memoryStore.user.accessToken = null;
    memoryStore.user.refreshToken = null;
    memoryStore.user.accessTokenExpAt = 0;
    memoryStore.user.refreshTokenExpAt = 0;
  }
};
