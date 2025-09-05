import express from 'express';
import { lineClient, lineMiddleware } from '../line-config.js';

const router = express.Router();

// 可二選一：固定推給某人（用環境變數），或推給這次發話的 user
// const FIXED_USER_ID = process.env.LINE_USER_ID; // 若要固定對象就留著

router.post('/', lineMiddleware, async (req, res) => {
  const events = req.body?.events ?? [];

  // 1) 先快速回 200，避免 LINE 判定逾時
  res.status(200).json({ status: 'ok' });

  // 2) 再「非阻塞」地做 push（不要影響回應）
  //    用 setImmediate / setTimeout 0 都可以
  setImmediate(async () => {
    try {
      // 只推一次就好（這裡拿第一個含 userId 的 event）
      const evt = events.find(e => e?.source?.userId);
      if (!evt) return; // 沒對象就退出

      // 目標：優先用這次發話者；若沒有，就用固定 ID
      const targetId = evt?.source?.userId || null;
      if(!targetId) return;

      console.log('推送目標 ID:', targetId);

      await lineClient.pushMessage(targetId, {
        type: 'text',
        text: '哈囉 👋 這是直接傳給你的訊息！'
      });

      console.log('訊息已發送！');
    } catch (err) {
      console.error('發送失敗：', err?.response?.data ?? err);
    }
  });
});

export default router;