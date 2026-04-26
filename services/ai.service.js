

require('dotenv').config();
const { openai } = require('../db/openai');
const { getTopChunks } = require('./storage.service');

function extractFinalMessage(content) {
    return content
        .replace(/<think>[\s\S]*?<\/think>/gi, '')
        .replace(/<think>[\s\S]*/gi, '')
        .trim();
}


const portfolioChat = async (message, clientHistory = []) => {
    try {
        const chunks = await getTopChunks(message, 2); // fetch top 2 chunks
        const context =
            chunks && chunks.length > 0
                ? chunks.map((c) => c.metadata.text).join('\n\n')
                : 'No portfolio information available yet.';

        /* ---------- 2. Sanitize conversation history ---------- */
        let history = (Array.isArray(clientHistory) ? clientHistory : [])
            .map((h) => ({
                role: h.role === 'assistant' ? 'assistant' : 'user',
                content: typeof h.content === 'string' ? h.content.slice(0, 300) : '',
            }));

        // Must start with user message (not assistant)
        while (history.length && history[0].role === 'assistant') {
            history.shift();
        }

        // Enforce strict alternation (no two same roles in a row)
        const cleaned = [];
        for (const msg of history) {
            const prev = cleaned[cleaned.length - 1];
            if (!prev || prev.role !== msg.role) cleaned.push(msg);
        }
        history = cleaned;

        /* ---------- 3. Build messages array ---------- */
        const messages = [
            {
                role: 'system',
                content: `You are PortfolioBot, an AI assistant for Sunil Pradhan’s portfolio. Answer using only the provided context, keeping responses helpful, concise, and professional. Do not guess or use outside information. If the answer is not in context, say: "I don't have that information yet. Feel free to contact Sunil directly!" For greetings, reply briefly and politely. If asked about your identity or creator, say: "I'm PortfolioBot, built by Sunil Pradhan to answer questions about him.""`,
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

        /* ---------- 4. Call OpenAI GPT-4.1-mini ---------- */
        const resp = await openai.chat.completions.create({
            model: 'gpt-4.1-nano',
            messages,
            temperature: 0.5,
            max_tokens: 500,
        });

        const raw = resp.choices?.[0]?.message?.content || 'No response.';
        const reply = extractFinalMessage(raw);

        console.log(`💬 PortfolioBot → "${reply.slice(0, 80)}..."`);
        console.log('📊 Tokens used:', resp.usage);

        return reply;
    } catch (err) {
        console.error('❌ Portfolio AI Chat Error:', err.response?.data || err.message);
        return 'AI assistant is temporarily unavailable. Please try again later.';
    }
};

module.exports = { portfolioChat };
