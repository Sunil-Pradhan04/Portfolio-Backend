const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
    name: { type: String, required: true },
    tagline: { type: String, required: true },
    shortDescription: { type: String, required: true },
    fullDescription: { type: String, required: true },
    techStack: { type: mongoose.Schema.Types.Mixed, required: true },
    features: [{ type: String }],
    challenges: [{ type: String }],
    liveUrl: { type: String, default: '' },
    githubUrl: { type: String, default: '' },
    category: { type: String, default: 'Full Stack' },
    icon: { type: String, default: '🚀' },
    order: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Project', projectSchema);
