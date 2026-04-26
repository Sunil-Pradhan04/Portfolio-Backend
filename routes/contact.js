const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');

// Create transporter using Gmail SMTP + App Password
const createTransporter = () => {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });
};

// POST /api/contact
router.post('/', async (req, res) => {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    try {
        const transporter = createTransporter();

        // 1. Email to YOU (owner notification)
        const ownerMailOptions = {
            from: `"Portfolio Contact" <${process.env.EMAIL_USER}>`,
            to: process.env.EMAIL_USER,
            subject: `📩 New Portfolio Message from ${name}`,
            html: `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; border-radius: 16px; overflow: hidden;">
                    <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%); padding: 32px; text-align: center;">
                        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">📬 New Message Received!</h1>
                        <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0 0; font-size: 14px;">Someone reached out via your portfolio</p>
                    </div>
                    <div style="padding: 32px;">
                        <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                            <p style="margin: 0 0 12px 0; color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">From</p>
                            <p style="margin: 0; font-size: 18px; font-weight: 600; color: #e2e8f0;">👤 ${name}</p>
                        </div>
                        <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                            <p style="margin: 0 0 12px 0; color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Email</p>
                            <a href="mailto:${email}" style="color: #818cf8; text-decoration: none; font-size: 16px;">📧 ${email}</a>
                        </div>
                        <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 20px;">
                            <p style="margin: 0 0 12px 0; color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Message</p>
                            <p style="margin: 0; font-size: 15px; line-height: 1.7; color: #cbd5e1; white-space: pre-wrap;">${message}</p>
                        </div>
                        <div style="margin-top: 24px; text-align: center;">
                            <a href="mailto:${email}" style="display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">↩ Reply to ${name}</a>
                        </div>
                    </div>
                    <div style="padding: 16px 32px; text-align: center; border-top: 1px solid rgba(255,255,255,0.1);">
                        <p style="margin: 0; color: #475569; font-size: 12px;">Received at ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</p>
                    </div>
                </div>
            `
        };

        // 2. Auto-reply to sender (kind reply)
        const senderMailOptions = {
            from: `"Sunil Pradhan" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: `✨ Thank you for reaching out, ${name}!`,
            html: `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; border-radius: 16px; overflow: hidden;">
                    <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%); padding: 40px; text-align: center;">
                        <div style="width: 72px; height: 72px; background: rgba(255,255,255,0.2); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px; font-size: 32px;">🙏</div>
                        <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 700;">Thank You, ${name}!</h1>
                        <p style="color: rgba(255,255,255,0.85); margin: 10px 0 0 0; font-size: 15px;">Your message has been received</p>
                    </div>
                    <div style="padding: 36px;">
                        <p style="margin: 0 0 18px 0; font-size: 16px; line-height: 1.7; color: #cbd5e1;">
                            Hi <strong style="color: #818cf8;">${name}</strong>,
                        </p>
                        <p style="margin: 0 0 18px 0; font-size: 15px; line-height: 1.8; color: #94a3b8;">
                            Thank you so much for taking the time to reach out! It truly means a lot to me. I've received your message and I'm genuinely excited to connect with you. 🌟
                        </p>
                        <p style="margin: 0 0 18px 0; font-size: 15px; line-height: 1.8; color: #94a3b8;">
                            I'll review your message carefully and get back to you as soon as possible — typically within <strong style="color: #e2e8f0;">24–48 hours</strong>. Whether it's about a project, collaboration, or just a chat about tech, I'm all ears!
                        </p>
                        <div style="background: rgba(99, 102, 241, 0.1); border-left: 4px solid #6366f1; border-radius: 8px; padding: 18px 20px; margin: 24px 0;">
                            <p style="margin: 0; color: #94a3b8; font-size: 13px; font-style: italic; line-height: 1.6;">"Every great project starts with a single conversation. I'm glad you started this one."</p>
                        </div>
                        <p style="margin: 0 0 8px 0; font-size: 15px; color: #94a3b8; line-height: 1.8;">
                            In the meantime, feel free to explore my work and connect with me on social media:
                        </p>
                        <div style="display: flex; gap: 12px; margin: 20px 0; flex-wrap: wrap;">
                            <a href="https://github.com/Sunil-Pradhan04" style="display: inline-block; background: rgba(255,255,255,0.07); color: #e2e8f0; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 13px; font-weight: 600; border: 1px solid rgba(255,255,255,0.1);">🐙 GitHub</a>
                            <a href="https://www.linkedin.com/in/sunil-pradhan-174364338" style="display: inline-block; background: rgba(99,102,241,0.15); color: #818cf8; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 13px; font-weight: 600; border: 1px solid rgba(99,102,241,0.3);">💼 LinkedIn</a>
                        </div>
                        <p style="margin: 24px 0 0 0; font-size: 15px; color: #94a3b8; line-height: 1.8;">
                            Warm regards,<br/>
                            <strong style="color: #e2e8f0; font-size: 16px;">Sunil Pradhan</strong><br/>
                            <span style="color: #6366f1; font-size: 13px;">Full Stack Developer | React & Node.js Enthusiast</span>
                        </p>
                    </div>
                    <div style="padding: 20px 32px; text-align: center; border-top: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.02);">
                        <p style="margin: 0; color: #475569; font-size: 12px;">This is an automated reply from <a href="mailto:${process.env.EMAIL_USER}" style="color: #6366f1; text-decoration: none;">${process.env.EMAIL_USER}</a></p>
                        <p style="margin: 4px 0 0 0; color: #334155; font-size: 11px;">Please do not reply to this email address. I'll get back to you shortly. ❤️</p>
                    </div>
                </div>
            `
        };

        // Send both emails
        await transporter.sendMail(ownerMailOptions);
        await transporter.sendMail(senderMailOptions);

        res.status(200).json({ message: 'Message sent successfully! Check your email for confirmation.' });
    } catch (error) {
        console.error('Email error:', error);
        res.status(500).json({ message: 'Failed to send email. Please try again.', error: error.message });
    }
});

module.exports = router;
