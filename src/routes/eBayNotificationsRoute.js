import express from "express";
import bodyParser from "body-parser";
import crypto from "crypto";
import { XMLParser } from "fast-xml-parser";

const router = express.Router();

// eBay 憑證（環境變數）
// const DEVID = process.env.EBAY_DEVID ?? "";
// const APPID = process.env.EBAY_APPID ?? "";
// const CERTID = process.env.EBAY_CERTID ?? "";

// 建立一個共用 parser（保留屬性、大小寫、命名空間資訊）
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  preserveOrder: false,     // 用物件樹，方便遞迴搜尋
  trimValues: true,
});

/** 在整棵物件樹遞迴尋找某個 tag（忽略命名空間與大小寫） */
// function findTagValue(obj, wantedTagLower) {
//   if (!obj || typeof obj !== "object") return undefined;

//   for (const [key, val] of Object.entries(obj)) {
//     const baseKey = key.includes(":") ? key.split(":").pop() : key; // 去除 ns 前綴
//     if (baseKey.toLowerCase() === wantedTagLower) {
//       // val 可能是字串或物件（有時候會再包一層）
//       if (typeof val === "string") return val;
//       if (val && typeof val === "object") {
//         // 常見 SOAP：<Tag>value</Tag> 被解析成 { Tag: "value" } 或 { Tag: { "#text": "value" } }
//         if (typeof val["#text"] === "string") return val["#text"];
//         // 若再包一層，嘗試抓第一個字串
//         const sub = Object.values(val).find((v) => typeof v === "string");
//         if (typeof sub === "string") return sub;
//       }
//     }
//     // 遞迴子節點
//     if (val && typeof val === "object") {
//       const hit = findTagValue(val, wantedTagLower);
//       if (typeof hit === "string") return hit;
//     }
//   }
//   return undefined;
// }

/** eBay 簽章計算：MD5(DEVID + APPID + CERTID + eBayTime) → Base64 */
// function computeSignature(devId, appId, certId, ebayTime) {
//   const toHash = `${devId}${appId}${certId}${ebayTime}`;
//   const md5 = crypto.createHash("md5").update(toHash, "utf8").digest();
//   return Buffer.from(md5).toString("base64");
// }

/** eBayTime 新鮮度檢查（預設 10 分鐘） */
// function isFreshTimestamp(ebayTime, maxSkewMs = 10 * 60 * 1000) {
//   const t = Date.parse(ebayTime);
//   if (Number.isNaN(t)) return false;
//   return Math.abs(Date.now() - t) <= maxSkewMs;
// }

router.post("/notifications", bodyParser.text({ type: ["text/xml", "application/xml", "application/soap+xml"], limit: "1mb" }), async (req, res) => {
  try {
    if (!req.is("*/xml")) {
      // 只接受 XML/SOAP
      return res.status(415).send("Unsupported Media Type");
    }

    const xml = req.body ?? "";
    if (!xml) return res.status(400).send("Empty body");

    // 解析 XML → JS 物件
    const root = parser.parse(xml);
    // 在整棵樹中找 Timestamp & NotificationSignature（忽略 ns）
    // const ebayTime = findTagValue(root, "timestamp");
    // const signature = findTagValue(root, "notificationsignature");

    // if (!ebayTime || !signature) {
    //   // 這兩個欄位是驗證必要條件
    //   return res.status(400).send("Missing Timestamp or NotificationSignature");
    // }

    // 檢查時間新鮮度，避免重放攻擊
    // if (!isFreshTimestamp(ebayTime)) {
    //   console.warn("[eBay Notify] stale timestamp:", ebayTime);
    //   // 仍可回 200，避免 eBay 一直重送；並記錄異常
    //   // 也可以選擇 400 看你的策略
    // }

    // 計算期望簽章並比對
    // const expected = computeSignature(DEVID, APPID, CERTID, ebayTime);
    // if (expected !== signature) {
    //   console.warn("[eBay Notify] signature mismatch", { expected, got: signature });
    //   // 同上，通常仍建議回 200，並把內容記 Log/Queue 以免 eBay重送淹爆
    //   return res.status(400).send("Signature mismatch");
    // }

    // 走到這裡代表簽章驗證通過，可以安全處理事件內容
    // 你可以再抓事件名稱與 payload，例如：
    // const eventName = findTagValue(root, "eventname"); // 視實際 SOAP 結構
    // const payloadXml = xml; // 或者用 parser 把你要的 body 節點轉成物件

    // TODO: 在此處理業務邏輯（入庫、隊列、下游服務…）

    // eBay 只需要 200 OK 表示收妥
    console.log(JSON.stringify(root));
    return res.status(200).send("OK");
  } catch (err) {
    console.error("[eBay Notify] handle error:", err);
    // 500 會觸發 eBay 重送；如果你已經把通知寫入 Queue，考慮仍回 200 避免重送
    return res.status(500).send("Internal Server Error");
  }
});

export default router;
