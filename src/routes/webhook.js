import express from 'express';
import { lineClient, lineMiddleware } from '../line-config.js';

const router = express.Router();
// const userId = process.env.LINE_USER_ID;

router.post('/', lineMiddleware, async (req, res) => {
    const events = req.body.events;

    for (const event of events) {
        if (event.source.userId) {
            console.log("使用者 ID:", event.source.userId);
        }
    }

    try {
        // 主動推送訊息
        await lineClient.pushMessage(userId, {
            type: 'text',
            text: '哈囉 👋 這是直接傳給你的訊息！'
        });
        console.log("訊息已發送！");
    } catch (error) {
        console.error("發送失敗：", error);
    }

    // 一定要最後回覆 LINE，避免 webhook 超時
    res.status(200).json({ status: 'ok' });
});

export default router;