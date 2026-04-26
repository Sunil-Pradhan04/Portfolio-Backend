// Pinecone client singleton — CommonJS version (matches portfolio backend)
const { Pinecone } = require('@pinecone-database/pinecone');
require('dotenv').config();

let _pinecone = null;
let _index = null;

const getPineconeIndex = () => {
    if (_index) return _index;

    if (!process.env.PINECONE_API_KEY) {
        throw new Error('PINECONE_API_KEY is missing in .env');
    }
    if (!process.env.PINECONE_INDEX) {
        throw new Error('PINECONE_INDEX is missing in .env');
    }

    _pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    _index = _pinecone.index(process.env.PINECONE_INDEX);

    console.log(`✅ Pinecone connected → index: "${process.env.PINECONE_INDEX}"`);
    return _index;
};

module.exports = { getPineconeIndex };
