import OpenAI from 'openai';
import dotenv from 'dotenv';
dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
})

export async function askChatGPT(userText) {
    const userContent = String(userText ?? '');

    const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
            { role: 'system', content: "你是我們辦公室的AI小助手，指令會告訴你要提醒什麼內容，請簡單一句話提醒大家，語氣可以溫和或活潑一點" },
            { role: 'user', content: userContent }
        ]
    })

    return completion.choices[0].message.content ?? '';
}