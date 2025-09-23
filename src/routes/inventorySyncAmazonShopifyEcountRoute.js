import dotenv from 'dotenv';
import cron from 'node-cron';
import express from 'express';
import syncAmazonShopifyEcountInventory from '../workflow/syncAmazonShopifyEcountInventory';

dotenv.config();

const router = express.Router();
let isRunning = false; // 🔒 防止重疊執行（手動與排程都會檢查）

// 🕒 每小時第 03 分自動執行（台灣時間）
cron.schedule(
  '3 * * * *',
  async () => {
    if (isRunning) {
      console.warn('⏳ 上一輪同步尚未結束，略過本次排程。');
      return;
    }

    isRunning = true;
    const ts = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
    console.log(`🕒 ${ts} 自動同步 Ecount → Shopify`);

    try {
      const result = await syncAmazonShopifyEcountInventory();
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
