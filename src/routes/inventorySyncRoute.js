import express from 'express';
import syncInventoryByEcount from '../usecases/syncInventoryByEcount.js';

const router = express.Router();
// 手動觸發路由（GET /sync）
router.get('/sync', async (_, res) => {
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