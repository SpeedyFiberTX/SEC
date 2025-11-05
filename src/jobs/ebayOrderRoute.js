import dotenv from 'dotenv';
import cron from 'node-cron';
import handleEBayOrder from '../workflow/handleEBayOrder.js';
import pushMessageToDeveloper from '../services/line/pushMessageToDeveloper.js'

dotenv.config();

let isRunning = false; // 防止重疊執行

// 🕒 每小時 30 分自動執行（台灣時間）
cron.schedule(
  '30 * * * *',
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