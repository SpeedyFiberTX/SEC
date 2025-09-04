import dotenv from 'dotenv';
import cron from 'node-cron';
import express from 'express';
import handleAmazonOrder from '../workflow/handleAmazonOrder.js';

dotenv.config();

const router = express.Router();
let isRunning = false; // 防止重疊執行

// ✅ 手動觸發（POST /jobs/amazon-order/sync）
router.post('/sync', async (req, res) => {
  const secret = req.headers['x-api-key'];
  if (secret !== process.env.RUN_AMAZON_ORDER_SECRET) {
    return res.status(403).json({ ok: false, message: 'Forbidden' });
  }

  if (isRunning) {
    return res.status(429).json({ ok: false, message: '上一輪同步尚未結束，請稍後再試' });
  }

  isRunning = true;
  try {
    await handleAmazonOrder();
    res.json({ ok: true, message: '✅ Amazon 訂單同步成功' });
  } catch (err) {
    res.status(500).json({ ok: false, message: `同步失敗：${err.message}` });
  } finally {
    isRunning = false;
  }
});

// 🕒 每天早上 8 點自動執行（台灣時間）
cron.schedule(
  '15 8 * * *',
  async () => {
    if (isRunning) {
      console.warn('⏳ 上一輪同步尚未結束，略過本次排程。');
      return;
    }

    isRunning = true;
    const ts = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
    console.log(`🕒 ${ts} 自動執行 handleAmazonOrder`);

    try {
      await handleAmazonOrder();
      console.log('✅ 自動同步完成');
    } catch (err) {
      console.error('❌ 自動同步失敗', err.message);
    } finally {
      isRunning = false;
    }
  },
  { timezone: 'Asia/Taipei' }
);

export default router;