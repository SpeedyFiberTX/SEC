// services/stateSigner.js
import 'dotenv/config';
import crypto from 'crypto';

const SECRET = (process.env.EBAY_STATE_SECRET ?? '').trim();
if (!SECRET) throw new Error('缺少 EBAY_STATE_SECRET');
const TTL_SEC = Number(process.env.EBAY_STATE_TTL_SEC ?? 900);

// base64url helper
function b64url(buf) {
  return Buffer.from(buf).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
function fromB64url(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  // pad
  while (str.length % 4) str += '=';
  return Buffer.from(str, 'base64').toString();
}

// 產生 state（可帶 userId 以便你之後綁定誰授權的）
export function createSignedState({ userId } = {}) {
  const payload = {
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + TTL_SEC,
    jti: crypto.randomUUID(),
    uid: userId ?? null,
  };
  const payloadStr = JSON.stringify(payload);
  const sig = crypto.createHmac('sha256', SECRET).update(payloadStr).digest('base64');
  return `${b64url(payloadStr)}.${b64url(sig)}`;
}

export function verifySignedState(state) {
  if (!state || typeof state !== 'string' || !state.includes('.')) {
    throw new Error('state 格式錯誤');
  }
  const [payloadB64, sigB64] = state.split('.');
  const payloadStr = fromB64url(payloadB64);
  const expected = crypto.createHmac('sha256', SECRET).update(payloadStr).digest('base64');
  const ok = (fromB64url(sigB64) === expected);
  if (!ok) throw new Error('state 簽章不符');

  const payload = JSON.parse(payloadStr);
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && now > payload.exp) throw new Error('state 已逾時');
  return payload; // 回傳 { iat, exp, jti, uid }
}
