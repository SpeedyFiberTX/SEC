// services/callGPT.js
import dotenv from 'dotenv';
// import pushMessageToDeveloper from '../services/line/pushMessageToDeveloper.js';
import pushMessageToMe from '../services/line/pushMessage.js';
import { askChatGPT } from "../services/GPT/openai.js";

dotenv.config();

const groupId = process.env.LINE_USER_ID; // 事先存好的 ID

export default async function callGPT(prompt) {
    if (!groupId) {
        console.error("[callGPT] Missing LINE group ID. Provide opts.groupId or set LINE_GROUP_ID.");
        return { ok: false };
    }
    if (!prompt || typeof prompt !== "string") {
        console.error("[callGPT] Invalid prompt.");
        return { ok: false };
    }

    try {

        // Ask GPT with context
        const reply = await askChatGPT(prompt);
        // push Line
        const text = (reply ?? "").slice(0, 1000);
        // await pushMessageToDeveloper(text);
        await pushMessageToMe(text);

        console.log("[callGPT] ✅ Reply pushed to group");
        return { ok: true, reply: text };
    } catch (err) {
        console.error("[callGPT] ❌ Failed:", err?.response?.data ?? err);
        return { ok: false };
    }
}



// (async () => {
//   const reply = await callGPT("今天要請大家登記考勤表");;
//   console.log(reply);
// })();