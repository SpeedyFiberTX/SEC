import { lineClient } from '../../line-config.js';

const groupId = process.env.LINE_GROUP_ID; // 事先存好的 ID

export default async function pushMessageToMe(message) {
  try {
    await lineClient.pushMessage({
      to: groupId,
      messages: [
        { type: 'text', text: message }
      ]
    });
    console.log('訊息已送出 ✅');
  } catch (err) {
    console.error('發送失敗：', err?.response?.data ?? err);
  }
}