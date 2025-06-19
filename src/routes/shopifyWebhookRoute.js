import express from 'express';
import crypto from 'crypto';
import handleShopifyOrder from '../usecases/handleShopifyOrder.js';

const router = express.Router();

// 重要！使用 raw body 處理，才能驗證 HMAC
router.post(
  '/webhook/orders/create',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const hmacHeader = req.get('X-Shopify-Hmac-Sha256');
    const body = req.body.toString('utf8');
    const secret = process.env.SHOPIFY_WEBHOOK_SECRET;

    // 計算 HMAC
    const hash = crypto
      .createHmac('sha256', secret)
      .update(body, 'utf8')
      .digest('base64');

    // 驗證是否一致
    if (hash !== hmacHeader) {
      console.warn('❌ HMAC 驗證失敗，Webhook 拒絕處理');
      return res.status(401).send('Unauthorized');
    }

    // ✅ 驗證成功，先回應 200，避免 Shopify 認為失敗
    res.status(200).send('OK');

    // 然後非同步處理 webhook
    try {
      const order = JSON.parse(body);
      console.log('✅ Webhook 收到訂單：', order.id);
      await handleShopifyOrder(order);
    } catch (err) {
      console.error('❌ 處理訂單失敗', err.message);
    }
  }
);

export default router;