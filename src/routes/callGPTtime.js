import cron from "node-cron";
import callGPT from "../workflow/callGPT.js"; 

// 台灣時區為 UTC+8
const timeZone = "Asia/Taipei";

cron.schedule("7 17 * * 5", async () => {
  console.log("[CRON] 週五 17:00 執行 callGPT()");
  const prompt = "今天星期五，請提醒大家倒垃圾";
  try {
    const result = await callGPT(prompt);
    if (result.ok) console.log("[CRON] ✅ callGPT 執行成功");
    else console.warn("[CRON] ⚠️ callGPT 執行失敗");
  } catch (err) {
    console.error("[CRON] ❌ 錯誤：", err);
  }
}, { timezone: timeZone });
