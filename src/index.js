// 套件
import dotenv from 'dotenv';
import express from 'express';

// import inventorySyncRoute from './routes/inventorySyncRoute.js';     // Ecount → Shopify
// import FBA_SyncRoute from './routes/FBA_SyncRoute.js';               // FBA → Ecount
import inventorySyncAmazonShopifyEcountRoute from './routes/inventorySyncAmazonShopifyEcountRoute.js';
import shopifyWebhookRoute from './routes/shopifyWebhookRoute.js';
import AmazonOrder_notion from './routes/AmazonOrder_notion.js';
import lineWebhookRouter from './routes/lineWebhookRouter.js';
import ebayAuthRoute from './routes/ebayAuthRoute.js';
import eBayNotificationsRoute from './routes/eBayNotificationsRoute.js'
import ebayOrderRoute from './routes/ebayOrderRoute.js'
import './routes/callGPTtime.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Shopify Webhook 需要 raw JSON（只給這條路徑）
app.use('/webhook/orders/create',
  express.raw({ type: 'application/json', limit: '2mb' })
);
app.use(shopifyWebhookRoute); // 內部請只處理 /webhook/orders/create

// LINE Webhook 同樣要 raw，但 LINE 可能發各種 content-type，保險用 */*
app.use('/line-webhook', express.raw({ type: '*/*' }));
app.use('/line-webhook', lineWebhookRouter);

// （選擇性）專抓 LINE 驗簽錯誤，避免 Verify 認為掛掉
app.use('/line-webhook', (err, req, res, next) => {
  console.error('[LINE Webhook Error]', err?.message, err);
  return res.sendStatus(200);
});

// eBay Notifications
app.use('/ebay/notifications',eBayNotificationsRoute);

// 其他 API 使用 JSON body
app.use(express.json());

// 同步任務路由（用 base path 隔離）
// app.use('/jobs/amazon-ecount', FBA_SyncRoute);      // FBA → Ecount
// app.use('/jobs/ecount-shopify', inventorySyncRoute); // Ecount → Shopify
app.use('jobs/syncInventory',inventorySyncAmazonShopifyEcountRoute) //合併 Amazon Shopify Ecount 庫存邏輯
app.use('/jobs/amazon-order', AmazonOrder_notion); //Amazon order → notion
app.use('/jobs/ebay-order', ebayOrderRoute); //eBay order → notion、Line
app.use('/ebay', ebayAuthRoute);

app.listen(PORT, () => {
  console.log(`🚀 Server on http://localhost:${PORT}`);
});
