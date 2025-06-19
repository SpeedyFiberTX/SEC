// 套件
import dotenv from 'dotenv'; //處理.env 環境變數
import express from 'express';

import inventorySyncRoute from './routes/inventorySyncRoute.js';
import shopifyWebhookRoute from './routes/shopifyWebhookRoute.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(shopifyWebhookRoute);
app.use(inventorySyncRoute);

app.listen(PORT, () =>
  console.log(`🚀 Server on http://localhost:${PORT}`)
);