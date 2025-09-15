import express from 'express';

const router = express.Router();

// 確認 router 有載入
console.log('[Mount] eBayNotificationsRoute loaded');

// GET ping：用來確認 404 問題
router.get('/', (req, res) => {
  res.status(200).send('eBay notifications endpoint alive');
});

// XML webhook：用 express 內建的 text()，不要再用 body-parser
router.post('/',
  express.text({
    type: ['text/xml', 'application/xml', 'application/soap+xml'],
    limit: '1mb',
  }),
  (req, res) => {
    console.log('[eBay XML Raw]', req.headers['content-type'], req.body);
    // 不做驗簽，先回 OK
    res.status(200).send('OK');
  }
);

export default router;