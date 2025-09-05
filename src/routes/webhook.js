import express from 'express';
import { lineClient, lineMiddleware } from '../line-config.js';

const router = express.Router();
// const userId = process.env.LINE_USER_ID;

router.post('/', lineMiddleware, async (req, res) => {

    try {

        console.log('[LINE Webhook] events:', req.body?.events?.length ?? 0);
        return res.sendStatus(200); // 必須快速回 200

    } catch (error) {
        console.error("發送失敗：", error);
    }


});

export default router;