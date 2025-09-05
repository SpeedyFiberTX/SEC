// routes/webhook.js
import express from 'express';
import crypto from 'crypto';
import { lineClient, lineMiddleware } from '../line-config.js';

const router = express.Router();
// const userId = process.env.LINE_USER_ID;

router.post('/', lineMiddleware, async (req, res) => {
  // 1) 先回 200，避免 LINE 判你逾時
  res.status(200).json({ status: 'ok' });

  const events = req.body.events;
  for (const event of events) {
    if (event.source.type === 'group') {
      console.log('📢 群組 ID:', event.source.groupId);
    }
  }
});

export default router;