import axios from "axios";

/** ====== 超輕量 Token Bucket 限速器（2 rps / burst 2）====== */
const RATE = 2;   // 每秒補 2 個 token
const BURST = 2;  // 最大桶子容量 2
let tokens = BURST;
let lastRefill = Date.now();

function refillTokens() {
  const now = Date.now();
  const elapsed = (now - lastRefill) / 1000;
  lastRefill = now;
  tokens = Math.min(BURST, tokens + elapsed * RATE);
}

async function acquireToken() {
  while (true) {
    refillTokens();
    if (tokens >= 1) {
      tokens -= 1;
      return; // 取得 token，放行
    }
    // 算一下大概要等多久（避免 busy wait）
    const deficit = 1 - tokens;
    const waitMs = Math.max(100, Math.ceil((deficit / RATE) * 1000));
    await sleep(waitMs);
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** ====== 指數退避重試（支援 Retry-After）====== */
async function requestWithRetry(fn, { tries = 6, baseDelayMs = 1000, maxDelayMs = 60000 } = {}) {
  let delay = baseDelayMs;

  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (err) {
      const status = err.response?.status;
      const retryAfter = Number(err.response?.headers?.["retry-after"]);
      if (status === 429 || status === 503) {
        const waitMs = Number.isFinite(retryAfter) ? retryAfter * 1000 : delay;
        console.warn(`[SP-API] throttled (status=${status}), wait ${waitMs}ms`);
        await sleep(waitMs);
        delay = Math.min(delay * 2, maxDelayMs);
        continue;
      }
      throw err; // 其他錯誤直接拋出
    }
  }
  throw new Error("SP-API throttled too many times; abort.");
}

/** ====== 產 x-amz-date ====== */
function amzDate(date = new Date()) {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, "");
}

export default async function getInventorySummaries(access_token) {
  try {
    const endpoint = "https://sellingpartnerapi-na.amazon.com";
    const url = `${endpoint}/fba/inventory/v1/summaries`;
    const MARKETPLACE_ID = "ATVPDKIKX0DER";

    let allSummaries = [];
    let nextToken = null;
    let page = 0;

    do {
      page++;

      const params = {
        granularityType: "Marketplace",
        granularityId: MARKETPLACE_ID,
        marketplaceIds: MARKETPLACE_ID,
        details: true,
      };
      if (nextToken) params.nextToken = nextToken;

      const headers = {
        host: "sellingpartnerapi-na.amazon.com",
        "x-amz-access-token": access_token,
        "x-amz-date": amzDate(),
        "Content-Type": "application/json",
        "User-Agent": "Inventory & Order Sync/1.0",
      };

      // 🔒 每次發請求前先取得 token（符合 2 rps / burst 2）
      await acquireToken();

      // 🔁 包一層重試：遇到 429/503 會依 Retry-After 或指數退避再試
      const res = await requestWithRetry(
        () => axios.get(url, { params, headers, timeout: 30000 })
      );

      // （可選）印出 Amazon 回傳的限速資訊，方便診斷
      const h = res.headers || {};
      if (h["x-amzn-ratelimit-limit"] || h["x-amzn-ratelimit-remaining"] || h["x-amzn-ratelimit-reset"]) {
        console.log(`[SP-API] limit=${h["x-amzn-ratelimit-limit"]} remaining=${h["x-amzn-ratelimit-remaining"]} reset=${h["x-amzn-ratelimit-reset"]}`);
      }

      const payload = res.data?.payload ?? {};
      if (Array.isArray(payload.inventorySummaries)) {
        allSummaries = allSummaries.concat(payload.inventorySummaries);
      }

      nextToken = res.data?.pagination?.nextToken ?? null;

      console.log(
        `Page ${page} fetched. Total: ${allSummaries.length}${nextToken ? " (has more…)" : " (done)"}`
      );

      // （可選）保險起見：即使拿到 token，也讓每頁之間至少間隔 100~200ms
      // await sleep(150);

    } while (nextToken);

    return { MARKETPLACE_ID, allSummaries };

  } catch (err) {
    console.error(
      "getInventorySummaries error:",
      err?.response?.data || err.message
    );
  }
}
