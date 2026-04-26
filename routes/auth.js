const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

// POST /api/auth/login — verify password, issue 15-day JWT
router.post('/login', (req, res) => {
    const { password } = req.body;

    if (!password) {
        return res.status(400).json({ success: false, message: 'Password is required' });
    }

    if (password !== process.env.EDIT_PASSWORD) {
        return res.status(401).json({ success: false, message: 'Incorrect password' });
    }

    const token = jwt.sign(
        { role: 'admin', name: 'Sunil' },
        process.env.JWT_SECRET,
        { expiresIn: '15d' }
    );

    res.json({ success: true, token, message: 'Welcome, Sunil! Admin access granted.' });
});

// POST /api/auth/verify — check if a JWT is still valid
router.post('/verify', (req, res) => {
    const { token } = req.body;

    if (!token) {
        return res.status(400).json({ valid: false, message: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        res.json({ valid: true, user: decoded });
    } catch (err) {
        res.status(401).json({ valid: false, message: 'Token expired or invalid' });
    }
});

module.exports = router;
