const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const PortfolioInfo = require('../models/PortfolioInfo');

// Middleware: verify JWT from Authorization header
const requireAdmin = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch {
        return res.status(401).json({ message: 'Token expired or invalid' });
    }
};

// GET /api/info — public, returns the single portfolio info doc
router.get('/', async (req, res) => {
    try {
        let info = await PortfolioInfo.findOne();
        if (!info) {
            info = await PortfolioInfo.create({});
        }
        res.json(info);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// PUT /api/info — protected, update portfolio info
router.put('/', requireAdmin, async (req, res) => {
    try {
        let info = await PortfolioInfo.findOne();
        if (!info) {
            info = await PortfolioInfo.create(req.body);
        } else {
            Object.assign(info, req.body);
            await info.save();
        }
        res.json(info);
    } catch (err) {
        res.status(400).json({ message: 'Validation error', error: err.message });
    }
});

module.exports = router;
