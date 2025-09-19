import dotenv from 'dotenv';
import cron from 'node-cron';
import express from 'express';
import handleEBayOrder from '../workflow/handleEBayOrder.js';
import pushMessageToDeveloper from '../services/line/pushMessageToDeveloper.js'

dotenv.config();

const router = express.Router();
let isRunning = false; // 防止重疊執行

// ✅ 手動觸發（POST /jobs/ebay-order/sync）
router.post('/sync', async (req, res) => {
  const secret = req.headers['x-api-key'];
  if (secret !== process.env.RUN_EBAY_ORDER_SECRET) {
    return res.status(403).json({ ok: false, message: 'Forbidden' });
  }

  if (isRunning) {
    return res.status(429).json({ ok: false, message: '上一輪同步尚未結束，請稍後再試' });
  }

  isRunning = true;
  try {
    await handleEBayOrder();
    res.json({ ok: true, message: '✅ eBay 訂單同步成功' });
  } catch (err) {
    res.status(500).json({ ok: false, message: `同步失敗：${err.message}` });
  } finally {
    isRunning = false;
  }
});

// 🕒 每天早上 7 點 15 分自動執行（台灣時間）
cron.schedule(
  '15 7 * * *',
  async () => {
    if (isRunning) {
      console.warn('⏳ 上一輪同步尚未結束，略過本次排程。');
      return;
    }

    isRunning = true;
    const ts = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
    console.log(`🕒 ${ts} 自動執行 handleEBayOrder`);

    try {
      await handleEBayOrder();
      console.log('✅ 自動同步完成');
    } catch (err) {
      console.error('❌ 自動同步失敗', err.message);

      try {
        await pushMessageToDeveloper(`❌ eBay 自動同步失敗，請至 Render 查看 log`);
      } catch (notifyErr) {
        console.error('❌ 發送失敗通知時出錯', notifyErr?.message || notifyErr);
      }

    } finally {
      isRunning = false;
    }
  },
  { timezone: 'Asia/Taipei' }
);

export default router;