/**
 * routes/chatbot.js — Portfolio RAG Chatbot Routes
 *
 * PUBLIC:
 *   POST /api/chatbot/chat       — send a message, get AI reply
 *
 * ADMIN ONLY (JWT required):
 *   POST /api/chatbot/knowledge  — add/update text in Pinecone (chunked)
 *   DELETE /api/chatbot/knowledge/:section — delete a section
 *   DELETE /api/chatbot/knowledge — wipe entire index
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { openai } = require('../db/openai');
const ChatVisitor = require('../models/ChatVisitor');
const { portfolioChat } = require('../services/ai.service');
const { storeTextInVectorDB, deleteSection, deleteAllVectors } = require('../services/storage.service');

// Nodemailer setup
const createTransporter = () => {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });
};

/* ──────────────────────────────────────────────
   JWT auth middleware (admin only)
────────────────────────────────────────────── */
const requireAdmin = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Unauthorized: No admin token' });
    }
    try {
        const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
        // Optional: you can add a check here if (decoded.role !== 'admin') depending on your structure
        req.user = decoded;
        next();
    } catch {
        return res.status(401).json({ message: 'Unauthorized: Token expired or invalid' });
    }
};

/* ──────────────────────────────────────────────
   JWT auth middleware (Visitor)
────────────────────────────────────────────── */
const requireVisitor = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Unauthorized: Please login to chat' });
    }
    try {
        req.user = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
        next();
    } catch {
        return res.status(401).json({ message: 'Unauthorized: Token expired or invalid' });
    }
};

router.post('/login', async (req, res) => {
    const { name, email } = req.body;

    // 1. Basic validation
    if (!name || !email) return res.status(400).json({ message: 'Name and email are required.' });
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return res.status(400).json({ message: 'Invalid email format.' });

    try {
        const aiCheck = await openai.chat.completions.create({
            model: 'gpt-4.1-nano',
            messages: [{
                role: 'system',
                content: 'Evaluate if the following Name and Email appear to belong to a real person. If it is obvious keyboard mashing, fake (like "asdf" or "test@test.com"), or a bot, reply exactly with "INVALID". Otherwise, reply exactly with "VALID".'
            }, {
                role: 'user',
                content: `Name: ${name}\nEmail: ${email}`
            }],
            max_tokens: 10,
            temperature: 0.1
        });

        const aiResponse = aiCheck.choices?.[0]?.message?.content?.trim().toUpperCase() || '';
        if (aiResponse.includes('INVALID')) {
            return res.status(400).json({ message: 'Please enter a realistic name and email.' });
        }
    } catch (err) {
        console.error('AI validation error (continuing anyway):', err.message);
    }

    // 3. Database Check & Save
    try {
        let visitor = await ChatVisitor.findOne({ email: email.toLowerCase() });
        let isNew = false;

        if (!visitor) {
            isNew = true;
            visitor = new ChatVisitor({ name, email: email.toLowerCase() });
            await visitor.save();

            // 4. Send Welcome Email via Nodemailer
            try {
                const transporter = createTransporter();
                const mailOptions = {
                    from: `"Sunil Pradhan" <${process.env.EMAIL_USER}>`,
                    to: visitor.email,
                    subject: 'Welcome to my Portfolio Chat! 👋',
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                            <h2>Hi ${visitor.name}!</h2>
                            <p>Thank you for visiting my portfolio and trying out my AI assistant.</p>
                            <p>Feel free to ask the bot anything about my skills, projects, and background. It's trained directly on my personal knowledge base.</p>
                            <br>
                            <p>Best regards,<br><strong>Sunil Pradhan</strong></p>
                        </div>
                    `
                };
                await transporter.sendMail(mailOptions);
            } catch (err) {
                console.error('Failed to send welcome email:', err.message);
            }
        } else {
            // Update last visit
            visitor.lastVisit = new Date();
            await visitor.save();
        }

        // 5. Generate JWT (30 days)
        const token = jwt.sign(
            { id: visitor._id, name: visitor.name, email: visitor.email, role: 'visitor' },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.json({ token, visitor: { name: visitor.name, email: visitor.email }, isNew });
    } catch (err) {
        console.error('Visitor login error:', err.message);
        res.status(500).json({ message: 'Server error during login.' });
    }
});

/* ──────────────────────────────────────────────
   POST /api/chatbot/chat  (Requires Visitor JWT)
   Body: { message: string, history?: [{role, content}] }
────────────────────────────────────────────── */
router.post('/chat', requireVisitor, async (req, res) => {
    const { message, history } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
        return res.status(400).json({ message: 'Message is required.' });
    }

    if (message.trim().length > 500) {
        return res.status(400).json({ message: 'Message too long (max 500 chars).' });
    }

    try {
        const reply = await portfolioChat(message.trim(), history || []);
        res.json({ reply });
    } catch (err) {
        console.error('Chat route error:', err.message);
        res.status(500).json({ message: 'AI service unavailable. Please try again.' });
    }
});

/* ──────────────────────────────────────────────
   POST /api/chatbot/knowledge  (ADMIN)
   Body: { text: string, section: string }
   section examples: "about", "skills", "projects", "experience", "general"
   This chunks the text and stores it in Pinecone.
────────────────────────────────────────────── */
router.post('/knowledge', requireAdmin, async (req, res) => {
    const { text, section = 'general' } = req.body;

    if (!text || typeof text !== 'string' || !text.trim()) {
        return res.status(400).json({ message: 'text is required.' });
    }
    if (text.trim().length < 10) {
        return res.status(400).json({ message: 'text is too short (min 10 chars).' });
    }

    try {
        const result = await storeTextInVectorDB(text.trim(), section.trim());
        if (result.success) {
            res.json({
                message: `✅ Knowledge stored successfully for section "${section}".`,
                chunks: result.chunks,
                section,
            });
        } else {
            res.status(500).json({ message: result.message || 'Failed to store knowledge.' });
        }
    } catch (err) {
        console.error('Knowledge store error:', err.message);
        res.status(500).json({ message: 'Failed to store knowledge.', error: err.message });
    }
});

/* ──────────────────────────────────────────────
   DELETE /api/chatbot/knowledge/:section  (ADMIN)
   Remove all vectors for a specific section
────────────────────────────────────────────── */
router.delete('/knowledge/:section', requireAdmin, async (req, res) => {
    const { section } = req.params;
    try {
        const result = await deleteSection(section);
        if (result.success) {
            res.json({ message: `✅ Deleted all knowledge for section "${section}".` });
        } else {
            res.status(500).json({ message: result.message });
        }
    } catch (err) {
        res.status(500).json({ message: 'Failed to delete section.', error: err.message });
    }
});

/* ──────────────────────────────────────────────
   DELETE /api/chatbot/knowledge  (ADMIN)
   Wipe entire Pinecone index (full refresh)
────────────────────────────────────────────── */
router.delete('/knowledge', requireAdmin, async (req, res) => {
    try {
        const result = await deleteAllVectors();
        if (result.success) {
            res.json({ message: '✅ All portfolio knowledge wiped successfully.' });
        } else {
            res.status(500).json({ message: result.message });
        }
    } catch (err) {
        res.status(500).json({ message: 'Failed to delete knowledge.', error: err.message });
    }
});

module.exports = router;
