// 套件
import dotenv from 'dotenv';
import express from 'express';

import inventorySyncRoute from './routes/inventorySyncRoute.js';     // Ecount → Shopify
import shopifyWebhookRoute from './routes/shopifyWebhookRoute.js';
import FBA_SyncRoute from './routes/FBA_SyncRoute.js';               // FBA → Ecount
import AmazonOrder_notion from './routes/AmazonOrder_notion.js'

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// 1) Webhook 需要 raw body（在路由前）
app.use(
  '/webhook/orders/create',
  express.raw({ type: 'application/json', limit: '2mb' })
);

// 2) 掛上 Webhook 路由（內部應該處理 /webhook/orders/create）
app.use(shopifyWebhookRoute);

// 3) 其他 API 使用 JSON body
app.use(express.json());

// 4) 同步任務路由（用 base path 隔離）
app.use('/webhook', webhookRouter); //line bot 
app.use('/jobs/amazon-ecount', FBA_SyncRoute);      // FBA → Ecount
app.use('/jobs/ecount-shopify', inventorySyncRoute); // Ecount → Shopify
app.use('/jobs/amazon-order', AmazonOrder_notion); //Amazon order → notion

app.listen(PORT, () => {
  console.log(`🚀 Server on http://localhost:${PORT}`);
});
