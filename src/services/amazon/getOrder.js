import axios from "axios";
import getAccessToken from "./login.js";

async function getOrders() {
    try {


        const access_token = await getAccessToken();

        if (access_token) {
            const endpoint = "https://sellingpartnerapi-na.amazon.com"; // 依地區改 NA/EU/FE sandbox https://sandbox.sellingpartnerapi-na.amazon.com
            const url = `${endpoint}/orders/v0/orders`;

            const params = {
                MarketplaceIds: "ATVPDKIKX0DER",  // US Marketplace Id，sandbox 測試用
                CreatedAfter: new Date(Date.now() - 24*60*60*1000).toISOString(), // 取近 24h 訂單
            };

            const headers = {
                "host": "sellingpartnerapi-na.amazon.com",
                "x-amz-access-token": access_token,
                "x-amz-date":new Date().toISOString().replace(/[:-]|\.\d{3}/g, ''),
                "Content-Type": "application/json",
                "User-Agent": "Inventory & Order Sync/1.0",
            };

            const res = await axios.get(url, { params, headers });

            console.log(JSON.stringify(res.data));
        }


    } catch (err) {
        console.error("Error calling SP-API:", err.response?.data || err.message);
    }
}

getOrders();
