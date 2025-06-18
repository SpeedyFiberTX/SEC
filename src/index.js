// 套件
import dotenv from 'dotenv'; //處理.env 環境變數
import express from 'express';

import syncInventoryByEcount from './usecases/syncInventoryByEcount.js';
import scheduleInventorySync from './jobs/inventorySyncJob.js';
import inventorySyncRoute from './routes/inventorySyncRoute.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(inventorySyncRoute);

// 伺服器啟動時就馬上執行一次
(async () => {
  console.log(`伺服器啟動：開始同步 Ecount → Shopify`);
  try {
              const response = await syncInventoryByEcount();
              console.log('✅ 同步完成');
              console.log(`成功執行 ${response.successCount} 個更新，Ecount 總計 ${response.totalCount} 個變體`)
  
              if (response.shopifyResult?.success === false) {
                  console.warn('⚠️ Shopify 寫入失敗');
                  if (response.shopifyResult.userErrors) {
                      console.table(response.shopifyResult.userErrors);
                  } else {
                      console.error(response.shopifyResult.error);
                  }
              } else {
                  const changes = response.shopifyResult?.changes || [];
                  console.log(`✅ 實際變更數量：${changes.length} 筆`);
                  if (changes.length > 0) {
                      console.table(changes);
                  }
              }
          } catch (err) {
              console.error('❌ 同步流程整體失敗', err.message);
          }
})();

// Ecount排程同步到Shopify
const job = scheduleInventorySync();

const server = app.listen(PORT, () =>
  console.log(`🚀 Server on http://localhost:${PORT}`)
);

['SIGINT', 'SIGTERM'].forEach(sig => {
  process.on(sig, () => {
    console.log(`📥 收到 ${sig} – 關閉排程與伺服器…`);
    job?.stop();                         // ← #3 停止 cron
    server.close(() => {
      console.log('✅ 伺服器已關閉');
      process.exit(0);
    });
  });
});