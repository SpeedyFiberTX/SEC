import express from 'express';

const router = express.Router();

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

export default router;