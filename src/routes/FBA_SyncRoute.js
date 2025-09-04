import dotenv from 'dotenv';
import cron from 'node-cron';
import express from 'express';
import syncAmazonInventoryToEcount from '../workflow/syncAmazonInventoryToEcount.js';

dotenv.config();

const router = express.Router();
let isRunning = false; // 防止重疊執行

// ✅ 手動觸發（POST /jobs/amazon-ecount/sync）
router.post('/sync', async (req, res) => {
  const secret = req.headers['x-api-key'];
  if (secret !== process.env.RUN_INVENTORY_SYNC_SECRET) {
    return res.status(403).json({ ok: false, message: 'Forbidden' });
  }

  if (isRunning) {
    return res.status(429).json({ ok: false, message: '上一輪同步尚未結束，請稍後再試' });
  }

  isRunning = true;
  try {
    const result = await syncAmazonInventoryToEcount();
    res.json({
      ok: true,
      message: `同步成功：${result?.successCount ?? 0} / ${result?.totalCount ?? 0}`,
      data: result?.syncedItems ?? [],
      amazonResult: result?.amazonResult,
      ecountResult: result?.ecountResult,
    });
  } catch (err) {
    res.status(500).json({ ok: false, message: `同步失敗：${err.message}` });
  } finally {
    isRunning = false;
  }
});

// 🕒 每小時第 30 分自動執行（台灣時間）
cron.schedule(
  '30 * * * *',
  async () => {
    if (isRunning) {
      console.warn('⏳ 上一輪同步尚未結束，略過本次排程。');
      return;
    }

    isRunning = true;
    const ts = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
    console.log(`🕒 ${ts} 自動同步 FBA → Ecount`);

    try {
      const result = await syncAmazonInventoryToEcount();
      console.log(`✅ 同步完成：${result?.successCount ?? 0} / ${result?.totalCount ?? 0}`);
    } catch (err) {
      console.error('❌ 自動同步失敗', err.message);
    } finally {
      isRunning = false;
    }
  },
  { timezone: 'Asia/Taipei' }
);

export default router;
