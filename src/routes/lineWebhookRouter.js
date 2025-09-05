// routes/webhook.js
import express from 'express';
import crypto from 'crypto';
import { lineClient, lineMiddleware } from '../line-config.js';

const router = express.Router();
const userId = process.env.LINE_USER_ID;

router.post('/', lineMiddleware, async (req, res) => {
  // 1) 先回 200，避免 LINE 判你逾時
  res.status(200).json({ status: 'ok' });

  // 2) 背景做 push（不阻塞回應）
  setImmediate(async () => {
    try {
      if (!userId) {
        console.warn('[push] LINE_USER_ID 未設定，略過推播');
        return;
      }

      console.log('使用者 ID:', userId);

      // ✅ messages 用「陣列」
      const messages = [
        { type: 'text', text: '哈囉 👋 這是直接傳給你的訊息！' }
      ];

      // ✅ 顯式帶合法的 Retry-Key（UUID v4）
      await lineClient.pushMessage(
        userId,
        messages,
        false, // notificationsDisabled
        { xLineRetryKey: crypto.randomUUID() } // 這個很關鍵
      );

      console.log('訊息已發送！');
    } catch (err) {
      console.error('發送失敗：', err?.response?.data ?? err);
    }
  });
});

export default router;