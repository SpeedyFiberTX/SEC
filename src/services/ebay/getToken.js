import 'dotenv/config';

/**
 * 取得 eBay Application Token（Client Credentials）
 * - SANDBOX：token URL 指向 sandbox，但 scope 直接用 prod 網域字串（較穩定）
 * - PRODUCTION：全部用 prod
 */
export async function getAppToken() {
  const EBAY_ENV = (process.env.EBAY_ENV || 'SANDBOX').toUpperCase();
  const isSandbox = EBAY_ENV === 'SANDBOX';

  const TOKEN_URL = isSandbox
    ? 'https://api.sandbox.ebay.com/identity/v1/oauth2/token'
    : 'https://api.ebay.com/identity/v1/oauth2/token';

  // 注意：Sandbox 環境下，實務上多數情況需使用「api.ebay.com」這串 scope 才會過
  const SCOPE = isSandbox
    ? 'https://api.ebay.com/oauth/api_scope'
    : 'https://api.ebay.com/oauth/api_scope';

  const clientId = (process.env.EBAY_CLIENT_ID ?? '').trim();
  const clientSecret = (process.env.EBAY_CLIENT_SECRET ?? '').trim();

  if (!clientId || !clientSecret) {
    throw new Error('缺少 EBAY_CLIENT_ID / EBAY_CLIENT_SECRET');
  }

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const body = new URLSearchParams();
  body.set('grant_type', 'client_credentials');
  body.set('scope', SCOPE);

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
    // 儘量回傳原始錯誤，方便除錯
    try {
      throw Object.assign(new Error('token_error'), {
        status: res.status,
        details: JSON.parse(text),
      });
    } catch {
      throw Object.assign(new Error('token_error'), {
        status: res.status,
        details: text,
      });
    }
  }

  const data = JSON.parse(text);
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
    tokenType: data.token_type, // "Application Access Token"
    env: EBAY_ENV,
  };
}
