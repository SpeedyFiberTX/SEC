import { lineClient } from '../../line-config.js';

const userId = process.env.LINE_USER_ID; // 事先存好的 ID

export default async function pushMessageToDeveloper(message) {
  try {
    await lineClient.pushMessage({
      to: userId,
      messages: [
        { type: 'text', text: message }
      ]
    });
    console.log('訊息已送出 ✅');
  } catch (err) {
    console.error('發送失敗：', err?.response?.data ?? err);
  }
}