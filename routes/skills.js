const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Skill = require('../models/Skill');

// JWT auth middleware
const requireAdmin = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Unauthorized: No admin token' });
    }
    try {
        req.user = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
        next();
    } catch {
        return res.status(401).json({ message: 'Unauthorized: Token expired or invalid' });
    }
};

// GET all skills (public)
router.get('/', async (req, res) => {
    try {
        const skills = await Skill.find().sort({ order: 1, createdAt: 1 });
        res.json(skills);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// POST create skill (admin only)
router.post('/', requireAdmin, async (req, res) => {
    try {
        const skill = new Skill(req.body);
        const saved = await skill.save();
        res.status(201).json(saved);
    } catch (err) {
        res.status(400).json({ message: 'Validation error', error: err.message });
    }
});

// PUT update skill (admin only)
router.put('/:id', requireAdmin, async (req, res) => {
    try {
        const updated = await Skill.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!updated) return res.status(404).json({ message: 'Skill not found' });
        res.json(updated);
    } catch (err) {
        res.status(400).json({ message: 'Validation error', error: err.message });
    }
});

// DELETE skill (admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
    try {
        const deleted = await Skill.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: 'Skill not found' });
        res.json({ message: 'Skill deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

module.exports = router;
