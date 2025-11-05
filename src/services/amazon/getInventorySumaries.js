// 目前沒有使用
import axios from "axios";

function amzDate(date = new Date()) {
  // 產 x-amz-date 格式：YYYYMMDDTHHMMSSZ
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
        marketplaceIds: MARKETPLACE_ID, // 字串 OK
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

      const res = await axios.get(url, { params, headers, timeout: 30000 });
      const payload = res.data?.payload ?? {};

      if (Array.isArray(payload.inventorySummaries)) {
        allSummaries = allSummaries.concat(payload.inventorySummaries);
      }

      nextToken = res.data?.pagination?.nextToken ?? null;

      console.log(
        `Page ${page} fetched. Total records so far: ${allSummaries.length}${nextToken ? " (has more…)" : " (done)"
        }`
      );
    } while (nextToken);

    // 存成JSON檔方便對照：包含一些 metadata + 全部 summaries
    // const output = {
    //   fetchedAt: new Date().toISOString(),
    //   marketplaceId: MARKETPLACE_ID,
    //   count: allSummaries.length,
    //   inventorySummaries: allSummaries,
    // };

    // const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    // const filePath = `./inventory-${timestamp}.json`;

    // fs.writeFileSync(filePath, JSON.stringify(output, null, 2), "utf-8");
    // console.log(`✅ Inventory data saved to ${filePath}`);
    // JSON檔邏輯結束

    return { MARKETPLACE_ID, allSummaries }


  } catch (err) {
    console.error(
      "getInventorySummaries error:",
      err?.response?.data || err.message
    );
  }
}
