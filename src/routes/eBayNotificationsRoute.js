import express from 'express';
import crypto from "crypto";

import pushMessageToDeveloper from '../services/line/pushMessageToDeveloper.js';

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

router.post('/deletion-notify',express.json({ limit: '1mb' }), (req, res) => {
  res.status(200).send('OK');
  // setImmediate(() => {
  //   try {
      // console.log("[Notification] headers:", req.headers); // 之後要補驗籤
      // console.log("[Notification] body:", req.body);

      // 安全取值（避免 body 為 undefined 時爆炸）
      // const topic   = req.body?.metadata?.topic;
      // const data    = req.body?.notification?.data;
      // const userId  = data?.userId ?? data?.userID ?? data?.userid;
      // const userName= data?.username ?? data?.userName;

      // if (userName && userId) {
      //   console.log(
      //     `eBay 收到一筆 ${topic ?? "account event"}：\n` +
      //     `User Name: ${userName}\n` +
      //     `User ID: ${userId}`
      //   );
      // } else {
      //   console.warn("[Notification] 缺少 userName/userId。原始 data =", data);
      // }

      // TODO：驗簽（x-ebay-signature）— 建議之後補
    // } catch (err) {
    //   // 這裡只 log，不要回傳（因為前面已經 send 200）
    //   console.error("POST /ebay/deletion-notify error:", err);
    // }
  // });
})

export default router;