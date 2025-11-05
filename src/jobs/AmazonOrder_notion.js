import dotenv from 'dotenv';
import cron from 'node-cron';
import handleAmazonOrder from '../workflow/handleAmazonOrder.js';

dotenv.config();

let isRunning = false; // 防止重疊執行

// 🕒 每天早上 8 點 15 分自動執行（台灣時間）
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