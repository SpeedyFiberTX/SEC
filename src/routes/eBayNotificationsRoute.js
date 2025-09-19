import express from 'express';
import crypto from "crypto";

import pushMessageToDeveloper from '../services/line/pushMessageToDeveloper';

const router = express.Router();

const VERIFICATION_TOKEN = process.env.EBAY_VERIFICATION_TOKEN;
const ENDPOINT = "https://sec-6pep.onrender.com/ebay/notifications/deletion-notify";

// GET ping：用來確認 404 問題
// router.get('/', (req, res) => {
//   res.status(200).send('eBay sell notifications endpoint alive');
// });

// JSON webhook：新版 Sell Notification API
router.post('/',
  express.json({ limit: '1mb' }),
  (req, res) => {
    console.log('[eBay Sell Notification]', req.headers['content-type'], req.body);
    // 不做驗簽，先回 OK
    res.status(200).send('OK');
  }
);

router.get('/deletion-notify', express.json({ limit: '1mb' }), (req, res) => {
  const challengeCode = req.query.challenge_code;

  const hash = crypto.createHash('sha256');
  hash.update(challengeCode);
  hash.update(VERIFICATION_TOKEN);
  hash.update(ENDPOINT);
  const responseHash = hash.digest('hex');

  // 不做驗簽，先回 OK
  res.status(200).json({ challengeResponse: responseHash });
}
);

router.post('/deletion-notify', (req, res) => {
  res.status(200).send('OK');
  try {
    console.log("[Notification] headers:", req.headers);
    console.log("[Notification] body:", req.body);
    const userName = req.body.notification.data.username;
    const userId = req.body.notification.data.userId;
    const topic = req.body.metadata.topic;
    if (userName && userId) {
      pushMessageToDeveloper(`eBay 收到一筆 ${topic}：
        User Name: ${userName}
        User ID: ${userId}`)
    }
  } catch (err) {
    console.error("POST /ebay/deletion-notify error:", err);
    return res.status(500).json({ error: String(err?.message || err) });
  }
})

export default router;