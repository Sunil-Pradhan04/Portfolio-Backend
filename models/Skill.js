const mongoose = require('mongoose');

const skillSchema = new mongoose.Schema({
    name: { type: String, required: true },
    percentage: { type: Number, required: true, min: 0, max: 100 },
    color: { type: String, default: 'blue' },
    details: { type: String, required: true },
    badge: { type: String, default: '' },
    iconKey: { type: String, default: '' }, // key for icon mapping in frontend
    order: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Skill', skillSchema);
