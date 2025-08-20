import axios from "axios";

/**
 * eBay Fulfillment API - getOrders 範例
 * 官方文件: https://developer.ebay.com/api-docs/sell/fulfillment/resources/order/methods/getOrders
 */

async function getOrders() {
  try {
    // ⚠️ 這裡放你的 Access Token（User Token，不是 App ID）
    // 取得方式：在 eBay Developer Hub → User Tokens 頁面，登入賣家帳號後產生
    const ACCESS_TOKEN = "YOUR_USER_ACCESS_TOKEN_HERE";

    // 呼叫正式環境（Production）
    // 如果要測試 Sandbox，改成 https://api.sandbox.ebay.com
    const url = "https://api.sandbox.ebay.com/sell/fulfillment/v1/order";

    // 範例：只抓今天的訂單，可用 lastmodifieddate/creationdate 過濾
    const params = {
      filter:
        "creationdate:[2025-08-20T00:00:00.000Z..2025-08-20T23:59:59.000Z]",
      limit: 10, // 一次最多 200 筆
    };

    const response = await axios.get(url, {
      headers: {
        "Authorization": `Bearer ${ACCESS_TOKEN}`, // ⚠️ 這裡帶入 Token
        "Content-Type": "application/json",
      },
      params,
    });

    console.log("✅ 訂單資料：", JSON.stringify(response.data, null, 2));
  } catch (err) {
    console.error("❌ 呼叫 API 失敗：", err.response?.data || err.message);
  }
}

getOrders();