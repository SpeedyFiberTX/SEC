import express from 'express';
import crypto from 'crypto';
import handleShopifyOrder from '../usecases/handleShopifyOrder.js';

const router = express.Router();

router.post(
  '/webhook/orders/create',
  express.raw({ type: 'application/json', limit: '2mb' }),
  async (req, res) => {
    const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
    if (!secret) {
      console.error('❌ SHOPIFY_WEBHOOK_SECRET 未設置');
      return res.status(500).send('Server misconfigured');
    }

    const hmacHeader = req.headers['x-shopify-hmac-sha256'] || req.get('X-Shopify-Hmac-Sha256');
    if (!hmacHeader) {
      console.warn('❌ 缺少 HMAC Header');
      return res.status(400).send('Missing HMAC header');
    }

    const rawBody = req.body;          // Buffer
    const hash = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('base64');

    const isValid =
      Buffer.byteLength(hash) === Buffer.byteLength(hmacHeader) &&
      crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(hmacHeader));

    if (!isValid) {
      console.warn('❌ HMAC 驗證失敗，Webhook 拒絕處理');
      return res.status(401).send('Unauthorized');
    }

    // 先回 200，避免 Shopify 重送
    res.status(200).send('OK');

    // 非同步處理
    try {
      const order = JSON.parse(rawBody.toString('utf8'));
      console.log('✅ Webhook 收到訂單：', order.id);
      await handleShopifyOrder(order);
    } catch (err) {
      console.error('❌ 處理訂單失敗', err);
    }
  }
);

export default router;
