// routes/shopifyWebhookRoute.js
import { Router } from 'express';
import crypto from 'crypto';
import handleShopifyOrder from '../usecases/handleShopifyOrder.js';

const router = Router();

// 這裡路徑跟 index.js 掛 raw middleware 的路徑保持一致
router.post('/webhook/orders/create', async (req, res) => {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  if (!secret) {
    console.error('❌ SHOPIFY_WEBHOOK_SECRET 未設置');
    return res.status(500).send('Server misconfigured');
  }

  const hmacHeader = req.headers['x-shopify-hmac-sha256'];
  if (!hmacHeader) {
    console.warn('❌ 缺少 HMAC Header');
    return res.status(400).send('Missing HMAC header');
  }

  // req.body 此時仍是 Buffer（因為 index.js 先掛了 express.raw）
  const digest = crypto
    .createHmac('sha256', secret)
    .update(req.body)
    .digest('base64');

  const valid = crypto.timingSafeEqual(
    Buffer.from(digest, 'utf8'),
    Buffer.from(hmacHeader, 'utf8')
  );

  if (!valid) {
    console.warn('❌ HMAC 驗證失敗，Webhook 拒絕處理');
    return res.status(401).send('Unauthorized');
  }

  // 先快速回應，避免 Shopify 重送
  res.status(200).end('OK');

  // 非同步處理訂單
  try {
    const order = JSON.parse(req.body.toString('utf8'));
    console.log('✅ Webhook 收到訂單：', order.id);
    await handleShopifyOrder(order);
  } catch (err) {
    console.error('❌ 處理訂單失敗', err);
  }
});

export default router;
