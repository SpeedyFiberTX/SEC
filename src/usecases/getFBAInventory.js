// API
import getAccessToken from "../services/amazon/login.js";
import getInventorySummaries from "../services/amazon/getInventorySumaries_rateLimits.js";

export default async function getFBAInventory() {

    try {
        // 登入取得 ACCESS TOKEN
        const access_token = await getAccessToken();
        if (!access_token) {
            console.log("access_token 不存在");
            return;
        }


        // 如果有取得 TOKEN 就執行
        const { allSummaries = [] } = await getInventorySummaries(access_token); //取得 FBA 品項與庫存數量，如果沒取到就會是空陣列

        return allSummaries;

    } catch (err) {
        console.error("取得 FBA 庫存失敗", err.response?.data || err.message);
    }
}