import dotenv from 'dotenv'; //處理.env 環境變數

import express from 'express';
import syncInventoryByEcount from '../workflow/syncInventoryByEcount.js';

dotenv.config();

const router = express.Router();
// 手動觸發路由（GET /sync）
router.post('/sync', async (req, res) => {
  const secret = req.headers['x-api-key'];
  if (secret !== process.env.RUN_INVENTORY_SYNC_SECRET) {
    return res.status(403).json({ ok: false, message: 'Forbidden' });
  }

  try {
    const result = await syncInventoryByEcount();
    res.json({
      ok: true,
      message: `同步成功：${result.successCount} / ${result.totalCount}`,
      data: result.syncedItems,
      shopifyResult: result.shopifyResult,
    });
  } catch (err) {
    res.status(500).json({ ok: false, message: `同步失敗：${err.message}` });
  }
});


export default router;