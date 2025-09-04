import axios from "axios";
import fs from "fs";
import getAccessToken from "./login.js";

function amzDate(date = new Date()) {
  // 產 x-amz-date 格式：YYYYMMDDTHHMMSSZ
  return date.toISOString().replace(/[:-]|\.\d{3}/g, "");
}

async function getInventorySummaries() {
  try {
    const access_token = await getAccessToken();
    if (!access_token) throw new Error("No access token");

    const endpoint = "https://sellingpartnerapi-na.amazon.com";
    const url = `${endpoint}/fba/inventory/v1/summaries`;
    const MARKETPLACE_ID = "ATVPDKIKX0DER";

    const params = {
      granularityType: "Marketplace",
      granularityId: MARKETPLACE_ID,
      marketplaceIds: MARKETPLACE_ID, // 字串 OK
      details: true,
      // nextToken:""
    };

    const headers = {
      host: "sellingpartnerapi-na.amazon.com",
      "x-amz-access-token": access_token,
      "x-amz-date": amzDate(),
      "Content-Type": "application/json",
      "User-Agent": "Inventory & Order Sync/1.0",
    };

    const res = await axios.get(url, { params, headers, timeout: 30000 });

    // 儲存成 JSON 檔案
    const filePath = "./inventory4.json";
    fs.writeFileSync(filePath, JSON.stringify(res.data, null, 2), "utf-8");

    console.log(`✅ Inventory data saved to ${filePath}`);


  } catch (err) {
    console.error(
      "getInventorySummaries error:",
      err?.response?.data || err.message
    );
  }
}

getInventorySummaries();
