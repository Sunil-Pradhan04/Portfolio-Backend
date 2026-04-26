const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Project = require('../models/Project');

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

// GET all projects (public)
router.get('/', async (req, res) => {
    try {
        const projects = await Project.find().sort({ order: 1, createdAt: 1 });
        res.json(projects);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// GET single project (public)
router.get('/:id', async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ message: 'Project not found' });
        res.json(project);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// POST create project (admin only)
router.post('/', requireAdmin, async (req, res) => {
    try {
        const project = new Project(req.body);
        const saved = await project.save();
        res.status(201).json(saved);
    } catch (err) {
        res.status(400).json({ message: 'Validation error', error: err.message });
    }
});

// PUT update project (admin only)
router.put('/:id', requireAdmin, async (req, res) => {
    try {
        const updated = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!updated) return res.status(404).json({ message: 'Project not found' });
        res.json(updated);
    } catch (err) {
        res.status(400).json({ message: 'Validation error', error: err.message });
    }
});

// DELETE project (admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
    try {
        const deleted = await Project.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: 'Project not found' });
        res.json({ message: 'Project deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

module.exports = router;
