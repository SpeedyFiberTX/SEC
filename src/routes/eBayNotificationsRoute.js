import express from 'express';
import crypto from "crypto";

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
  console.log("challengeCode:", challengeCode);

  const hash = crypto.createHash('sha256');
  hash.update(challengeCode);
  hash.update(VERIFICATION_TOKEN);
  hash.update(ENDPOINT);
  const responseHash = hash.digest('hex');
  console.log(new Buffer.from(responseHash).toString());

  // 不做驗簽，先回 OK
  res.status(200).json({ challengeResponse: responseHash });
}
);

export default router;