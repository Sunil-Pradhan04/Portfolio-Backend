// OpenAI client singleton — CommonJS version (matches portfolio backend)
const { OpenAI } = require('openai');
require('dotenv').config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

module.exports = { openai };
