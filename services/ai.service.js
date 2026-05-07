require('dotenv').config();
const { openai } = require('../db/openai');
const { getTopChunks } = require('./storage.service');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

let geminiRateLimited = false;

function extractFinalMessage(content) {
    return content
        .replace(/<think>[\s\S]*?<\/think>/gi, '')
        .replace(/<think>[\s\S]*/gi, '')
        .trim();
}

const callGPT = async (messages) => {
    try {
        const resp = await openai.chat.completions.create({
            model: 'gpt-4.1-nano',
            messages,
        });
        const raw = resp.choices?.[0]?.message?.content || 'No response.';
        console.log('📊 [GPT] Tokens used:', resp.usage);
        return extractFinalMessage(raw);
    } catch (err) {
        console.error('❌ GPT Error:', err.response?.data || err.message);
        return 'AI assistant (ChatGPT) is temporarily unavailable. Please try again later.';
    }
};

const callGEMINI = async (messages) => {
    try {
        const systemMsg = messages.find((m) => m.role === 'system');
        const systemInstruction = systemMsg ? systemMsg.content : '';

        const chatMessages = messages.filter((m) => m.role !== 'system');
        const lastUserMsg = chatMessages.pop();

        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            systemInstruction,
        });

        const geminiHistory = chatMessages.map((h) => ({
            role: h.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: h.content }],
        }));

        const chat = model.startChat({
            history: geminiHistory,
            generationConfig: { temperature: 0.5, maxOutputTokens: 500 },
        });

        const result = await chat.sendMessage(lastUserMsg.content);
        const raw = result.response.text();
        return extractFinalMessage(raw);
    } catch (err) {
        const status = err?.status || err?.response?.status;
        if (status === 429) {
            const rateLimitErr = new Error('Gemini rate limit hit (429)');
            rateLimitErr.isRateLimit = true;
            throw rateLimitErr;
        }
        console.error('❌ Gemini Error:', err.message);
        return 'AI assistant (Gemini) is temporarily unavailable. Please try again later.';
    }
};

const portfolioChat = async (message, clientHistory = []) => {
    try {
        const chunks = await getTopChunks(message, 2);
        const context = chunks && chunks.length > 0
            ? chunks.map((c) => c.metadata.text).join('\n\n')
            : 'No portfolio information available yet.';

        let history = (Array.isArray(clientHistory) ? clientHistory : [])
            .map((h) => ({
                role: h.role === 'assistant' ? 'assistant' : 'user',
                content: typeof h.content === 'string' ? h.content.slice(0, 300) : '',
            }));

        while (history.length && history[0].role === 'assistant') {
            history.shift();
        }

        const cleaned = [];
        for (const msg of history) {
            const prev = cleaned[cleaned.length - 1];
            if (!prev || prev.role !== msg.role) cleaned.push(msg);
        }
        history = cleaned;

        const messages = [
            {
                role: 'system',
                content: `You are PortfolioBot, an AI assistant for Sunil Pradhan's portfolio. Answer using only the provided context, keeping responses helpful, concise, and professional. Do not guess or use outside information. If the answer is not in context, say: "I don't have that information yet. Feel free to contact Sunil directly!" For greetings, reply briefly and politely. If asked about your identity or creator, say: "I'm PortfolioBot, built by Sunil Pradhan to answer questions about him."`,
            },
            ...history,
            {
                role: 'user',
                content: `CONTEXT (retrieved from Sunil's knowledge base):
---
${context}
---

Question: ${message}`,
            },
        ];

        let reply;

        if (geminiRateLimited) {
            console.warn('⚠️  Gemini rate-limited (flag active) → using GPT fallback');
            reply = await callGPT(messages);
        } else {
            try {
                reply = await callGEMINI(messages);
                console.log('✅ [Gemini] answered');
            } catch (err) {
                if (err.isRateLimit) {
                    geminiRateLimited = true;
                    console.warn('⚠️  Gemini 429 → switching to GPT. Flag resets in 20s.');
                    setTimeout(() => {
                        geminiRateLimited = false;
                        console.log('🔄 Gemini rate-limit flag reset — will try Gemini again.');
                    }, 20000);
                    reply = await callGPT(messages);
                } else {
                    throw err;
                }
            }
        }

        console.log(`💬 PortfolioBot → "${reply.slice(0, 80)}..."`);
        return reply;
    } catch (err) {
        console.error('❌ Portfolio AI Chat Error:', err.response?.data || err.message);
        return 'AI assistant is temporarily unavailable. Please try again later.';
    }
};

module.exports = { callGPT, callGEMINI, portfolioChat };
